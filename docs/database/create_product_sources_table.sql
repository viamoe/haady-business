-- ================================
-- Product Sources Table
-- ================================
-- This table links products to their source platforms (Salla, Zid, Shopify, etc.)
-- and stores platform-specific data

CREATE TABLE IF NOT EXISTS public.product_sources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'salla', 'zid', 'shopify', etc.
  platform_product_id text NOT NULL, -- Original product ID from the platform
  platform_sku text, -- Original SKU from the platform
  platform_data jsonb, -- Store all platform-specific fields here
  synced_at timestamptz DEFAULT now(),
  last_sync_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one source per product per platform
  UNIQUE(product_id, platform),
  
  -- Index for fast lookups
  UNIQUE(platform, platform_product_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_sources_product_id ON public.product_sources(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sources_platform ON public.product_sources(platform);
CREATE INDEX IF NOT EXISTS idx_product_sources_platform_product_id ON public.product_sources(platform, platform_product_id);
CREATE INDEX IF NOT EXISTS idx_product_sources_active ON public.product_sources(is_active) WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE public.product_sources ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view product sources for products in their stores
CREATE POLICY "Users can view product sources for their stores"
  ON public.product_sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON p.store_id = s.id
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE p.id = product_sources.product_id
        AND mu.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert product sources for their stores
CREATE POLICY "Users can insert product sources for their stores"
  ON public.product_sources
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON p.store_id = s.id
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE p.id = product_sources.product_id
        AND mu.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update product sources for their stores
CREATE POLICY "Users can update product sources for their stores"
  ON public.product_sources
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON p.store_id = s.id
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE p.id = product_sources.product_id
        AND mu.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON p.store_id = s.id
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE p.id = product_sources.product_id
        AND mu.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can delete product sources for their stores
CREATE POLICY "Users can delete product sources for their stores"
  ON public.product_sources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON p.store_id = s.id
      JOIN public.merchants m ON s.merchant_id = m.id
      JOIN public.merchant_users mu ON m.id = mu.merchant_id
      WHERE p.id = product_sources.product_id
        AND mu.auth_user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE public.product_sources IS 'Links products to their source platforms and stores platform-specific data';
COMMENT ON COLUMN public.product_sources.platform IS 'Platform identifier: salla, zid, shopify, etc.';
COMMENT ON COLUMN public.product_sources.platform_product_id IS 'Original product ID from the platform';
COMMENT ON COLUMN public.product_sources.platform_data IS 'Platform-specific fields stored as JSON (variants, images, categories, etc.)';

