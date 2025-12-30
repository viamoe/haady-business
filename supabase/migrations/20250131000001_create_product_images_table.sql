-- ====================================================================
-- Migration: Create Product Images Table
-- Description: Allows products to have multiple images instead of just one
-- Date: 2025-01-31
-- ====================================================================

-- Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, is_primary) WHERE is_primary = true;

-- Add comments
COMMENT ON TABLE public.product_images IS 'Multiple images per product';
COMMENT ON COLUMN public.product_images.display_order IS 'Order in which images should be displayed';
COMMENT ON COLUMN public.product_images.is_primary IS 'Primary/featured image for the product';

-- Migrate existing image_url from products to product_images
INSERT INTO public.product_images (product_id, image_url, display_order, is_primary)
SELECT id, image_url, 0, true
FROM public.products
WHERE image_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view product images for products in their stores
CREATE POLICY "Users can view product images for their stores"
  ON public.product_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      JOIN public.business_profile bp ON bp.id = s.business_id
      WHERE p.id = product_images.product_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert product images for products in their stores
CREATE POLICY "Users can insert product images for their stores"
  ON public.product_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      JOIN public.business_profile bp ON bp.id = s.business_id
      WHERE p.id = product_images.product_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update product images for products in their stores
CREATE POLICY "Users can update product images for their stores"
  ON public.product_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      JOIN public.business_profile bp ON bp.id = s.business_id
      WHERE p.id = product_images.product_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can delete product images for products in their stores
CREATE POLICY "Users can delete product images for their stores"
  ON public.product_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      JOIN public.business_profile bp ON bp.id = s.business_id
      WHERE p.id = product_images.product_id
        AND bp.auth_user_id = auth.uid()
    )
  );

