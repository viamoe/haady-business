-- ====================================================================
-- Migration: Add Product Status System
-- Description: Adds product status enum for draft, active, archived, scheduled
-- Date: 2025-01-30
-- ====================================================================

-- Create ENUM type for product status
DO $$ BEGIN
    CREATE TYPE product_status_enum AS ENUM ('draft', 'active', 'archived', 'scheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status product_status_enum DEFAULT 'active' NOT NULL,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.status IS 'Product status: draft (work in progress), active (published), archived (hidden), scheduled (auto-publish)';
COMMENT ON COLUMN public.products.scheduled_publish_at IS 'When to auto-publish a scheduled product';

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- Update existing products: set status based on is_published
UPDATE public.products
SET status = CASE 
  WHEN is_published = true THEN 'active'::product_status_enum
  ELSE 'draft'::product_status_enum
END
WHERE status IS NULL;

-- Create function to auto-publish scheduled products (can be called by cron)
CREATE OR REPLACE FUNCTION publish_scheduled_products()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.products
  SET 
    status = 'active',
    is_published = true,
    scheduled_publish_at = NULL
  WHERE 
    status = 'scheduled' 
    AND scheduled_publish_at IS NOT NULL 
    AND scheduled_publish_at <= NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION publish_scheduled_products() IS 'Auto-publishes products whose scheduled_publish_at time has passed';

