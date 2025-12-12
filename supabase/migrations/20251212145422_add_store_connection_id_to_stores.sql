-- ================================
-- Add store_connection_id to stores table
-- ================================
-- This migration links each store to its store_connection
-- so each connected store has its own separate store record

-- Add store_connection_id column if it doesn't exist
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS store_connection_id uuid REFERENCES public.store_connections(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_store_connection_id ON public.stores(store_connection_id);

-- Add comment
COMMENT ON COLUMN public.stores.store_connection_id IS 'Links the store to its store_connection. Each connection should have its own store.';

-- Add unique constraint to ensure one store per connection
-- This allows multiple stores per merchant, but one per connection
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_unique_connection 
ON public.stores(store_connection_id) 
WHERE store_connection_id IS NOT NULL;

