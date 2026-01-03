-- ================================
-- Add Unique Constraints for SKU and Barcode
-- ================================
-- Description: Adds store-scoped unique constraints to ensure SKU and barcode uniqueness
--              within each store. This provides database-level enforcement in addition
--              to application-level checks.
-- Date: 2025-01-31

-- Note: This migration is optional but recommended for data integrity.
-- The application code already handles uniqueness checking, but database
-- constraints provide an additional safety layer.

-- Step 1: Fix existing duplicates by regenerating unique SKUs/barcodes
-- This ensures we can add unique constraints without conflicts

-- Fix duplicate SKUs: Keep the oldest product's SKU, regenerate SKUs for newer duplicates
DO $$
DECLARE
  dup_group RECORD;
  product_rec RECORD;
  new_sku TEXT;
  row_num INTEGER := 0;
BEGIN
  -- Loop through all duplicate SKU groups
  FOR dup_group IN
    SELECT store_id, sku, COUNT(*) as cnt
    FROM public.products
    WHERE sku IS NOT NULL AND sku != ''
    GROUP BY store_id, sku
    HAVING COUNT(*) > 1
  LOOP
    row_num := 0;
    -- For each duplicate SKU group, keep the oldest product and regenerate SKUs for others
    FOR product_rec IN
      SELECT id, created_at
      FROM public.products
      WHERE store_id = dup_group.store_id
        AND sku = dup_group.sku
      ORDER BY created_at ASC
    LOOP
      row_num := row_num + 1;
      -- Keep the first (oldest) product, regenerate SKU for others
      IF row_num > 1 THEN
        -- Generate new unique SKU with timestamp and random suffix
        new_sku := 'PROD-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || row_num || '-' || (RANDOM() * 1000)::INTEGER;
        
        -- Ensure the new SKU doesn't already exist
        WHILE EXISTS (SELECT 1 FROM public.products WHERE store_id = dup_group.store_id AND sku = new_sku) LOOP
          new_sku := 'PROD-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || row_num || '-' || (RANDOM() * 10000)::INTEGER;
        END LOOP;
        
        -- Update the product with new SKU
        UPDATE public.products
        SET sku = new_sku,
            sku_auto_generated = true,
            updated_at = NOW()
        WHERE id = product_rec.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Fix duplicate barcodes: Keep the oldest product's barcode, regenerate barcodes for newer duplicates
DO $$
DECLARE
  dup_group RECORD;
  product_rec RECORD;
  new_barcode TEXT;
  row_num INTEGER := 0;
BEGIN
  -- Loop through all duplicate barcode groups
  FOR dup_group IN
    SELECT store_id, barcode, COUNT(*) as cnt
    FROM public.products
    WHERE barcode IS NOT NULL AND barcode != ''
    GROUP BY store_id, barcode
    HAVING COUNT(*) > 1
  LOOP
    row_num := 0;
    -- For each duplicate barcode group, keep the oldest product and regenerate barcodes for others
    FOR product_rec IN
      SELECT id, created_at
      FROM public.products
      WHERE store_id = dup_group.store_id
        AND barcode = dup_group.barcode
      ORDER BY created_at ASC
    LOOP
      row_num := row_num + 1;
      -- Keep the first (oldest) product, regenerate barcode for others
      IF row_num > 1 THEN
        -- Generate new unique barcode (EAN13 format with prefix 200)
        new_barcode := '200' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 1000000000)::TEXT, 9, '0');
        
        -- Ensure the new barcode doesn't already exist
        WHILE EXISTS (SELECT 1 FROM public.products WHERE store_id = dup_group.store_id AND barcode = new_barcode) LOOP
          new_barcode := '200' || LPAD(((EXTRACT(EPOCH FROM NOW())::BIGINT + (RANDOM() * 1000)::INTEGER) % 1000000000)::TEXT, 9, '0');
        END LOOP;
        
        -- Update the product with new barcode
        UPDATE public.products
        SET barcode = new_barcode,
            barcode_auto_generated = true,
            updated_at = NOW()
        WHERE id = product_rec.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Create unique partial indexes for store-scoped uniqueness
-- These allow the same SKU/barcode in different stores, but prevent duplicates within the same store

-- Unique constraint for SKU per store (only for non-null, non-empty SKUs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique_per_store 
ON public.products(store_id, sku) 
WHERE sku IS NOT NULL AND sku != '';

-- Unique constraint for barcode per store (only for non-null, non-empty barcodes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique_per_store 
ON public.products(store_id, barcode) 
WHERE barcode IS NOT NULL AND barcode != '';

-- Add comments
COMMENT ON INDEX idx_products_sku_unique_per_store IS 'Ensures SKU uniqueness within each store';
COMMENT ON INDEX idx_products_barcode_unique_per_store IS 'Ensures barcode uniqueness within each store';

