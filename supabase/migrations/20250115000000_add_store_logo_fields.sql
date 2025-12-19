-- ================================
-- Add Store Logo Fields
-- ================================
-- This migration adds logo_url fields to store_connections and stores tables
-- and creates the store-logos storage bucket

-- ================================
-- Step 1: Add logo_url to store_connections
-- ================================
ALTER TABLE public.store_connections 
ADD COLUMN IF NOT EXISTS store_logo_url text;

COMMENT ON COLUMN public.store_connections.store_logo_url IS 'URL of the custom store logo uploaded by the user';

-- ================================
-- Step 2: Add logo_url to stores
-- ================================
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.stores.logo_url IS 'URL of the custom store logo uploaded by the user';

-- ================================
-- Step 3: Create Storage Bucket (if public_assets doesn't exist)
-- ================================
-- Create public_assets bucket if it doesn't exist (idempotent)
-- Store logos will be stored in public_assets/store-logos/ folder
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public_assets', 'public_assets', true)
ON CONFLICT (id) DO NOTHING;

-- ================================
-- Step 4: RLS Policies for Storage
-- ================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Store logos are public" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own store logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own store logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own store logos" ON storage.objects;

-- ================================
-- Step 5: POLICY: Everyone can view store logos (Public Read)
-- ================================
CREATE POLICY "Store logos are public" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'public_assets' AND (storage.foldername(name))[1] = 'store-logos' );

-- ================================
-- Step 6: POLICY: Users can upload their own store logos
-- ================================
-- Restricts upload to folders: public_assets/store-logos/{user_id}/{connection_id}/filename
CREATE POLICY "Users can upload their own store logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'store-logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- ================================
-- Step 7: POLICY: Users can update their own store logos
-- ================================
CREATE POLICY "Users can update their own store logos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'store-logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- ================================
-- Step 8: POLICY: Users can delete their own store logos
-- ================================
CREATE POLICY "Users can delete their own store logos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'store-logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- ================================
-- Documentation
-- ================================
-- Folder structure:
-- public_assets/
--   store-logos/
--     {user_id}/
--       {connection_id}/
--         {connection_id}-{timestamp}.{ext}
--
-- Example path: public_assets/store-logos/550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174000-1704067200000.png
--
-- Security:
-- - Public read: Anyone can view store logo images in public_assets/store-logos/
-- - User upload: Only to their own folder (public_assets/store-logos/{user_id}/)
-- - User update: Only files in their own folder
-- - User delete: Only files in their own folder

