-- ====================================================================
-- UPDATE JOYFUL GIFTING CATEGORY TYPE IMAGE (FIX)
-- Description: Add image URL for the "Joyful Gifting" category type
-- Date: February 2025
-- ====================================================================

-- Update Joyful Gifting category type image using INSERT ... ON CONFLICT
INSERT INTO public.categories (name, name_ar, slug, level, category_type, icon, image_url, description, description_ar, is_active, is_system, sort_order)
VALUES 
  ('Joyful Gifting', 'الهدايا المبهجة', 'joyful-gifting', 0, 'joyful_gifting', '🎮',
   'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/xbox-yellow.png',
   'Discover fun and exciting gifts that bring joy and happiness',
   'اكتشف الهدايا الممتعة والمثيرة التي تجلب الفرح والسعادة',
   true, true, 1)
ON CONFLICT (slug) 
DO UPDATE SET
  image_url = EXCLUDED.image_url,
  updated_at = NOW();

-- Success message
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Updated Joyful Gifting category type image!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Rows updated: %', updated_count;
  RAISE NOTICE '';
END $$;

