-- ================================
-- SAFE Cleanup Duplicate Products
-- ================================
-- This script helps identify duplicates FIRST, then provides safe cleanup options
-- Run each section step by step

-- ================================
-- STEP 1: IDENTIFY DUPLICATES
-- ================================
-- Run this first to see what duplicates exist

-- 1a. Find duplicates by SKU and store_id
SELECT 
  store_id,
  sku,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as product_ids,
  array_agg(name_en ORDER BY created_at) as product_names,
  array_agg(created_at ORDER BY created_at) as created_dates
FROM products
WHERE sku IS NOT NULL
  AND sku != ''  -- Exclude empty SKUs
GROUP BY store_id, sku
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, store_id, sku;

-- 1b. Find products without product_sources (orphaned products)
-- Only run this if product_sources table exists
SELECT 
  p.id,
  p.name_en,
  p.name_ar,
  p.sku,
  p.store_id,
  p.created_at,
  p.price
FROM products p
LEFT JOIN product_sources ps ON p.id = ps.product_id
WHERE ps.id IS NULL
ORDER BY p.created_at DESC;

-- ================================
-- STEP 2: REVIEW THE RESULTS
-- ================================
-- Look at the results above and decide which products to keep
-- Generally, keep the OLDEST product (first created_at)

-- ================================
-- STEP 3: SAFE CLEANUP (Choose ONE option)
-- ================================

-- OPTION A: Delete duplicates by SKU, keeping the OLDEST product
-- This keeps the first product created (oldest created_at) and deletes the rest
-- SAFE: Only deletes products that have duplicates
-- 
-- UNCOMMENT THE CODE BELOW TO RUN:
/*
WITH duplicates_to_delete AS (
  SELECT 
    id,
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
RETURNING id, name_en, sku;
*/

-- OPTION B: Delete products without product_sources (orphaned products)
-- Only use this if you've run the product_sources migration
-- This deletes products that don't have a source record
-- 
-- UNCOMMENT THE CODE BELOW TO RUN:
/*
DELETE FROM products
WHERE id IN (
  SELECT p.id
  FROM products p
  LEFT JOIN product_sources ps ON p.id = ps.product_id
  WHERE ps.id IS NULL
)
RETURNING id, name_en, sku, created_at;
*/

-- OPTION C: Manual cleanup - Delete specific product IDs
-- Use this if you want to manually choose which products to delete
-- Replace 'product-id-here' with actual IDs from Step 1 results
-- 
-- UNCOMMENT AND MODIFY:
/*
DELETE FROM products 
WHERE id IN (
  'product-id-1-here',
  'product-id-2-here',
  'product-id-3-here'
)
RETURNING id, name_en, sku;
*/

-- ================================
-- STEP 4: VERIFY CLEANUP
-- ================================
-- Run this after cleanup to verify duplicates are gone

SELECT 
  store_id,
  sku,
  COUNT(*) as count
FROM products
WHERE sku IS NOT NULL AND sku != ''
GROUP BY store_id, sku
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Should return 0 rows if cleanup was successful

