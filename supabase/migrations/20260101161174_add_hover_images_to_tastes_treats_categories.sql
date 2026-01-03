-- ====================================================================
-- ADD HOVER IMAGES TO TASTES & TREATS CATEGORIES
-- Description: Add hover image URLs for all main categories under "Tastes & Treats"
-- Date: January 2025
-- ====================================================================

-- Update Treats & Meals category hover image
UPDATE public.categories
SET hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/shawarma-min.png',
    updated_at = NOW()
WHERE slug = 'treats-meals' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Chocolates & Sweets category hover image
UPDATE public.categories
SET hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/choco-1-min.png',
    updated_at = NOW()
WHERE slug = 'chocolates-sweets' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Coffee & Drinks category hover image
UPDATE public.categories
SET hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/monster-min.png',
    updated_at = NOW()
WHERE slug = 'coffee-drinks' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Snacks & Bites category hover image
UPDATE public.categories
SET hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/carson-min.png',
    updated_at = NOW()
WHERE slug = 'snacks-bites' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Dates & Traditional Treats category hover image
UPDATE public.categories
SET hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/date-min.png',
    updated_at = NOW()
WHERE slug = 'dates-traditional-treats' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'tastes-treats' AND level = 0);

-- Update Specialty Picks category hover image
UPDATE public.categories
SET hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/matcha-min.png',
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
    AND hover_image_url IS NOT NULL
    AND hover_image_url LIKE 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/%';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tastes & Treats categories hover images added!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with hover images: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Updated categories:';
  RAISE NOTICE '   - Treats & Meals: shawarma-min.png';
  RAISE NOTICE '   - Chocolates & Sweets: choco-1-min.png';
  RAISE NOTICE '   - Coffee & Drinks: monster-min.png';
  RAISE NOTICE '   - Snacks & Bites: carson-min.png';
  RAISE NOTICE '   - Dates & Traditional Treats: date-min.png';
  RAISE NOTICE '   - Specialty Picks: matcha-min.png';
  RAISE NOTICE '';
END $$;

