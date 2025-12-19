-- ================================
-- Fix orders.store_id to have CASCADE delete
-- ================================
-- Description: Ensures orders.store_id has CASCADE delete to prevent
--              blocking user deletion.
-- Date: 2025-12-15

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
    ELSE
      -- Create constraint with CASCADE if it doesn't exist
      ALTER TABLE public.orders
      ADD CONSTRAINT orders_store_id_fkey_cascade
      FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;
      RAISE NOTICE 'Created orders.store_id CASCADE delete constraint';
    END IF;
  ELSE
    RAISE NOTICE 'orders.store_id column does not exist, skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing orders.store_id: %', SQLERRM;
END $$;

