-- ====================================================================
-- Migration: Add Product Trash/Soft Delete System
-- Description: Adds deleted_at column for soft delete functionality
--              Products can be restored from trash
-- Date: 2025-02-02
-- ====================================================================

-- Add deleted_at column to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.deleted_at IS 'Timestamp when product was soft-deleted (moved to trash). NULL means product is not deleted.';

-- Create index for faster filtering of non-deleted products
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at) WHERE deleted_at IS NULL;

-- Create index for faster filtering of deleted products (for trash view)
CREATE INDEX IF NOT EXISTS idx_products_deleted_at_not_null ON public.products(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to include deleted_at filter
-- Note: Existing policies should already handle access control
-- We'll filter deleted_at in application logic to ensure deleted products are hidden by default

