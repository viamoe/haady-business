-- ====================================================================
-- MIGRATION: Consolidate to Single Categories Table
-- Description: Migrate from multiple category tables to a unified structure
-- Date: 2024
-- ====================================================================

-- Step 1: Create the new unified categories table
-- ====================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  description TEXT,
  description_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);

-- Add RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Only admins can insert/update/delete categories (adjust based on your needs)
CREATE POLICY "Categories are manageable by admins"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.user_id = auth.uid()
      AND business_users.role = 'admin'
    )
  );

-- Step 2: Migrate data from categories_master
-- ====================================================================
-- First, check what columns exist and insert accordingly
DO $$
BEGIN
  -- Insert all categories from categories_master into the new categories table
  -- Handle missing columns gracefully
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories_master') THEN
    INSERT INTO categories (id, name, name_ar, slug, parent_id, level, icon, description, is_active, sort_order, created_at, updated_at)
    SELECT 
      id,
      name,
      COALESCE(name_ar, NULL) as name_ar,
      COALESCE(slug, LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))) as slug,
      NULL as parent_id, -- categories_master doesn't have parent_id, set to NULL (top-level)
      0 as level, -- All categories from categories_master are top-level
      COALESCE(icon, NULL) as icon,
      COALESCE(description, NULL) as description,
      COALESCE(is_active, true) as is_active,
      COALESCE(sort_order, 0) as sort_order,
      COALESCE(created_at, NOW()) as created_at,
      COALESCE(updated_at, NOW()) as updated_at
    FROM categories_master
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      name_ar = EXCLUDED.name_ar,
      slug = EXCLUDED.slug,
      updated_at = NOW();
  END IF;
END $$;

-- Step 3: Create junction table for store-category relationships
-- ====================================================================
CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_categories_store_id ON store_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_category_id ON store_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_is_primary ON store_categories(is_primary);

-- Add RLS policies
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

-- Users can read all store categories
CREATE POLICY "Store categories are viewable by everyone"
  ON store_categories FOR SELECT
  TO authenticated, anon
  USING (true);

-- Store owners can manage their store categories
CREATE POLICY "Store owners can manage their store categories"
  ON store_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_profiles
      WHERE business_profiles.id = store_categories.store_id
      AND business_profiles.user_id = auth.uid()
    )
  );

-- Step 4: Migrate existing store category data
-- ====================================================================
-- If business_profiles has a category_id column, migrate it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' 
    AND column_name = 'category_id'
  ) THEN
    INSERT INTO store_categories (store_id, category_id, is_primary)
    SELECT id, category_id, true
    FROM business_profiles
    WHERE category_id IS NOT NULL
    ON CONFLICT (store_id, category_id) DO NOTHING;
  END IF;
END $$;

-- Step 5: Create junction table for product-category relationships
-- ====================================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);

-- Add RLS policies
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read product categories
CREATE POLICY "Product categories are viewable by everyone"
  ON product_categories FOR SELECT
  TO authenticated, anon
  USING (true);

-- Store owners can manage their product categories
CREATE POLICY "Store owners can manage their product categories"
  ON product_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN business_profiles ON products.business_id = business_profiles.id
      WHERE products.id = product_categories.product_id
      AND business_profiles.user_id = auth.uid()
    )
  );

-- Step 6: Migrate existing product category data
-- ====================================================================
-- If products has a category_id column, migrate it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'category_id'
  ) THEN
    INSERT INTO product_categories (product_id, category_id)
    SELECT id, category_id
    FROM products
    WHERE category_id IS NOT NULL
    ON CONFLICT (product_id, category_id) DO NOTHING;
  END IF;
END $$;

-- Step 7: Add updated_at trigger for categories table
-- ====================================================================
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- Step 8: Helper function to get category hierarchy
-- ====================================================================
CREATE OR REPLACE FUNCTION get_category_path(category_id UUID)
RETURNS TEXT AS $$
DECLARE
  category_path TEXT;
BEGIN
  WITH RECURSIVE category_tree AS (
    SELECT id, name, parent_id, 0 as depth
    FROM categories
    WHERE id = category_id
    
    UNION ALL
    
    SELECT c.id, c.name, c.parent_id, ct.depth + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.id = ct.parent_id
  )
  SELECT STRING_AGG(name, ' > ' ORDER BY depth DESC)
  INTO category_path
  FROM category_tree;
  
  RETURN category_path;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create view for store categories with details
-- ====================================================================
CREATE OR REPLACE VIEW store_categories_view AS
SELECT 
  sc.store_id,
  sc.category_id,
  sc.is_primary,
  c.name as category_name,
  c.name_ar as category_name_ar,
  c.slug as category_slug,
  c.icon as category_icon,
  c.level as category_level,
  c.parent_id as category_parent_id,
  get_category_path(c.id) as category_path
FROM store_categories sc
JOIN categories c ON sc.category_id = c.id
WHERE c.is_active = true;

-- Step 10: Create view for product categories with details
-- ====================================================================
CREATE OR REPLACE VIEW product_categories_view AS
SELECT 
  pc.product_id,
  pc.category_id,
  c.name as category_name,
  c.name_ar as category_name_ar,
  c.slug as category_slug,
  c.icon as category_icon,
  c.level as category_level,
  c.parent_id as category_parent_id,
  get_category_path(c.id) as category_path
FROM product_categories pc
JOIN categories c ON pc.category_id = c.id
WHERE c.is_active = true;

-- ====================================================================
-- CLEANUP (Optional - uncomment when ready to remove old tables)
-- ====================================================================
-- WARNING: Only run these after verifying the migration is successful
-- and all applications are updated to use the new structure

-- DROP TABLE IF EXISTS categories_master CASCADE;
-- DROP TABLE IF EXISTS old_store_categories CASCADE;

-- If category_id columns exist in business_profiles or products, you may want to:
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS category_id;
-- ALTER TABLE products DROP COLUMN IF EXISTS category_id;

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================
-- Run these to verify the migration

-- Check category count
-- SELECT 'Total categories' as metric, COUNT(*) as count FROM categories
-- UNION ALL
-- SELECT 'Active categories', COUNT(*) FROM categories WHERE is_active = true
-- UNION ALL
-- SELECT 'Top-level categories', COUNT(*) FROM categories WHERE parent_id IS NULL
-- UNION ALL
-- SELECT 'Store categories', COUNT(*) FROM store_categories
-- UNION ALL
-- SELECT 'Product categories', COUNT(*) FROM product_categories;

-- Check category hierarchy
-- SELECT 
--   level,
--   COUNT(*) as category_count
-- FROM categories
-- WHERE is_active = true
-- GROUP BY level
-- ORDER BY level;

-- ====================================================================
-- END OF MIGRATION
-- ====================================================================

