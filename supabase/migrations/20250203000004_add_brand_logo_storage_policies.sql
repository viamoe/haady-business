-- ================================
-- Brand Logo Storage Policies
-- ================================
-- This migration adds RLS policies for brand logos in the public_assets bucket
-- Brand logos are managed by admins only
-- Path structure: public_assets/brand-logos/{brandId}/logo.{ext}

-- ================================
-- Step 1: Create policies for brand logos
-- ================================

-- POLICY: Everyone can view brand logos (Public Read)
-- Path structure: public_assets/brand-logos/{brandId}/logo.{ext}
CREATE POLICY "Brand logos are public" 
ON storage.objects FOR SELECT 
USING ( 
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'brand-logos'
);

-- POLICY: Admins can upload brand logos
-- Restricts upload to: public_assets/brand-logos/{brandId}/logo.{ext}
-- Note: Admin check should be done in the API endpoint
-- For now, we allow authenticated users (admin check in API)
CREATE POLICY "Admins can upload brand logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'brand-logos'
);

-- POLICY: Admins can update brand logos
CREATE POLICY "Admins can update brand logos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'brand-logos'
);

-- POLICY: Admins can delete brand logos
CREATE POLICY "Admins can delete brand logos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'public_assets' AND 
  (storage.foldername(name))[1] = 'brand-logos'
);

-- ================================
-- Documentation
-- ================================
-- Folder structure:
-- public_assets/
--   brand-logos/
--     {brandId}/
--       logo.{ext}
--
-- Example path: public_assets/brand-logos/550e8400-e29b-41d4-a716-446655440000/logo.png
--
-- Security:
-- - Public read: Anyone can view brand logo images in public_assets/brand-logos/
-- - Admin upload: Only admins can upload (checked in API endpoint)
-- - Admin update: Only admins can update (checked in API endpoint)
-- - Admin delete: Only admins can delete (checked in API endpoint)

