-- ====================================================================
-- SIMPLIFY BRANDS TABLE
-- Description: Remove extra fields, keep only core: name, slug, description, logo
-- Date: February 2025
-- ====================================================================

-- Step 1: Drop columns that are no longer needed
-- ====================================================================
DO $$
BEGIN
  -- Drop columns if they exist
  ALTER TABLE public.brands DROP COLUMN IF EXISTS name_ar;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS description_ar;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS website_url;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS social_links;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS brand_colors;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS country_of_origin;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS founded_year;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS brand_story;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS is_featured;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS is_verified;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS sort_order;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS meta_title;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS meta_description;
  ALTER TABLE public.brands DROP COLUMN IF EXISTS tags;
  
  RAISE NOTICE 'Dropped unnecessary columns from brands table';
END $$;

-- Step 2: Drop indexes that are no longer needed
-- ====================================================================
DROP INDEX IF EXISTS idx_brands_is_featured;
DROP INDEX IF EXISTS idx_brands_sort_order;
DROP INDEX IF EXISTS idx_brands_tags;

-- Step 3: Update comments
-- ====================================================================
COMMENT ON TABLE public.brands IS 'Platform-wide brand catalog managed by admins. Store owners assign brands to products.';
COMMENT ON COLUMN public.brands.name IS 'Brand name';
COMMENT ON COLUMN public.brands.slug IS 'URL-friendly identifier, must be unique';
COMMENT ON COLUMN public.brands.description IS 'Brand description/slogan';
COMMENT ON COLUMN public.brands.logo_url IS 'URL to brand logo image';
COMMENT ON COLUMN public.brands.is_active IS 'Whether the brand is active and visible';

-- Step 4: Success message
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Brands table simplified successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Remaining fields:';
  RAISE NOTICE '   - id (UUID)';
  RAISE NOTICE '   - name (TEXT)';
  RAISE NOTICE '   - slug (TEXT, UNIQUE)';
  RAISE NOTICE '   - description (TEXT)';
  RAISE NOTICE '   - logo_url (TEXT)';
  RAISE NOTICE '   - is_active (BOOLEAN)';
  RAISE NOTICE '   - created_at, updated_at (TIMESTAMPTZ)';
  RAISE NOTICE '';
END $$;

