-- ====================================================================
-- CREATE CATEGORY JUNCTION TABLES (Simplified)
-- Description: Links categories to stores and products
-- No complex RLS policies (can be added later)
-- Date: December 2024
-- ====================================================================

-- Step 1: Create store_categories junction table
-- ====================================================================
CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(store_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_categories_store_id ON store_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_category_id ON store_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_is_primary ON store_categories(is_primary);

-- Add comment
COMMENT ON TABLE store_categories IS 'Junction table linking stores to categories (many-to-many)';

-- Enable RLS with simple policies
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read store categories
CREATE POLICY "Store categories are viewable by everyone"
  ON store_categories FOR SELECT
  USING (true);

-- Authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can manage store categories"
  ON store_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 2: Create product_categories junction table
-- ====================================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(product_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);

-- Add comment
COMMENT ON TABLE product_categories IS 'Junction table linking products to categories (many-to-many)';

-- Enable RLS with simple policies
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read product categories
CREATE POLICY "Product categories are viewable by everyone"
  ON product_categories FOR SELECT
  USING (true);

-- Authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can manage product categories"
  ON product_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 3: Create views
-- ====================================================================

-- Store categories view
CREATE OR REPLACE VIEW store_categories_view AS
SELECT 
  sc.id as store_category_id,
  sc.store_id,
  sc.category_id,
  sc.is_primary,
  c.name as category_name,
  c.name_ar as category_name_ar,
  c.slug as category_slug,
  c.icon as category_icon,
  c.level as category_level,
  c.parent_id as category_parent_id,
  get_category_path(c.id) as category_path,
  c.created_at as category_created_at,
  sc.created_at as assigned_at
FROM store_categories sc
JOIN categories c ON sc.category_id = c.id
WHERE c.is_active = true;

COMMENT ON VIEW store_categories_view IS 'Denormalized view of store categories with full category details';

-- Product categories view
CREATE OR REPLACE VIEW product_categories_view AS
SELECT 
  pc.id as product_category_id,
  pc.product_id,
  pc.category_id,
  c.name as category_name,
  c.name_ar as category_name_ar,
  c.slug as category_slug,
  c.icon as category_icon,
  c.level as category_level,
  c.parent_id as category_parent_id,
  get_category_path(c.id) as category_path,
  c.created_at as category_created_at,
  pc.created_at as assigned_at
FROM product_categories pc
JOIN categories c ON pc.category_id = c.id
WHERE c.is_active = true;

COMMENT ON VIEW product_categories_view IS 'Denormalized view of product categories with full category details';

-- ====================================================================
-- VERIFICATION
-- ====================================================================
SELECT 
  'store_categories' as table_name,
  COUNT(*) as row_count
FROM store_categories
UNION ALL
SELECT 
  'product_categories',
  COUNT(*)
FROM product_categories;

-- ====================================================================
-- SUCCESS
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Category junction tables created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables created:';
  RAISE NOTICE '   - store_categories';
  RAISE NOTICE '   - product_categories';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Views created:';
  RAISE NOTICE '   - store_categories_view';
  RAISE NOTICE '   - product_categories_view';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS enabled with simple policies';
  RAISE NOTICE '   (You can enhance these policies later)';
  RAISE NOTICE '';
END $$;

