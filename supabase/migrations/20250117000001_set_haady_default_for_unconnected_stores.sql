-- ================================
-- Set Haady Platform Default for Unconnected Stores
-- ================================
-- This migration ensures that stores without connections default to 'haady' platform

-- ================================
-- Step 1: Update existing stores without connections to 'haady'
-- ================================
UPDATE public.stores
SET platform = 'haady'
WHERE store_connection_id IS NULL
  AND (platform IS NULL OR platform != 'haady');

-- ================================
-- Step 2: Set default value for platform column
-- ================================
-- Change default to 'haady' for new stores without connections
ALTER TABLE public.stores 
ALTER COLUMN platform SET DEFAULT 'haady';

COMMENT ON COLUMN public.stores.platform IS 'E-commerce platform the store is connected to. Defaults to ''haady'' for standalone stores without connections.';

