-- ================================
-- Store Connections Table
-- ================================
-- This table stores OAuth connections to external e-commerce platforms
-- (Salla, Zid, Shopify, etc.)

CREATE TABLE IF NOT EXISTS public.store_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'salla', 'zid', 'shopify', etc.
  access_token text NOT NULL, -- OAuth access token (consider encrypting in production)
  refresh_token text, -- OAuth refresh token (consider encrypting in production)
  expires_at timestamptz, -- When the access token expires
  token_type text DEFAULT 'Bearer',
  store_id text, -- Store ID from the platform
  store_name text, -- Store name from the platform
  store_domain text, -- Store domain/URL from the platform
  is_active boolean DEFAULT true,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one connection per user per platform
  UNIQUE(user_id, platform)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_connections_user_id ON public.store_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_store_connections_platform ON public.store_connections(platform);
CREATE INDEX IF NOT EXISTS idx_store_connections_active ON public.store_connections(is_active) WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE public.store_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own connections
CREATE POLICY "Users can view their own store connections"
  ON public.store_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own connections
CREATE POLICY "Users can insert their own store connections"
  ON public.store_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own connections
CREATE POLICY "Users can update their own store connections"
  ON public.store_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own connections
CREATE POLICY "Users can delete their own store connections"
  ON public.store_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.store_connections IS 'Stores OAuth connections to external e-commerce platforms';
COMMENT ON COLUMN public.store_connections.platform IS 'Platform identifier: salla, zid, shopify, etc.';
COMMENT ON COLUMN public.store_connections.access_token IS 'OAuth access token - should be encrypted in production';
COMMENT ON COLUMN public.store_connections.refresh_token IS 'OAuth refresh token - should be encrypted in production';

