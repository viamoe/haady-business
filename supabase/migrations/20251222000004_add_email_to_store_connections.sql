-- ================================
-- Add email to store_connections
-- ================================
-- Description: Adds email field to store the external platform store email
-- Date: 2025-12-22

-- Add email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.store_connections 
    ADD COLUMN email TEXT;
    
    RAISE NOTICE 'Added email column to store_connections';
  ELSE
    RAISE NOTICE 'email column already exists in store_connections';
  END IF;
END $$;

COMMENT ON COLUMN public.store_connections.email IS 'Email address of the store from the external platform';

