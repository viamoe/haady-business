-- ================================
-- Cleanup Duplicate Products - Ready to Run
-- ================================
-- This will delete duplicate products, keeping the oldest one
-- Based on: store_id + sku combination

-- STEP 1: First, see what will be deleted (REVIEW THIS FIRST!)
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
    -- Only show products that have duplicates
    SELECT store_id, sku
    FROM products
    WHERE sku IS NOT NULL AND sku != ''
    GROUP BY store_id, sku
    HAVING COUNT(*) > 1
  )
ORDER BY p.store_id, p.sku, p.created_at ASC;

-- STEP 2: If the above looks correct, run this to delete duplicates
-- This keeps the OLDEST product (first created) and deletes the rest
-- UNCOMMENT TO RUN:

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

-- STEP 3: Verify cleanup worked
-- After running the delete, this should return 0 rows:
SELECT 
  store_id,
  sku,
  COUNT(*) as duplicate_count
FROM products
WHERE sku IS NOT NULL AND sku != ''
GROUP BY store_id, sku
HAVING COUNT(*) > 1;

-- And this should show ~20 products (matching your Salla products):
SELECT COUNT(*) as total_products FROM products;

