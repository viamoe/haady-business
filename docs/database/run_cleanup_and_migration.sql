-- ================================
-- Complete Setup: Cleanup + Migration
-- ================================
-- Run these in order in your Supabase SQL Editor

-- ================================
-- STEP 1: PREVIEW DUPLICATES (Review First!)
-- ================================
-- This shows which products will be deleted
SELECT 
  p.id,
  p.name_en,
  p.sku,
  p.store_id,
  p.created_at,
  ROW_NUMBER() OVER (
    PARTITION BY p.store_id, p.sku 
    ORDER BY p.created_at ASC
  ) as row_num,
  CASE 
    WHEN ROW_NUMBER() OVER (PARTITION BY p.store_id, p.sku ORDER BY p.created_at ASC) > 1 
    THEN 'WILL BE DELETED' 
    ELSE 'KEPT (oldest)' 
  END as action
FROM products p
WHERE p.sku IS NOT NULL
  AND p.sku != ''
  AND (p.store_id, p.sku) IN (
    SELECT store_id, sku
    FROM products
    WHERE sku IS NOT NULL AND sku != ''
    GROUP BY store_id, sku
    HAVING COUNT(*) > 1
  )
ORDER BY p.store_id, p.sku, p.created_at ASC;

-- ================================
-- STEP 2: DELETE DUPLICATES
-- ================================
-- Uncomment and run this after reviewing Step 1
-- This keeps the OLDEST product and deletes newer duplicates

/*
WITH duplicates_to_delete AS (
  SELECT 
    id,
    name_en,
    sku,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY store_id, sku 
      ORDER BY created_at ASC  -- Keep oldest, delete newer ones
    ) as row_num
  FROM products
  WHERE sku IS NOT NULL
    AND sku != ''
    AND (store_id, sku) IN (
      -- Only products that have duplicates
      SELECT store_id, sku
      FROM products
      WHERE sku IS NOT NULL AND sku != ''
      GROUP BY store_id, sku
      HAVING COUNT(*) > 1
    )
)
DELETE FROM products
WHERE id IN (
  SELECT id FROM duplicates_to_delete WHERE row_num > 1
)
RETURNING id, name_en, sku, created_at;
*/

-- ================================
-- STEP 3: VERIFY CLEANUP
-- ================================
-- After Step 2, run this to verify no duplicates remain
-- Should return 0 rows

SELECT 
  store_id,
  sku,
  COUNT(*) as duplicate_count
FROM products
WHERE sku IS NOT NULL AND sku != ''
GROUP BY store_id, sku
HAVING COUNT(*) > 1;

-- Should show ~20 products (matching your Salla products)
SELECT COUNT(*) as total_products FROM products;

-- ================================
-- STEP 4: CREATE PRODUCT_SOURCES TABLE
-- ================================
-- Run this to create the product_sources table for platform tracking

-- Table creation
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

-- ================================
-- STEP 5: VERIFY MIGRATION
-- ================================
-- After Step 4, verify the table was created

SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_sources'
ORDER BY ordinal_position;

-- ================================
-- STEP 6: BACKFILL PRODUCT_SOURCES (Optional)
-- ================================
-- If you want to create product_sources for existing products
-- This will create source records for products that don't have them yet
-- Note: This requires store_connections table to have platform info

-- Uncomment to run:
/*
INSERT INTO public.product_sources (product_id, platform, platform_product_id, platform_sku, platform_data, synced_at, last_sync_at)
SELECT 
  p.id as product_id,
  'salla' as platform,
  p.sku as platform_product_id,  -- Using SKU as fallback if we don't have original ID
  p.sku as platform_sku,
  jsonb_build_object(
    'name_en', p.name_en,
    'name_ar', p.name_ar,
    'synced_at', p.created_at
  ) as platform_data,
  p.created_at as synced_at,
  p.updated_at as last_sync_at
FROM products p
WHERE p.sku IS NOT NULL
  AND p.sku != ''
  AND NOT EXISTS (
    SELECT 1 FROM product_sources ps 
    WHERE ps.product_id = p.id AND ps.platform = 'salla'
  )
ON CONFLICT (product_id, platform) DO NOTHING;
*/

