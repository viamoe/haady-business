-- ================================
-- Add external_store_name to store_connections
-- ================================
-- Description: Adds field to store the external platform store name
-- Date: 2025-12-22

-- Add external_store_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'external_store_name'
  ) THEN
    ALTER TABLE public.store_connections 
    ADD COLUMN external_store_name TEXT;
    
    RAISE NOTICE 'Added external_store_name column to store_connections';
  ELSE
    RAISE NOTICE 'external_store_name column already exists in store_connections';
  END IF;
END $$;

COMMENT ON COLUMN public.store_connections.external_store_name IS 'Name of the store from the external platform (Salla, Shopify, Zid, etc.)';

