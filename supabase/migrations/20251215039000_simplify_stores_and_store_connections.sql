-- ================================
-- Simplify stores and store_connections relationship
-- ================================
-- Description: Removes duplicated fields and makes stores the source of truth.
--              store_connections now only stores OAuth/API data.
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Add store_id to store_connections (reverse relationship)
-- =====================================================

-- Add store_id column to store_connections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'store_id'
  ) THEN
    ALTER TABLE public.store_connections 
    ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_store_connections_store_id 
    ON public.store_connections(store_id);
    
    RAISE NOTICE 'Added store_id column to store_connections';
  ELSE
    RAISE NOTICE 'store_id column already exists in store_connections';
  END IF;
END $$;

-- =====================================================
-- PART 2: Migrate existing relationships
-- =====================================================

-- Update store_connections.store_id from stores.store_connection_id
DO $$
BEGIN
  UPDATE public.store_connections sc
  SET store_id = s.id
  FROM public.stores s
  WHERE s.store_connection_id = sc.id
    AND sc.store_id IS NULL;
  
  RAISE NOTICE 'Migrated store relationships';
END $$;

-- =====================================================
-- PART 3: Remove duplicated fields from store_connections
-- =====================================================

-- Drop old RLS policies that reference user_id (will recreate them later)
DROP POLICY IF EXISTS "Users can view their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can insert their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can update their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can delete their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users view own connections" ON public.store_connections;

-- Drop indexes that reference columns we're removing
DROP INDEX IF EXISTS public.idx_store_connections_user_id;
DROP INDEX IF EXISTS public.idx_store_connections_platform;
DROP INDEX IF EXISTS public.idx_store_connections_active;
DROP INDEX IF EXISTS public.idx_store_connections_sync_status;
DROP INDEX IF EXISTS public.idx_store_connections_connection_status;

-- Drop unique constraint on (user_id, platform) since we're removing user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%user_id%platform%' 
    AND conrelid = 'public.store_connections'::regclass
  ) THEN
    ALTER TABLE public.store_connections 
    DROP CONSTRAINT IF EXISTS store_connections_user_id_platform_key;
    RAISE NOTICE 'Dropped unique constraint on (user_id, platform)';
  END IF;
END $$;

-- Remove duplicated columns
DO $$
BEGIN
  ALTER TABLE public.store_connections 
    DROP COLUMN IF EXISTS user_id,
    DROP COLUMN IF EXISTS platform,
    DROP COLUMN IF EXISTS store_name,
    DROP COLUMN IF EXISTS store_logo_url,
    DROP COLUMN IF EXISTS logo_zoom,
    DROP COLUMN IF EXISTS is_active;
  
  RAISE NOTICE 'Removed duplicated fields from store_connections';
END $$;

-- =====================================================
-- PART 4: Remove store_connection_id from stores
-- =====================================================

-- Drop the foreign key and column from stores
DO $$
BEGIN
  ALTER TABLE public.stores 
    DROP CONSTRAINT IF EXISTS stores_store_connection_id_fkey,
    DROP COLUMN IF EXISTS store_connection_id;
  
  DROP INDEX IF EXISTS public.idx_stores_store_connection_id;
  DROP INDEX IF EXISTS public.idx_stores_unique_connection;
  
  RAISE NOTICE 'Removed store_connection_id from stores';
END $$;

-- =====================================================
-- PART 5: Add unique constraint to ensure one connection per store
-- =====================================================

-- Ensure one store_connection per store
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_store_connections_unique_store 
  ON public.store_connections(store_id) 
  WHERE store_id IS NOT NULL;
  
  RAISE NOTICE 'Created unique constraint: one connection per store';
END $$;

-- =====================================================
-- PART 6: Update RLS policies for store_connections
-- =====================================================

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can insert their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can update their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can delete their own store connections" ON public.store_connections;

-- New RLS policies based on stores.business_id
ALTER TABLE public.store_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view store_connections for their stores
CREATE POLICY "Users can view store connections for their stores"
  ON public.store_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = store_connections.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert store_connections for their stores
CREATE POLICY "Users can insert store connections for their stores"
  ON public.store_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = store_connections.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update store_connections for their stores
CREATE POLICY "Users can update store connections for their stores"
  ON public.store_connections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = store_connections.store_id
        AND bp.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = store_connections.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can delete store_connections for their stores
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

-- =====================================================
-- PART 7: Add comments
-- =====================================================

COMMENT ON TABLE public.store_connections IS 'OAuth/API connection data for external e-commerce platforms. Links to stores table via store_id.';
COMMENT ON COLUMN public.store_connections.store_id IS 'Reference to the store this connection belongs to. NULL for connections not yet linked to a store.';
COMMENT ON COLUMN public.stores.platform IS 'E-commerce platform: salla, shopify, zid, woocommerce, or haady. Source of truth for platform.';
COMMENT ON COLUMN public.stores.is_active IS 'Whether the store is active. Source of truth for store status.';

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Stores and store_connections simplified!';
  RAISE NOTICE '==============================================';
END $$;

