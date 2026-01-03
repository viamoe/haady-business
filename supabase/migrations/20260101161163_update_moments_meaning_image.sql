-- ====================================================================
-- UPDATE MOMENTS & MEANING CATEGORY TYPE IMAGE
-- Description: Update image URL for the "Moments & Meaning" category type
-- Date: February 2025
-- ====================================================================

-- Update all categories matching moments-meaning
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/moments.png',
    updated_at = NOW()
WHERE slug = 'moments-meaning';

-- Also update by category_type if slug doesn't match
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/moments.png',
    updated_at = NOW()
WHERE category_type = 'moments_meaning' 
  AND level = 0
  AND image_url IS DISTINCT FROM 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/moments.png';

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'moments-meaning' 
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/moments.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Moments & Meaning category type image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

