-- ================================
-- Add Platform Field to Stores Table
-- ================================
-- This migration adds a platform field to the stores table
-- to indicate which e-commerce platform the store is from

-- ================================
-- Step 1: Create Platform Enum Type
-- ================================
DO $$ BEGIN
    CREATE TYPE store_platform AS ENUM ('salla', 'zid', 'shopify', 'woocommerce', 'haady');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE store_platform IS 'E-commerce platform types: Salla, Zid, Shopify, WooCommerce, or Haady';

-- ================================
-- Step 2: Check if platform column exists and handle accordingly
-- ================================
DO $$ 
BEGIN
    -- Check if platform column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stores' 
        AND column_name = 'platform'
    ) THEN
        -- Column exists, drop it first to recreate with correct type
        ALTER TABLE public.stores DROP COLUMN IF EXISTS platform;
    END IF;
    
    -- Add the column with the correct enum type
    -- Default to 'haady' for standalone stores (stores without connections)
    ALTER TABLE public.stores 
    ADD COLUMN platform store_platform DEFAULT 'haady';
END $$;

COMMENT ON COLUMN public.stores.platform IS 'E-commerce platform the store is connected to (Salla, Zid, Shopify, WooCommerce, or Haady)';

-- ================================
-- Step 3: Create index for faster lookups
-- ================================
CREATE INDEX IF NOT EXISTS idx_stores_platform ON public.stores(platform);

-- ================================
-- Step 4: Backfill platform from store_connections
-- ================================
-- Update existing stores with platform from their linked store_connections
-- Convert text platform to enum
UPDATE public.stores s
SET platform = CASE 
    WHEN sc.platform = 'salla' THEN 'salla'::store_platform
    WHEN sc.platform = 'zid' THEN 'zid'::store_platform
    WHEN sc.platform = 'shopify' THEN 'shopify'::store_platform
    WHEN sc.platform = 'woocommerce' THEN 'woocommerce'::store_platform
    WHEN sc.platform = 'haady' THEN 'haady'::store_platform
    ELSE NULL
END
FROM public.store_connections sc
WHERE s.store_connection_id = sc.id
  AND s.platform IS NULL
  AND sc.platform IS NOT NULL;

-- ================================
-- Step 5: Set platform to 'haady' for stores without connections
-- ================================
-- Update stores without store_connection_id to have 'haady' platform
UPDATE public.stores
SET platform = 'haady'
WHERE store_connection_id IS NULL
  AND platform IS NULL;

-- ================================
-- Step 6: Add constraint/trigger to ensure platform logic
-- ================================
-- Note: Application logic ensures:
-- - Stores with store_connection_id get platform from connection
-- - Stores without store_connection_id default to 'haady'

