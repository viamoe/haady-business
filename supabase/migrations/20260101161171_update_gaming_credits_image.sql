-- ====================================================================
-- UPDATE GAMING CREDITS CATEGORY IMAGE
-- Description: Update image URL for the "Gaming Credits" category under Digital Surprises
-- Date: February 2025
-- ====================================================================

-- Update Gaming Credits category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/ps-card.png',
    updated_at = NOW()
WHERE slug = 'gaming-credits' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'digital-surprises' AND level = 0);

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'gaming-credits' 
    AND level = 1
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/ps-card.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Gaming Credits category image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

