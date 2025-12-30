-- ====================================================================
-- Migration: Add Sales Channels to Products
-- Description: Adds sales channels field to determine where products are sold
-- Date: 2025-01-31
-- ====================================================================

-- Create ENUM type for sales channels
DO $$ BEGIN
  CREATE TYPE sales_channel_enum AS ENUM ('online', 'in_store');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add sales_channels column to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sales_channels sales_channel_enum[] DEFAULT ARRAY['online', 'in_store']::sales_channel_enum[] NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.sales_channels IS 'Array of sales channels where product is available: online, in_store';

-- Create index for faster filtering by sales channel
CREATE INDEX IF NOT EXISTS idx_products_sales_channels ON public.products USING GIN (sales_channels);

-- Update existing products to have both channels by default
UPDATE public.products 
SET sales_channels = ARRAY['online', 'in_store']::sales_channel_enum[]
WHERE sales_channels IS NULL OR array_length(sales_channels, 1) IS NULL;

