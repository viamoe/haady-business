-- ================================
-- Allow Multiple Stores Per Platform
-- ================================
-- This migration removes the UNIQUE constraint on (user_id, platform)
-- and adds a new constraint on (user_id, platform, store_external_id)
-- to allow multiple stores from the same platform while preventing duplicates

-- Step 1: Drop the old UNIQUE constraint
ALTER TABLE public.store_connections
DROP CONSTRAINT IF EXISTS store_connections_user_id_platform_key;

-- Step 2: Add new UNIQUE constraint on (user_id, platform, store_external_id)
-- This allows multiple stores from the same platform, but prevents connecting the same store twice
ALTER TABLE public.store_connections
ADD CONSTRAINT store_connections_user_platform_store_unique 
UNIQUE(user_id, platform, store_external_id);

-- Note: If store_external_id is NULL, PostgreSQL will allow multiple NULL values
-- This is expected behavior - if a store doesn't have an external ID, we can have multiple connections
-- You may want to handle this case in your application logic

