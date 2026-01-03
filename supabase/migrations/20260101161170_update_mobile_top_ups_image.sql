-- ====================================================================
-- UPDATE MOBILE TOP-UPS CATEGORY IMAGE
-- Description: Update image URL for the "Mobile Top-Ups" category under Digital Surprises
-- Date: February 2025
-- ====================================================================

-- Update Mobile Top-Ups category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/mobile_cards.png',
    updated_at = NOW()
WHERE slug = 'mobile-top-ups' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'digital-surprises' AND level = 0);

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'mobile-top-ups' 
    AND level = 1
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/mobile_cards.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Mobile Top-Ups category image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

