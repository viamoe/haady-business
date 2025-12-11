-- ================================
-- Cleanup Duplicate Products
-- ================================
-- This script helps identify and clean up duplicate products
-- Run this in your Supabase SQL Editor

-- 1. First, identify duplicates by SKU and store_id
SELECT 
  store_id,
  sku,
  COUNT(*) as duplicate_count,
  array_agg(id) as product_ids,
  array_agg(name_en) as product_names
FROM products
WHERE sku IS NOT NULL
GROUP BY store_id, sku
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. Identify duplicates without product_sources (orphaned products)
-- These are products that were created but don't have a product_source record
SELECT 
  p.id,
  p.name_en,
  p.sku,
  p.store_id,
  p.created_at
FROM products p
LEFT JOIN product_sources ps ON p.id = ps.product_id
WHERE ps.id IS NULL
ORDER BY p.created_at DESC;

-- 3. If product_sources table exists, find products with duplicate sources
-- (This should not happen due to UNIQUE constraint, but check anyway)
SELECT 
  product_id,
  platform,
  platform_product_id,
  COUNT(*) as duplicate_sources
FROM product_sources
GROUP BY product_id, platform, platform_product_id
HAVING COUNT(*) > 1;

-- ================================
-- CLEANUP OPTIONS (Choose one)
-- ================================

-- OPTION 1: Delete duplicates, keeping the oldest product
-- WARNING: This will delete products. Make sure you have a backup!
-- Uncomment and run only after reviewing the duplicates above

/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY store_id, sku 
      ORDER BY created_at ASC
    ) as row_num
  FROM products
  WHERE sku IS NOT NULL
)
DELETE FROM products
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);
*/

-- OPTION 2: Delete products without product_sources (if product_sources table exists)
-- WARNING: This will delete products. Make sure you have a backup!
-- Uncomment and run only after reviewing the orphaned products above

/*
DELETE FROM products
WHERE id IN (
  SELECT p.id
  FROM products p
  LEFT JOIN product_sources ps ON p.id = ps.product_id
  WHERE ps.id IS NULL
);
*/

-- OPTION 3: Manual cleanup - Review duplicates first, then delete specific IDs
-- Use the queries above to identify duplicates, then delete specific product IDs
-- DELETE FROM products WHERE id = 'specific-product-id-here';

