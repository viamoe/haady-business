-- ====================================================================
-- FORCE UPDATE JOYFUL GIFTING CATEGORY TYPE IMAGE
-- Description: Force update image URL for the "Joyful Gifting" category type
-- Date: February 2025
-- ====================================================================

-- Update all categories matching joyful-gifting
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/xbox-yellow.png',
    updated_at = NOW()
WHERE slug = 'joyful-gifting';

-- Also update by category_type if slug doesn't match
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/xbox-yellow.png',
    updated_at = NOW()
WHERE category_type = 'joyful_gifting' 
  AND level = 0
  AND image_url IS DISTINCT FROM 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/xbox-yellow.png';

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'joyful-gifting' 
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/xbox-yellow.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Joyful Gifting category type image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

