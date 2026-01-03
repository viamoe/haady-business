-- ====================================================================
-- ADD CATEGORY TYPE ENUM AND COLUMN
-- Description: Add category_type ENUM and column to support gifting platform structure
-- Date: January 2025
-- ====================================================================

-- Step 1: Create category_type ENUM
-- ====================================================================
DO $$
BEGIN
  -- Check if enum already exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_type_enum') THEN
    CREATE TYPE category_type_enum AS ENUM (
      'joyful_gifting',
      'tastes_treats',
      'digital_surprises',
      'moments_meaning',
      'donation_charity'
    );
    
    COMMENT ON TYPE category_type_enum IS 'Top-level category types for social gifting platform';
    
    RAISE NOTICE 'Created category_type_enum';
  ELSE
    RAISE NOTICE 'category_type_enum already exists';
  END IF;
END $$;

-- Step 2: Add category_type column to categories table
-- ====================================================================
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS category_type category_type_enum;

COMMENT ON COLUMN categories.category_type IS 'Top-level category type. Only populated for Level 0 (Category Type) categories. NULL for Level 1+ categories.';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_categories_category_type ON categories(category_type);

-- Step 3: Update level constraint to allow flexible levels (0-2+)
-- ====================================================================
-- The existing constraint already allows level >= 0, so we keep it flexible
-- But we'll document the structure:
-- Level 0: Category Type (has category_type populated)
-- Level 1: Main Category (parent is Level 0)
-- Level 2: Sub Category (parent is Level 1)
-- Level 3+: Can be used for deeper nesting if needed

-- Step 4: Archive existing categories (set is_active = false)
-- ====================================================================
-- Mark all existing categories as inactive since we're restructuring
UPDATE categories 
SET is_active = false
WHERE category_type IS NULL 
  AND is_active = true;

-- Add a comment to track when this migration happened
COMMENT ON COLUMN categories.category_type IS 'Top-level category type. Only populated for Level 0 (Category Type) categories. NULL for Level 1+ categories. Migration: 2025-01-01 - Existing categories archived.';

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
DO $$
DECLARE
  archived_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO archived_count
  FROM categories
  WHERE is_active = false AND category_type IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Category type ENUM and column added successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - Created category_type_enum with 5 values';
  RAISE NOTICE '   - Added category_type column to categories table';
  RAISE NOTICE '   - Created index on category_type';
  RAISE NOTICE '   - Archived % existing categories', archived_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Structure:';
  RAISE NOTICE '   - Level 0: Category Type (has category_type)';
  RAISE NOTICE '   - Level 1: Main Category (parent is Level 0)';
  RAISE NOTICE '   - Level 2+: Sub Categories (parent is Level 1+)';
  RAISE NOTICE '';
END $$;

