-- ================================
-- Ensure all foreign keys have CASCADE delete
-- ================================
-- Description: Verifies and fixes all foreign key constraints to ensure
--              CASCADE delete works properly when deleting users.
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Check and fix products.store_id foreign key
-- =====================================================

DO $$
DECLARE
  v_constraint_name TEXT;
  v_has_cascade BOOLEAN := false;
BEGIN
  -- Find the foreign key constraint on products.store_id
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.products'::regclass
    AND confrelid = 'public.stores'::regclass
    AND contype = 'f'
    AND conkey::text LIKE '%store_id%'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    -- Check if it has CASCADE
    SELECT confdeltype = 'c' INTO v_has_cascade
    FROM pg_constraint
    WHERE conname = v_constraint_name;

    IF NOT v_has_cascade THEN
      -- Drop and recreate with CASCADE
      EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
      ALTER TABLE public.products
      ADD CONSTRAINT products_store_id_fkey_cascade
      FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
      RAISE NOTICE 'Updated products.store_id to have CASCADE delete';
    ELSE
      RAISE NOTICE '✓ products.store_id already has CASCADE delete';
    END IF;
  ELSE
    -- Create constraint with CASCADE
    ALTER TABLE public.products
    ADD CONSTRAINT products_store_id_fkey_cascade
    FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
    RAISE NOTICE 'Created products.store_id CASCADE delete constraint';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating products.store_id: %', SQLERRM;
END $$;

-- =====================================================
-- PART 2: Check and fix orders.store_id foreign key (if exists)
-- =====================================================

DO $$
DECLARE
  v_constraint_name TEXT;
  v_has_cascade BOOLEAN := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'store_id'
  ) THEN
    -- Find the foreign key constraint on orders.store_id
    SELECT conname INTO v_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND confrelid = 'public.stores'::regclass
      AND contype = 'f'
      AND conkey::text LIKE '%store_id%'
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
      -- Check if it has CASCADE
      SELECT confdeltype = 'c' INTO v_has_cascade
      FROM pg_constraint
      WHERE conname = v_constraint_name;

      IF NOT v_has_cascade THEN
        -- Drop and recreate with CASCADE
        EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_store_id_fkey_cascade
        FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
        RAISE NOTICE 'Updated orders.store_id to have CASCADE delete';
      ELSE
        RAISE NOTICE '✓ orders.store_id already has CASCADE delete';
      END IF;
    ELSE
      -- Create constraint with CASCADE
      ALTER TABLE public.orders
      ADD CONSTRAINT orders_store_id_fkey_cascade
      FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
      RAISE NOTICE 'Created orders.store_id CASCADE delete constraint';
    END IF;
  ELSE
    RAISE NOTICE 'orders.store_id column does not exist, skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating orders.store_id: %', SQLERRM;
END $$;

-- =====================================================
-- PART 3: Check and fix orders.business_id foreign key (if exists)
-- =====================================================

DO $$
DECLARE
  v_constraint_name TEXT;
  v_has_cascade BOOLEAN := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'business_id'
  ) THEN
    -- Find the foreign key constraint on orders.business_id
    SELECT conname INTO v_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND confrelid = 'public.business_profile'::regclass
      AND contype = 'f'
      AND conkey::text LIKE '%business_id%'
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
      -- Check if it has CASCADE
      SELECT confdeltype = 'c' INTO v_has_cascade
      FROM pg_constraint
      WHERE conname = v_constraint_name;

      IF NOT v_has_cascade THEN
        -- Drop and recreate with CASCADE
        EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_business_id_fkey_cascade
        FOREIGN KEY (business_id) REFERENCES public.business_profile(id) ON DELETE CASCADE;
        RAISE NOTICE 'Updated orders.business_id to have CASCADE delete';
      ELSE
        RAISE NOTICE '✓ orders.business_id already has CASCADE delete';
      END IF;
    ELSE
      -- Create constraint with CASCADE
      ALTER TABLE public.orders
      ADD CONSTRAINT orders_business_id_fkey_cascade
      FOREIGN KEY (business_id) REFERENCES public.business_profile(id) ON DELETE CASCADE;
      RAISE NOTICE 'Created orders.business_id CASCADE delete constraint';
    END IF;
  ELSE
    RAISE NOTICE 'orders.business_id column does not exist, skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating orders.business_id: %', SQLERRM;
END $$;

-- =====================================================
-- PART 4: Check and fix products.business_id foreign key (if exists)
-- =====================================================

DO $$
DECLARE
  v_constraint_name TEXT;
  v_has_cascade BOOLEAN := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'business_id'
  ) THEN
    -- Find the foreign key constraint on products.business_id
    SELECT conname INTO v_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND confrelid = 'public.business_profile'::regclass
      AND contype = 'f'
      AND conkey::text LIKE '%business_id%'
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
      -- Check if it has CASCADE
      SELECT confdeltype = 'c' INTO v_has_cascade
      FROM pg_constraint
      WHERE conname = v_constraint_name;

      IF NOT v_has_cascade THEN
        -- Drop and recreate with CASCADE
        EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
        ALTER TABLE public.products
        ADD CONSTRAINT products_business_id_fkey_cascade
        FOREIGN KEY (business_id) REFERENCES public.business_profile(id) ON DELETE CASCADE;
        RAISE NOTICE 'Updated products.business_id to have CASCADE delete';
      ELSE
        RAISE NOTICE '✓ products.business_id already has CASCADE delete';
      END IF;
    ELSE
      -- Create constraint with CASCADE
      ALTER TABLE public.products
      ADD CONSTRAINT products_business_id_fkey_cascade
      FOREIGN KEY (business_id) REFERENCES public.business_profile(id) ON DELETE CASCADE;
      RAISE NOTICE 'Created products.business_id CASCADE delete constraint';
    END IF;
  ELSE
    RAISE NOTICE 'products.business_id column does not exist, skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating products.business_id: %', SQLERRM;
END $$;

-- =====================================================
-- PART 5: Verify complete CASCADE chain
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CASCADE delete chain verification:';
  RAISE NOTICE '==============================================';
  
  -- Check auth.users → business_profile
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.business_profile'::regclass
      AND confrelid = 'auth.users'::regclass
      AND confdeltype = 'c'
  ) THEN
    RAISE NOTICE '✓ auth.users → business_profile (CASCADE)';
  ELSE
    RAISE WARNING '✗ auth.users → business_profile (NO CASCADE)';
  END IF;
  
  -- Check business_profile → stores
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stores'::regclass
      AND confrelid = 'public.business_profile'::regclass
      AND confdeltype = 'c'
  ) THEN
    RAISE NOTICE '✓ business_profile → stores (CASCADE)';
  ELSE
    RAISE WARNING '✗ business_profile → stores (NO CASCADE)';
  END IF;
  
  -- Check stores → store_connections
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.store_connections'::regclass
      AND confrelid = 'public.stores'::regclass
      AND confdeltype = 'c'
  ) THEN
    RAISE NOTICE '✓ stores → store_connections (CASCADE)';
  ELSE
    RAISE WARNING '✗ stores → store_connections (NO CASCADE)';
  END IF;
  
  -- Check stores → products
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND confrelid = 'public.stores'::regclass
      AND confdeltype = 'c'
  ) THEN
    RAISE NOTICE '✓ stores → products (CASCADE)';
  ELSE
    RAISE WARNING '✗ stores → products (NO CASCADE)';
  END IF;
  
  RAISE NOTICE '==============================================';
END $$;

