-- ================================
-- Add Store Name and Domain Fields
-- ================================
-- This migration adds store_name and store_domain fields to store_connections
-- if they don't already exist

-- Add store_name column if it doesn't exist
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS store_name text;

-- Add store_domain column if it doesn't exist
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS store_domain text;

-- Add comments
COMMENT ON COLUMN public.store_connections.store_name IS 'Store name from the platform (e.g., from Salla API)';
COMMENT ON COLUMN public.store_connections.store_domain IS 'Store domain/URL from the platform';

