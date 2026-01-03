-- ====================================================================
-- UPDATE TASTES & TREATS CATEGORIES IMAGES
-- Description: Update image URLs for all main categories under "Tastes & Treats"
-- Date: February 2025
-- ====================================================================

-- Update Treats & Meals category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/Burger-min.png',
    updated_at = NOW()
WHERE slug = 'treats-meals' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Chocolates & Sweets category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/Candy-min.png',
    updated_at = NOW()
WHERE slug = 'chocolates-sweets' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Coffee & Drinks category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/dunkin_1-min.png',
    updated_at = NOW()
WHERE slug = 'coffee-drinks' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Snacks & Bites category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cinnabon-min.png',
    updated_at = NOW()
WHERE slug = 'snacks-bites' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Dates & Traditional Treats category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/Baklava-min.png',
    updated_at = NOW()
WHERE slug = 'dates-traditional-treats' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Specialty Picks category image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/coffee_capsul-min.png',
    updated_at = NOW()
WHERE slug = 'specialty-picks' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug IN ('treats-meals', 'chocolates-sweets', 'coffee-drinks', 'snacks-bites', 'dates-traditional-treats', 'specialty-picks')
    AND level = 1
    AND image_url LIKE 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/%';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tastes & Treats categories images updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with updated images: %', v_count;
  RAISE NOTICE '';
END $$;

