-- ====================================================================
-- UPDATE JOYFUL GIFTING CATEGORIES IMAGES AND HOVER IMAGES
-- Description: Update image URLs and hover image URLs for all main categories under "Joyful Gifting"
-- Date: January 2025
-- ====================================================================

-- Update Fashion category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-18-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-1-min.png',
    updated_at = NOW()
WHERE slug = 'fashion' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Electronics category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-14-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-5-min.png',
    updated_at = NOW()
WHERE slug = 'electronics' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Accessories & Jewelry category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-2-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-17-min.png',
    updated_at = NOW()
WHERE slug = 'accessories-jewelry' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Beauty & Health category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-7-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-12-min.png',
    updated_at = NOW()
WHERE slug = 'beauty-health' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Home & Appliances category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-20-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-21-min.png',
    updated_at = NOW()
WHERE slug = 'home-appliances' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Gaming category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-9-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-10-min.png',
    updated_at = NOW()
WHERE slug = 'gaming' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Fragrances & Oud category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-8-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-11-min.png',
    updated_at = NOW()
WHERE slug = 'fragrances-oud' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Health & Nutrition category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-3-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-16-min.png',
    updated_at = NOW()
WHERE slug = 'health-nutrition' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Self Care category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-22.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-23.png',
    updated_at = NOW()
WHERE slug = 'self-care' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Luxury category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-4-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-13-min.png',
    updated_at = NOW()
WHERE slug = 'luxury' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Fitness & Outdoor category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-24.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-19-min.png',
    updated_at = NOW()
WHERE slug = 'fitness-outdoor' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Update Baby & Toys category image and hover image
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/baby-min.png',
    hover_image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/cat-6-min.png',
    updated_at = NOW()
WHERE slug = 'baby-toys' 
  AND level = 1
  AND parent_id IN (SELECT id FROM categories WHERE slug = 'joyful-gifting' AND level = 0);

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug IN ('fashion', 'electronics', 'accessories-jewelry', 'beauty-health', 'home-appliances', 'gaming', 'fragrances-oud', 'health-nutrition', 'self-care', 'luxury', 'fitness-outdoor', 'baby-toys')
    AND level = 1
    AND image_url IS NOT NULL
    AND hover_image_url IS NOT NULL
    AND image_url LIKE 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/categories/%';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Joyful Gifting categories images and hover images updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with updated images and hover images: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Updated categories:';
  RAISE NOTICE '   - Fashion: cat-18-min.png → cat-1-min.png';
  RAISE NOTICE '   - Electronics: cat-14-min.png → cat-5-min.png';
  RAISE NOTICE '   - Accessories & Jewelry: cat-2-min.png → cat-17-min.png';
  RAISE NOTICE '   - Beauty & Health: cat-7-min.png → cat-12-min.png';
  RAISE NOTICE '   - Home & Appliances: cat-20-min.png → cat-21-min.png';
  RAISE NOTICE '   - Gaming: cat-9-min.png → cat-10-min.png';
  RAISE NOTICE '   - Fragrances & Oud: cat-8-min.png → cat-11-min.png';
  RAISE NOTICE '   - Health & Nutrition: cat-3-min.png → cat-16-min.png';
  RAISE NOTICE '   - Self Care: cat-22.png → cat-23.png';
  RAISE NOTICE '   - Luxury: cat-4-min.png → cat-13-min.png';
  RAISE NOTICE '   - Fitness & Outdoor: cat-24.png → cat-19-min.png';
  RAISE NOTICE '   - Baby & Toys: baby-min.png → cat-6-min.png';
  RAISE NOTICE '';
END $$;

