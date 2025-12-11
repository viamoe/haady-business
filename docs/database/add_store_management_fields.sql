-- ================================
-- Add Store Management Fields
-- ================================
-- This migration adds fields needed for store management, sync status, and error handling

-- Add connection status field
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS connection_status text DEFAULT 'connected' 
CHECK (connection_status IN ('connected', 'disconnected', 'error', 'expired'));

-- Add sync status field
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'idle' 
CHECK (sync_status IN ('idle', 'syncing', 'success', 'error'));

-- Add last sync timestamp
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;

-- Add last error message
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS last_error text;

-- Add token expiration timestamp (if not exists)
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Add created_at if not exists (for tracking connection date)
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add updated_at if not exists (for tracking last update)
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index for sync status lookups
CREATE INDEX IF NOT EXISTS idx_store_connections_sync_status 
ON public.store_connections(sync_status) 
WHERE sync_status IN ('syncing', 'error');

-- Create index for connection status lookups
CREATE INDEX IF NOT EXISTS idx_store_connections_connection_status 
ON public.store_connections(connection_status) 
WHERE connection_status IN ('error', 'expired');

-- Add comments
COMMENT ON COLUMN public.store_connections.connection_status IS 'Connection health: connected, disconnected, error, expired';
COMMENT ON COLUMN public.store_connections.sync_status IS 'Current sync state: idle, syncing, success, error';
COMMENT ON COLUMN public.store_connections.last_sync_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN public.store_connections.last_error IS 'Last error message if sync or connection failed';
COMMENT ON COLUMN public.store_connections.expires_at IS 'When the access token expires';

