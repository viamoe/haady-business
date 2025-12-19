-- ====================================================================
-- CREATE UNIFIED CATEGORIES TABLE
-- Description: Single source of truth for all categories (stores & products)
-- Date: December 2024
-- ====================================================================

-- Step 1: Create the main categories table
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_level CHECK (level >= 0),
  CONSTRAINT valid_sort_order CHECK (sort_order >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Add comment
COMMENT ON TABLE categories IS 'Unified category table for stores and products with hierarchical support';

-- Step 2: Enable RLS and create policies
-- ====================================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Only authenticated users can see inactive categories (for admin purposes)
CREATE POLICY "Authenticated users can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Step 3: Create junction table for store-category relationships
-- ====================================================================
CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(store_id, category_id),
  CONSTRAINT one_primary_per_store EXCLUDE USING btree (store_id WITH =) WHERE (is_primary = true)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_categories_store_id ON store_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_category_id ON store_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_is_primary ON store_categories(is_primary);

-- Add comment
COMMENT ON TABLE store_categories IS 'Junction table linking stores to categories (many-to-many)';

-- Enable RLS
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read store categories
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

-- Step 4: Create junction table for product-category relationships
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

-- Enable RLS
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

-- Step 5: Create updated_at trigger for categories
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

-- Step 6: Helper function to get category path
-- ====================================================================
CREATE OR REPLACE FUNCTION get_category_path(category_id UUID)
RETURNS TEXT AS $$
DECLARE
  category_path TEXT;
BEGIN
  WITH RECURSIVE category_tree AS (
    -- Start with the given category
    SELECT id, name, parent_id, 0 as depth
    FROM categories
    WHERE id = category_id
    
    UNION ALL
    
    -- Recursively get parent categories
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

COMMENT ON FUNCTION get_category_path IS 'Returns the full path of a category (e.g., "Electronics > Phones > Smartphones")';

-- Step 7: Helper function to get all subcategories
-- ====================================================================
CREATE OR REPLACE FUNCTION get_subcategories(parent_category_id UUID)
RETURNS TABLE(id UUID, name TEXT, level INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    -- Start with direct children
    SELECT c.id, c.name, c.level, c.parent_id
    FROM categories c
    WHERE c.parent_id = parent_category_id
    AND c.is_active = true
    
    UNION ALL
    
    -- Recursively get all descendants
    SELECT c.id, c.name, c.level, c.parent_id
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = true
  )
  SELECT ct.id, ct.name, ct.level
  FROM category_tree ct
  ORDER BY ct.level, ct.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_subcategories IS 'Returns all subcategories (recursive) of a given parent category';

-- Step 8: Create view for store categories with details
-- ====================================================================
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

-- Step 9: Create view for product categories with details
-- ====================================================================
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

-- Step 10: Seed default categories (optional)
-- ====================================================================
-- Insert some default top-level categories
-- You can customize these based on your needs

INSERT INTO categories (name, name_ar, slug, level, icon, description, is_active, sort_order)
VALUES 
  ('Fashion', 'الموضة', 'fashion', 0, '👗', 'Clothing, shoes, and accessories', true, 1),
  ('Electronics', 'الإلكترونيات', 'electronics', 0, '📱', 'Phones, computers, and gadgets', true, 2),
  ('Home & Garden', 'المنزل والحديقة', 'home-garden', 0, '🏠', 'Furniture, decor, and gardening', true, 3),
  ('Beauty & Health', 'الجمال والصحة', 'beauty-health', 0, '💄', 'Cosmetics, skincare, and wellness', true, 4),
  ('Sports & Outdoors', 'الرياضة والهواء الطلق', 'sports-outdoors', 0, '⚽', 'Athletic gear and outdoor equipment', true, 5),
  ('Food & Beverages', 'الطعام والمشروبات', 'food-beverages', 0, '🍔', 'Restaurants, cafes, and food products', true, 6),
  ('Books & Media', 'الكتب والإعلام', 'books-media', 0, '📚', 'Books, movies, music, and games', true, 7),
  ('Toys & Kids', 'الألعاب والأطفال', 'toys-kids', 0, '🧸', 'Toys, games, and children products', true, 8),
  ('Automotive', 'السيارات', 'automotive', 0, '🚗', 'Cars, parts, and accessories', true, 9),
  ('Services', 'الخدمات', 'services', 0, '🛠️', 'Professional services and consultations', true, 10),
  ('Handmade & Crafts', 'المصنوعات اليدوية', 'handmade-crafts', 0, '🎨', 'Handcrafted and artisan products', true, 11),
  ('Pets', 'الحيوانات الأليفة', 'pets', 0, '🐾', 'Pet supplies and services', true, 12),
  ('Office & Business', 'المكتب والأعمال', 'office-business', 0, '💼', 'Office supplies and business equipment', true, 13),
  ('Jewelry & Watches', 'المجوهرات والساعات', 'jewelry-watches', 0, '💎', 'Fine jewelry and timepieces', true, 14),
  ('Other', 'أخرى', 'other', 0, '📦', 'Miscellaneous products and services', true, 99)
ON CONFLICT (slug) DO NOTHING;

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================
-- Run these to verify the setup

-- Check tables were created
SELECT 
  'Tables created' as status,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('categories', 'store_categories', 'product_categories');

-- Check categories were seeded
SELECT 
  'Categories seeded' as status,
  COUNT(*) as category_count
FROM categories
WHERE is_active = true;

-- Check indexes
SELECT 
  'Indexes created' as status,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('categories', 'store_categories', 'product_categories');

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Categories table structure created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - Main table: categories';
  RAISE NOTICE '   - Junction tables: store_categories, product_categories';
  RAISE NOTICE '   - Helper functions: get_category_path, get_subcategories';
  RAISE NOTICE '   - Views: store_categories_view, product_categories_view';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Default categories seeded: 15 top-level categories';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Test the onboarding flow';
  RAISE NOTICE '   2. Add subcategories if needed';
  RAISE NOTICE '   3. Customize category list for your platform';
  RAISE NOTICE '';
END $$;

-- ====================================================================
-- END OF SCRIPT
-- ====================================================================

