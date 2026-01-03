-- ====================================================================
-- UPDATE STREAMING SUBSCRIPTIONS CATEGORY IMAGE
-- Description: Update image URL for the "Streaming Subscriptions" category under Digital Surprises
-- Date: February 2025
-- ====================================================================

-- Update Streaming Subscriptions category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/disney-gift.png',
    updated_at = NOW()
WHERE slug = 'streaming-subscriptions' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'digital-surprises' AND level = 0);

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'streaming-subscriptions' 
    AND level = 1
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/disney-gift.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Streaming Subscriptions category image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

