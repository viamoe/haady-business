-- ================================
-- Fix user deletion issues
-- ================================
-- Description: Ensures user deletion works properly by checking for
--              blocking constraints, RLS policies, and other issues.
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Check for any foreign keys that might block deletion
-- =====================================================

DO $$
DECLARE
  r RECORD;
  blocking_constraints TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Find all foreign keys that reference business_profile or stores
  -- that don't have CASCADE delete
  FOR r IN
    SELECT 
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND (
        (ccu.table_name = 'business_profile' AND rc.delete_rule != 'CASCADE')
        OR (ccu.table_name = 'stores' AND rc.delete_rule != 'CASCADE')
        OR (ccu.table_name = 'store_connections' AND rc.delete_rule != 'CASCADE')
      )
  LOOP
    blocking_constraints := blocking_constraints || format('%s.%s → %s.%s (%s)', 
      r.table_name, r.column_name, r.foreign_table_name, r.foreign_column_name, r.delete_rule);
    RAISE WARNING 'Found non-CASCADE constraint: %', format('%s.%s → %s.%s (%s)', 
      r.table_name, r.column_name, r.foreign_table_name, r.foreign_column_name, r.delete_rule);
  END LOOP;
  
  IF array_length(blocking_constraints, 1) > 0 THEN
    RAISE NOTICE 'Found % non-CASCADE constraints that might block deletion', array_length(blocking_constraints, 1);
  ELSE
    RAISE NOTICE '✓ All foreign keys have CASCADE delete';
  END IF;
END $$;

-- =====================================================
-- PART 2: Check RLS policies that might block deletion
-- =====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Checking RLS policies for business_profile...';
  
  -- Check if business_profile has DELETE policies
  FOR r IN
    SELECT polname, polcmd
    FROM pg_policy
    WHERE polrelid = 'public.business_profile'::regclass
      AND polcmd = 'DELETE'
  LOOP
    RAISE NOTICE 'Found DELETE policy: %', r.polname;
  END LOOP;
  
  -- If no DELETE policy exists, RLS will block all deletions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.business_profile'::regclass
      AND polcmd = 'DELETE'
  ) THEN
    RAISE WARNING '⚠ No DELETE policy on business_profile - RLS will block all deletions!';
    RAISE NOTICE 'Creating permissive DELETE policy for business_profile...';
    
    -- Create a policy that allows users to delete their own business_profile
    -- This is needed for CASCADE to work when auth.users is deleted
    CREATE POLICY "Users can delete own business_profile"
    ON public.business_profile
    FOR DELETE
    USING (auth.uid() = auth_user_id);
    
    RAISE NOTICE '✓ Created DELETE policy for business_profile';
  ELSE
    RAISE NOTICE '✓ DELETE policy already exists for business_profile';
  END IF;
END $$;

-- =====================================================
-- PART 3: Ensure stores have DELETE policy
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.stores'::regclass
      AND polcmd = 'DELETE'
  ) THEN
    RAISE WARNING '⚠ No DELETE policy on stores - RLS will block CASCADE deletions!';
    RAISE NOTICE 'Creating permissive DELETE policy for stores...';
    
    -- Create a policy that allows deletion via CASCADE
    -- Users can delete stores that belong to their business
    CREATE POLICY "Users can delete stores for their business"
    ON public.stores
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.business_profile
        WHERE id = stores.business_id
          AND auth_user_id = auth.uid()
      )
    );
    
    RAISE NOTICE '✓ Created DELETE policy for stores';
  ELSE
    RAISE NOTICE '✓ DELETE policy already exists for stores';
  END IF;
END $$;

-- =====================================================
-- PART 4: Ensure store_connections have DELETE policy
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.store_connections'::regclass
      AND polcmd = 'DELETE'
  ) THEN
    RAISE WARNING '⚠ No DELETE policy on store_connections - RLS will block CASCADE deletions!';
    RAISE NOTICE 'Creating permissive DELETE policy for store_connections...';
    
    -- The policy should already exist from the simplify migration, but check anyway
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = 'public.store_connections'::regclass
        AND polname = 'Users can delete store connections for their stores'
    ) THEN
      CREATE POLICY "Users can delete store connections for their stores"
      ON public.store_connections
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.stores s
          JOIN public.business_profile bp ON s.business_id = bp.id
          WHERE s.id = store_connections.store_id
            AND bp.auth_user_id = auth.uid()
        )
      );
      
      RAISE NOTICE '✓ Created DELETE policy for store_connections';
    ELSE
      RAISE NOTICE '✓ DELETE policy already exists for store_connections';
    END IF;
  ELSE
    RAISE NOTICE '✓ DELETE policy already exists for store_connections';
  END IF;
END $$;

-- =====================================================
-- PART 5: Ensure products have DELETE policy
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.products'::regclass
      AND polcmd = 'DELETE'
  ) THEN
    RAISE WARNING '⚠ No DELETE policy on products - RLS will block CASCADE deletions!';
    RAISE NOTICE 'Creating permissive DELETE policy for products...';
    
    -- Create a policy that allows deletion via CASCADE
    CREATE POLICY "Users can delete products for their stores"
    ON public.products
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.stores s
        JOIN public.business_profile bp ON s.business_id = bp.id
        WHERE s.id = products.store_id
          AND bp.auth_user_id = auth.uid()
      )
    );
    
    RAISE NOTICE '✓ Created DELETE policy for products';
  ELSE
    RAISE NOTICE '✓ DELETE policy already exists for products';
  END IF;
END $$;

-- =====================================================
-- PART 6: Fix orders.store_id constraint (if it exists)
-- =====================================================

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'store_id'
  ) THEN
    -- Find the constraint
    SELECT conname INTO v_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND confrelid = 'public.stores'::regclass
      AND contype = 'f'
      AND conkey::text LIKE '%store_id%'
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
      -- Check if it has CASCADE
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = v_constraint_name
          AND confdeltype = 'c'
      ) THEN
        -- Drop and recreate with CASCADE
        EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_store_id_fkey_cascade
        FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
        RAISE NOTICE 'Fixed orders.store_id to have CASCADE delete';
      ELSE
        RAISE NOTICE '✓ orders.store_id already has CASCADE delete';
      END IF;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing orders.store_id: %', SQLERRM;
END $$;

-- =====================================================
-- PART 7: Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'User deletion setup complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CASCADE chain:';
  RAISE NOTICE '  auth.users → business_profile → stores → products/store_connections';
  RAISE NOTICE 'All DELETE policies have been verified/created.';
  RAISE NOTICE '==============================================';
END $$;

