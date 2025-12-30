-- ====================================================================
-- Migration: Add Published Status to Products
-- Description: Adds is_published column to control product visibility
--              - Published = visible to customers
--              - Draft = hidden from customers (for editing/preparation)
-- Date: 2025-12-28
-- ====================================================================

-- Add is_published column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.products.is_published IS 'Whether the product is published and visible to customers. Draft products are hidden.';

-- Create index for faster queries on published products
CREATE INDEX IF NOT EXISTS idx_products_is_published ON public.products(is_published);

-- Update existing products: set is_published = true for products that are available
-- (Assumes existing available products should be published)
UPDATE public.products 
SET is_published = true 
WHERE is_available = true AND is_published IS NULL;

-- Set remaining to false (drafts)
UPDATE public.products 
SET is_published = false 
WHERE is_published IS NULL;

