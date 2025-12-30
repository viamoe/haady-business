-- ====================================================================
-- Migration: Add Compare at Price & Discount System
-- Description: Adds compare at price for showing original prices
--              and discount type (percentage or fixed amount)
-- Date: 2025-01-31
-- ====================================================================

-- Create discount type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type_enum') THEN
    CREATE TYPE discount_type_enum AS ENUM ('none', 'percentage', 'fixed_amount');
  END IF;
END $$;

-- Add columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_type discount_type_enum DEFAULT 'none',
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_start_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_end_date TIMESTAMPTZ DEFAULT NULL;

-- ====================================================================
-- Comments for Documentation
-- ====================================================================
COMMENT ON COLUMN public.products.compare_at_price IS 'Original price before discount (the "was" price). Should be higher than current price to show savings.';
COMMENT ON COLUMN public.products.discount_type IS 'Type of discount: none (no discount), percentage (% off), fixed_amount (flat $ off)';
COMMENT ON COLUMN public.products.discount_value IS 'Discount amount - percentage (e.g., 25 for 25%) or fixed amount (e.g., 10 for $10 off)';
COMMENT ON COLUMN public.products.discount_start_date IS 'When the discount becomes active (null = immediately)';
COMMENT ON COLUMN public.products.discount_end_date IS 'When the discount expires (null = no expiry)';

-- ====================================================================
-- Function: Calculate discounted price
-- Returns the effective sale price based on discount settings
-- ====================================================================
CREATE OR REPLACE FUNCTION public.calculate_discounted_price(
  p_compare_at_price DECIMAL,
  p_discount_type discount_type_enum,
  p_discount_value DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_compare_at_price IS NULL OR p_discount_type = 'none' OR p_discount_value IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_discount_type = 'percentage' THEN
    -- Calculate price after percentage discount
    RETURN ROUND(p_compare_at_price * (1 - p_discount_value / 100), 2);
  ELSIF p_discount_type = 'fixed_amount' THEN
    -- Calculate price after fixed amount discount
    RETURN GREATEST(0, p_compare_at_price - p_discount_value);
  END IF;

  RETURN NULL;
END;
$$;

-- ====================================================================
-- Function: Calculate discount percentage
-- Returns the discount percentage regardless of discount type
-- ====================================================================
CREATE OR REPLACE FUNCTION public.calculate_discount_percentage(
  p_compare_at_price DECIMAL,
  p_current_price DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_compare_at_price IS NULL OR p_compare_at_price <= 0 OR p_current_price IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_compare_at_price <= p_current_price THEN
    RETURN 0;
  END IF;

  RETURN ROUND(((p_compare_at_price - p_current_price) / p_compare_at_price) * 100, 0);
END;
$$;

-- ====================================================================
-- Function: Check if discount is currently active
-- Returns true if discount is within its valid date range
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_discount_active(
  p_discount_type discount_type_enum,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_discount_type = 'none' THEN
    RETURN FALSE;
  END IF;

  -- Check start date
  IF p_start_date IS NOT NULL AND v_now < p_start_date THEN
    RETURN FALSE;
  END IF;

  -- Check end date
  IF p_end_date IS NOT NULL AND v_now > p_end_date THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- ====================================================================
-- Index for finding active discounts
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_discount_dates 
ON public.products(discount_start_date, discount_end_date) 
WHERE discount_type != 'none';

-- ====================================================================
-- View: Products with calculated discount info
-- ====================================================================
CREATE OR REPLACE VIEW public.products_with_discounts AS
SELECT 
  p.*,
  public.calculate_discount_percentage(p.compare_at_price, p.price) as discount_percentage,
  public.is_discount_active(p.discount_type, p.discount_start_date, p.discount_end_date) as is_discount_active,
  CASE 
    WHEN p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price THEN
      p.compare_at_price - p.price
    ELSE NULL
  END as savings_amount
FROM public.products p;

COMMENT ON VIEW public.products_with_discounts IS 'Products with calculated discount percentage, active status, and savings amount';

