-- ====================================================================
-- ADD HOVER IMAGE URL TO CATEGORIES
-- Description: Add hover_image_url column to support image transitions on hover
-- Date: February 2025
-- ====================================================================

-- Add hover_image_url column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS hover_image_url TEXT;

-- Add comment
COMMENT ON COLUMN categories.hover_image_url IS 'URL to category hover image for transition effect on hover';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_hover_image_url ON categories(hover_image_url) WHERE hover_image_url IS NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ hover_image_url column added to categories table!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - Added hover_image_url column to categories';
  RAISE NOTICE '   - Created index on hover_image_url';
  RAISE NOTICE '';
END $$;

