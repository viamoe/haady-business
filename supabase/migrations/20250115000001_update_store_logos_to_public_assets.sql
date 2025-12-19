-- ================================
-- Update Store Logos to Use public_assets Bucket
-- ================================
-- This migration updates the storage structure to use public_assets bucket
-- with store-logos as a folder inside it

-- ================================
-- Step 1: Create public_assets bucket if it doesn't exist
-- ================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public_assets', 'public_assets', true)
ON CONFLICT (id) DO NOTHING;

-- ================================
-- Step 2: Drop old policies for store-logos bucket
-- ================================
DROP POLICY IF EXISTS "Store logos are public" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own store logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own store logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own store logos" ON storage.objects;

-- ================================
-- Step 3: Create new policies for public_assets bucket
-- ================================

-- POLICY: Everyone can view store logos (Public Read)
-- Path structure: public_assets/store-logos/{user_id}/{connection_id}/filename
CREATE POLICY "Store logos are public" 
ON storage.objects FOR SELECT 
USING ( 
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'store-logos'
);

-- POLICY: Users can upload their own store logos
-- Restricts upload to: public_assets/store-logos/{user_id}/{connection_id}/filename
CREATE POLICY "Users can upload their own store logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'store-logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- POLICY: Users can update their own store logos
CREATE POLICY "Users can update their own store logos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'store-logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- POLICY: Users can delete their own store logos
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

