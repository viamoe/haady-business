-- ====================================================================
-- UPDATE TASTES & TREATS CATEGORY TYPE IMAGE
-- Description: Add image URL for the "Tastes & Treats" category type
-- Date: February 2025
-- ====================================================================

-- Update Tastes & Treats category type image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/burger.png',
    updated_at = NOW()
WHERE slug = 'tastes-treats'
  AND level = 0
  AND category_type = 'tastes_treats';

-- Also update by category_type if slug doesn't match
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/burger.png',
    updated_at = NOW()
WHERE category_type = 'tastes_treats' 
  AND level = 0
  AND image_url IS DISTINCT FROM 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/burger.png';

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'tastes-treats' 
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/burger.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tastes & Treats category type image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

