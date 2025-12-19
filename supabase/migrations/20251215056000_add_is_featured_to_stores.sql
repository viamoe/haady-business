-- ================================
-- Add is_featured column to stores table
-- ================================
-- Description: Adds is_featured column to allow market managers to control
--              whether a store can sell on the Haady market
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Add is_featured column
-- =====================================================

DO $$
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stores' 
    AND column_name = 'is_featured'
  ) THEN
    -- Add the column with default value false
    ALTER TABLE public.stores 
    ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Added is_featured column to stores table';
  ELSE
    RAISE NOTICE 'is_featured column already exists in stores table';
  END IF;
END $$;

-- =====================================================
-- PART 2: Add column description
-- =====================================================

COMMENT ON COLUMN public.stores.is_featured IS 'Whether this store is featured and can sell on the Haady market. Controlled by market managers. Defaults to false.';

-- =====================================================
-- PART 3: Create index for faster queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_stores_is_featured 
ON public.stores(is_featured) 
WHERE is_featured = true;

COMMENT ON INDEX idx_stores_is_featured IS 'Index for faster queries of featured stores that can sell on the Haady market';

-- =====================================================
-- PART 4: Verification
-- =====================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_index_exists BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stores' 
    AND column_name = 'is_featured'
  ) INTO v_column_exists;
  
  -- Check if index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'stores' 
    AND indexname = 'idx_stores_is_featured'
  ) INTO v_index_exists;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'is_featured Column Status:';
  RAISE NOTICE '  Column exists: %', 
    CASE WHEN v_column_exists THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE '  Index exists: %', 
    CASE WHEN v_index_exists THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE '==============================================';
END $$;

