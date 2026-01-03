-- ====================================================================
-- UPDATE FASHION CATEGORY IMAGE
-- Description: Add sneaker image to the Fashion category
-- Date: February 2025
-- ====================================================================

-- Update Fashion category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/sneaker.png',
    updated_at = NOW()
WHERE slug = 'fashion' 
  AND level = 1;

-- Also update by name if slug doesn't match
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/sneaker.png',
    updated_at = NOW()
WHERE name = 'Fashion' 
  AND level = 1
  AND image_url IS DISTINCT FROM 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/sneaker.png';

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'fashion' 
    AND level = 1
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/sneaker.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fashion category image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

