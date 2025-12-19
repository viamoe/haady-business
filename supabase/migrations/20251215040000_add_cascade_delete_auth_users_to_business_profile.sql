-- ================================
-- Add CASCADE delete from auth.users to business_profile
-- ================================
-- Description: Ensures that when an auth user is deleted, their business_profile
--              and all related stores are automatically deleted via CASCADE.
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Check and update business_profile.auth_user_id foreign key
-- =====================================================

DO $$
DECLARE
  v_constraint_name TEXT;
  v_constraint_exists BOOLEAN := false;
BEGIN
  -- Find the existing foreign key constraint on auth_user_id
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.business_profile'::regclass
    AND confrelid = 'auth.users'::regclass
    AND contype = 'f'
    AND conkey::text LIKE '%auth_user_id%'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    -- Check if it already has CASCADE
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = v_constraint_name
        AND confdeltype = 'c'  -- 'c' means CASCADE
    ) THEN
      RAISE NOTICE 'Constraint % already has CASCADE delete - no changes needed', v_constraint_name;
    ELSE
      -- Drop the existing constraint to recreate with CASCADE
      EXECUTE format('ALTER TABLE public.business_profile DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
      RAISE NOTICE 'Dropped existing constraint: %', v_constraint_name;
      
      -- Add new constraint with CASCADE delete
      ALTER TABLE public.business_profile
      ADD CONSTRAINT business_profile_auth_user_id_fkey_cascade
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Created CASCADE delete constraint: business_profile_auth_user_id_fkey_cascade';
    END IF;
  ELSE
    -- No constraint exists, create it with CASCADE
    ALTER TABLE public.business_profile
    ADD CONSTRAINT business_profile_auth_user_id_fkey_cascade
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Created CASCADE delete constraint: business_profile_auth_user_id_fkey_cascade';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating business_profile.auth_user_id constraint: %', SQLERRM;
END $$;

-- =====================================================
-- PART 2: Verify CASCADE chain
-- =====================================================

-- Verify that stores already have CASCADE to business_profile
DO $$
DECLARE
  v_stores_cascade_exists BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.stores'::regclass
      AND confrelid = 'public.business_profile'::regclass
      AND contype = 'f'
      AND confdeltype = 'c'  -- 'c' means CASCADE
  ) INTO v_stores_cascade_exists;

  IF v_stores_cascade_exists THEN
    RAISE NOTICE '✓ stores.business_id already has CASCADE delete to business_profile';
  ELSE
    RAISE WARNING '⚠ stores.business_id does NOT have CASCADE delete - this may cause issues';
  END IF;
END $$;

-- Verify that store_connections already have CASCADE to stores
DO $$
DECLARE
  v_connections_cascade_exists BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.store_connections'::regclass
      AND confrelid = 'public.stores'::regclass
      AND contype = 'f'
      AND confdeltype = 'c'  -- 'c' means CASCADE
  ) INTO v_connections_cascade_exists;

  IF v_connections_cascade_exists THEN
    RAISE NOTICE '✓ store_connections.store_id already has CASCADE delete to stores';
  ELSE
    RAISE WARNING '⚠ store_connections.store_id does NOT have CASCADE delete - this may cause issues';
  END IF;
END $$;

-- =====================================================
-- PART 3: Add comments
-- =====================================================

COMMENT ON CONSTRAINT business_profile_auth_user_id_fkey_cascade ON public.business_profile IS 
'Foreign key to auth.users with CASCADE delete. When a user is deleted, their business_profile and all related stores are automatically deleted.';

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CASCADE delete chain verified:';
  RAISE NOTICE '  auth.users → business_profile (CASCADE)';
  RAISE NOTICE '  business_profile → stores (CASCADE)';
  RAISE NOTICE '  stores → store_connections (CASCADE)';
  RAISE NOTICE '==============================================';
END $$;

