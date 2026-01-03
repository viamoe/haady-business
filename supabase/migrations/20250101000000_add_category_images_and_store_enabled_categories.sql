-- ====================================================================
-- ADD CATEGORY IMAGES AND STORE ENABLED CATEGORIES
-- Description: Add image_url to categories and create store_enabled_categories table
-- Date: January 2025
-- ====================================================================

-- Step 1: Add image_url column to categories table
-- ====================================================================
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment
COMMENT ON COLUMN categories.image_url IS 'URL to category image/icon for display purposes';

-- Step 2: Create store_enabled_categories table
-- ====================================================================
-- This table tracks which categories each store has enabled for use with their products
-- Note: Using business_id from stores table to link to business_profile
CREATE TABLE IF NOT EXISTS store_enabled_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(store_id, category_id),
  -- Foreign key will be added after verifying stores table structure
  CONSTRAINT fk_store_enabled_categories_store 
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_enabled_categories_store_id ON store_enabled_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_store_enabled_categories_category_id ON store_enabled_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_store_enabled_categories_is_enabled ON store_enabled_categories(is_enabled);

-- Add comment
COMMENT ON TABLE store_enabled_categories IS 'Tracks which categories each store has enabled for use with their products';

-- Enable RLS
ALTER TABLE store_enabled_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read enabled categories
CREATE POLICY "Store enabled categories are viewable by everyone"
  ON store_enabled_categories FOR SELECT
  TO authenticated, anon
  USING (true);

-- Store owners can manage their enabled categories
CREATE POLICY "Store owners can manage their enabled categories"
  ON store_enabled_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      JOIN business_profile ON stores.business_id = business_profile.id
      WHERE stores.id = store_enabled_categories.store_id
      AND business_profile.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      JOIN business_profile ON stores.business_id = business_profile.id
      WHERE stores.id = store_enabled_categories.store_id
      AND business_profile.auth_user_id = auth.uid()
    )
  );

-- Step 3: Create updated_at trigger for store_enabled_categories
-- ====================================================================
CREATE OR REPLACE FUNCTION update_store_enabled_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_enabled_categories_updated_at
  BEFORE UPDATE ON store_enabled_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_store_enabled_categories_updated_at();

-- Step 4: Create view for store enabled categories with details
-- ====================================================================
CREATE OR REPLACE VIEW store_enabled_categories_view AS
SELECT 
  sec.id as store_enabled_category_id,
  sec.store_id,
  sec.category_id,
  sec.is_enabled,
  c.name as category_name,
  c.name_ar as category_name_ar,
  c.slug as category_slug,
  c.icon as category_icon,
  c.image_url as category_image_url,
  c.description as category_description,
  c.description_ar as category_description_ar,
  c.level as category_level,
  c.parent_id as category_parent_id,
  c.is_active as category_is_active,
  sec.created_at as enabled_at,
  sec.updated_at as last_updated
FROM store_enabled_categories sec
JOIN categories c ON sec.category_id = c.id;

COMMENT ON VIEW store_enabled_categories_view IS 'Denormalized view of store enabled categories with full category details';

-- Step 5: Add is_system flag to categories to mark default/system categories
-- ====================================================================
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN categories.is_system IS 'Marks categories as system/default categories that cannot be deleted';

CREATE INDEX IF NOT EXISTS idx_categories_is_system ON categories(is_system);

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Category images and store enabled categories added successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - Added image_url column to categories';
  RAISE NOTICE '   - Created store_enabled_categories table';
  RAISE NOTICE '   - Added is_system flag to categories';
  RAISE NOTICE '   - Created store_enabled_categories_view';
  RAISE NOTICE '';
END $$;

