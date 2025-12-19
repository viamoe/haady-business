-- ====================================================================
-- CREATE UNIFIED CATEGORIES TABLE (Standalone Version)
-- Description: Single source of truth for all categories
-- No dependencies on other tables
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
  USING (is_active = true);

-- Authenticated users can view all categories
CREATE POLICY "Authenticated users can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Step 3: Create updated_at trigger
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

-- Step 4: Helper function to get category path
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

-- Step 5: Helper function to get all subcategories
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

-- Step 6: Seed default categories
-- ====================================================================
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
-- VERIFICATION
-- ====================================================================
SELECT 
  '✅ Categories table created' as status,
  COUNT(*) as total_categories
FROM categories;

-- ====================================================================
-- SUCCESS
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Categories table created successfully!';
  RAISE NOTICE '📊 Seeded 15 default categories';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next: Create junction tables after your store/product tables exist';
  RAISE NOTICE '';
END $$;

