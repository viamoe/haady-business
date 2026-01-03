-- ====================================================================
-- UPDATE DIGITAL SURPRISES CATEGORY TYPE IMAGE
-- Description: Update image URL for the "Digital Surprises" category type
-- Date: February 2025
-- ====================================================================

-- Update all categories matching digital-surprises
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/apple-card.png',
    updated_at = NOW()
WHERE slug = 'digital-surprises';

-- Also update by category_type if slug doesn't match
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/apple-card.png',
    updated_at = NOW()
WHERE category_type = 'digital_surprises' 
  AND level = 0
  AND image_url IS DISTINCT FROM 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/apple-card.png';

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'digital-surprises' 
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/apple-card.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Digital Surprises category type image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

