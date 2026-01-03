-- ====================================================================
-- CREATE PLATFORM-WIDE BRANDS SYSTEM
-- Description: Creates brands table for platform-wide brand management
--              Brands are managed by admins, store owners assign them to products
-- Date: February 2025
-- ====================================================================

-- Step 1: Create brands table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  name TEXT NOT NULL,
  name_ar TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  description_ar TEXT,
  logo_url TEXT,
  
  -- Brand identity
  website_url TEXT,
  social_links JSONB DEFAULT '{}', -- {instagram, twitter, facebook, linkedin, tiktok}
  brand_colors JSONB DEFAULT '{}', -- {primary: "#FF5733", secondary: "#33FF57"}
  
  -- Metadata
  country_of_origin TEXT,
  founded_year INTEGER,
  brand_story TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT brands_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT brands_slug_not_empty CHECK (LENGTH(TRIM(slug)) > 0),
  CONSTRAINT brands_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- Step 2: Enable pg_trgm extension for fuzzy search (must be before index creation)
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 3: Create indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON public.brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brands_is_featured ON public.brands(is_featured);
CREATE INDEX IF NOT EXISTS idx_brands_sort_order ON public.brands(sort_order);
CREATE INDEX IF NOT EXISTS idx_brands_name_trgm ON public.brands USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_brands_tags ON public.brands USING gin(tags);

-- Step 4: Add brand_id to products table
-- ====================================================================
DO $$
BEGIN
  -- Check if brand_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
    
    RAISE NOTICE 'Added brand_id column to products table';
  ELSE
    RAISE NOTICE 'brand_id column already exists in products table';
  END IF;
END $$;

-- Step 5: Add RLS policies
-- ====================================================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Everyone can read active brands
CREATE POLICY "Brands are viewable by everyone"
  ON public.brands FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Authenticated users can view all brands (for product assignment)
CREATE POLICY "Authenticated users can view all brands"
  ON public.brands FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users with business_profile can manage brands
-- For now, allow all authenticated users to manage brands
-- TODO: Add admin role check when admin system is implemented
CREATE POLICY "Brands are manageable by authenticated users"
  ON public.brands FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 6: Add comments
-- ====================================================================
COMMENT ON TABLE public.brands IS 'Platform-wide brand catalog managed by admins. Store owners assign brands to products.';
COMMENT ON COLUMN public.brands.name IS 'Brand name (English)';
COMMENT ON COLUMN public.brands.name_ar IS 'Brand name (Arabic)';
COMMENT ON COLUMN public.brands.slug IS 'URL-friendly identifier, must be unique';
COMMENT ON COLUMN public.brands.description IS 'Brand description/slogan (English)';
COMMENT ON COLUMN public.brands.description_ar IS 'Brand description/slogan (Arabic)';
COMMENT ON COLUMN public.brands.logo_url IS 'URL to brand logo image';
COMMENT ON COLUMN public.brands.website_url IS 'Official brand website URL';
COMMENT ON COLUMN public.brands.social_links IS 'JSON object with social media links: {instagram, twitter, facebook, linkedin, tiktok}';
COMMENT ON COLUMN public.brands.brand_colors IS 'JSON object with brand colors: {primary: "#hex", secondary: "#hex"}';
COMMENT ON COLUMN public.brands.country_of_origin IS 'Country where the brand originates';
COMMENT ON COLUMN public.brands.founded_year IS 'Year the brand was founded';
COMMENT ON COLUMN public.brands.brand_story IS 'Extended brand story/background';
COMMENT ON COLUMN public.brands.is_active IS 'Whether the brand is active and visible';
COMMENT ON COLUMN public.brands.is_featured IS 'Whether to feature this brand prominently';
COMMENT ON COLUMN public.brands.is_verified IS 'Whether the brand is verified (badge)';
COMMENT ON COLUMN public.brands.sort_order IS 'Custom sort order for display';
COMMENT ON COLUMN public.brands.meta_title IS 'SEO meta title';
COMMENT ON COLUMN public.brands.meta_description IS 'SEO meta description';
COMMENT ON COLUMN public.brands.tags IS 'Array of tags for filtering and search';

-- Step 7: Create updated_at trigger
-- ====================================================================
CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION update_brands_updated_at();

-- Step 8: Create function to generate slug from name
-- ====================================================================
CREATE OR REPLACE FUNCTION generate_brand_slug(brand_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  base_slug := LOWER(REGEXP_REPLACE(brand_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'brand-' || EXTRACT(EPOCH FROM NOW())::TEXT;
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.brands WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Success message
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Brands system created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Next steps:';
  RAISE NOTICE '   1. Create brand management UI for admins';
  RAISE NOTICE '   2. Add autocomplete brand selector to product form';
  RAISE NOTICE '   3. Seed some initial brands';
  RAISE NOTICE '';
END $$;

