-- ================================
-- Remove business_type_id from business_profile
-- ================================
-- Description: Removes the business_type_id column and its foreign key constraint
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Drop foreign key constraint
-- =====================================================

DO $$
BEGIN
  -- Drop the foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.business_profile'::regclass
    AND conname = 'business_profile_business_type_id_fkey'
  ) THEN
    ALTER TABLE public.business_profile 
    DROP CONSTRAINT business_profile_business_type_id_fkey;
    
    RAISE NOTICE 'Dropped foreign key constraint: business_profile_business_type_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint business_profile_business_type_id_fkey does not exist';
  END IF;
END $$;

-- =====================================================
-- PART 2: Drop the column
-- =====================================================

DO $$
BEGIN
  -- Drop the column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_profile'
    AND column_name = 'business_type_id'
  ) THEN
    ALTER TABLE public.business_profile 
    DROP COLUMN business_type_id;
    
    RAISE NOTICE 'Dropped column: business_profile.business_type_id';
  ELSE
    RAISE NOTICE 'Column business_profile.business_type_id does not exist';
  END IF;
END $$;

-- =====================================================
-- PART 3: Drop any indexes on business_type_id
-- =====================================================

DROP INDEX IF EXISTS public.idx_business_profile_business_type_id;
DROP INDEX IF EXISTS public.idx_businesses_business_type_id;

-- =====================================================
-- PART 4: Update old RPC functions that reference business_type_id
-- =====================================================

-- Note: The old create_business_onboarding function may still exist
-- but it's not used in the new onboarding flow.
-- We'll leave it as-is for backward compatibility, but it will fail
-- if called with business_type_id parameter.

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Removed business_type_id from business_profile';
  RAISE NOTICE '  - Dropped foreign key constraint';
  RAISE NOTICE '  - Dropped column';
  RAISE NOTICE '  - Dropped indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Old RPC functions that reference business_type_id';
  RAISE NOTICE '      may need to be updated separately if still in use.';
  RAISE NOTICE '==============================================';
END $$;

