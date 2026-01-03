-- ====================================================================
-- ADD BACK BRAND FIELDS AND CATEGORY RELATIONSHIP
-- Description: Restore removed fields and add many-to-many category relationship
-- Date: February 2025
-- ====================================================================

-- Step 1: Add back removed columns
-- ====================================================================
DO $$
BEGIN
  -- Add back name_ar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'name_ar'
  ) THEN
    ALTER TABLE public.brands ADD COLUMN name_ar TEXT;
    RAISE NOTICE 'Added name_ar column';
  END IF;

  -- Add back description_ar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'description_ar'
  ) THEN
    ALTER TABLE public.brands ADD COLUMN description_ar TEXT;
    RAISE NOTICE 'Added description_ar column';
  END IF;

  -- Add back is_featured
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.brands ADD COLUMN is_featured BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_featured column';
  END IF;

  -- Add back is_verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE public.brands ADD COLUMN is_verified BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_verified column';
  END IF;

  -- Add back sort_order
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.brands ADD COLUMN sort_order INTEGER DEFAULT 0;
    RAISE NOTICE 'Added sort_order column';
  END IF;

  -- Add back meta_title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'meta_title'
  ) THEN
    ALTER TABLE public.brands ADD COLUMN meta_title TEXT;
    RAISE NOTICE 'Added meta_title column';
  END IF;

  -- Add back meta_description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'meta_description'
  ) THEN
    ALTER TABLE public.brands ADD COLUMN meta_description TEXT;
    RAISE NOTICE 'Added meta_description column';
  END IF;

  -- Add back tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.brands ADD COLUMN tags TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added tags column';
  END IF;
END $$;

-- Step 2: Recreate indexes for restored fields
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_brands_is_featured ON public.brands(is_featured);
CREATE INDEX IF NOT EXISTS idx_brands_sort_order ON public.brands(sort_order);
CREATE INDEX IF NOT EXISTS idx_brands_tags ON public.brands USING gin(tags);

-- Step 3: Create brand_categories junction table (many-to-many)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.brand_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique brand-category pairs
  UNIQUE(brand_id, category_id)
);

-- Create indexes for brand_categories
CREATE INDEX IF NOT EXISTS idx_brand_categories_brand_id ON public.brand_categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_categories_category_id ON public.brand_categories(category_id);

-- Step 4: Add RLS policies for brand_categories
-- ====================================================================
ALTER TABLE public.brand_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read brand categories
CREATE POLICY "Brand categories are viewable by everyone"
  ON public.brand_categories FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only authenticated users can manage brand categories
-- For now, allow all authenticated users
-- TODO: Add admin role check when admin system is implemented
CREATE POLICY "Brand categories are manageable by authenticated users"
  ON public.brand_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 5: Update comments
-- ====================================================================
COMMENT ON TABLE public.brand_categories IS 'Junction table linking brands to categories (many-to-many relationship)';
COMMENT ON COLUMN public.brand_categories.brand_id IS 'Foreign key to brands table';
COMMENT ON COLUMN public.brand_categories.category_id IS 'Foreign key to categories table';
COMMENT ON COLUMN public.brands.name_ar IS 'Brand name (Arabic)';
COMMENT ON COLUMN public.brands.description_ar IS 'Brand description/slogan (Arabic)';
COMMENT ON COLUMN public.brands.is_featured IS 'Whether to feature this brand prominently';
COMMENT ON COLUMN public.brands.is_verified IS 'Whether the brand is verified (badge)';
COMMENT ON COLUMN public.brands.sort_order IS 'Custom sort order for display';
COMMENT ON COLUMN public.brands.meta_title IS 'SEO meta title';
COMMENT ON COLUMN public.brands.meta_description IS 'SEO meta description';
COMMENT ON COLUMN public.brands.tags IS 'Array of tags for filtering and search';

-- Step 6: Success message
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Brand fields restored and category relationship added!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Added fields:';
  RAISE NOTICE '   - name_ar, description_ar';
  RAISE NOTICE '   - is_featured, is_verified, sort_order';
  RAISE NOTICE '   - meta_title, meta_description, tags';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Created brand_categories junction table for many-to-many relationship';
  RAISE NOTICE '';
END $$;

