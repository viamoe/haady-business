-- ====================================================================
-- SEED SAMPLE BRANDS
-- Description: Insert sample brands for testing
-- Date: February 2025
-- ====================================================================

-- Insert popular brands across different categories
-- ====================================================================

-- Electronics & Tech Brands
INSERT INTO public.brands (name, name_ar, slug, description, description_ar, logo_url, is_active, is_featured, is_verified, sort_order, meta_title, meta_description, tags)
VALUES
  ('Apple', 'آبل', 'apple', 'Innovation and design in technology', 'الابتكار والتصميم في التكنولوجيا', 'https://logo.clearbit.com/apple.com', true, true, true, 1, 'Apple Products', 'Discover Apple products and accessories', ARRAY['electronics', 'tech', 'premium']),
  ('Samsung', 'سامسونج', 'samsung', 'Leading technology and innovation', 'التكنولوجيا والابتكار الرائد', 'https://logo.clearbit.com/samsung.com', true, true, true, 2, 'Samsung Products', 'Explore Samsung devices and accessories', ARRAY['electronics', 'tech', 'mobile']),
  ('Sony', 'سوني', 'sony', 'Entertainment and technology', 'الترفيه والتكنولوجيا', 'https://logo.clearbit.com/sony.com', true, false, true, 3, 'Sony Products', 'Sony electronics and entertainment', ARRAY['electronics', 'audio', 'gaming']),
  ('Nike', 'نايكي', 'nike', 'Just Do It - Athletic excellence', 'افعلها - التميز الرياضي', 'https://logo.clearbit.com/nike.com', true, true, true, 4, 'Nike Products', 'Nike sportswear and footwear', ARRAY['fashion', 'sports', 'athletic']),
  ('Adidas', 'أديداس', 'adidas', 'Impossible is Nothing', 'المستحيل ليس شيئاً', 'https://logo.clearbit.com/adidas.com', true, true, true, 5, 'Adidas Products', 'Adidas sportswear and accessories', ARRAY['fashion', 'sports', 'athletic']),
  ('Zara', 'زارا', 'zara', 'Fast fashion and style', 'الموضة السريعة والأناقة', 'https://logo.clearbit.com/zara.com', true, false, false, 6, 'Zara Fashion', 'Zara clothing and accessories', ARRAY['fashion', 'clothing', 'style']),
  ('Sephora', 'سيفورا', 'sephora', 'Beauty and cosmetics', 'الجمال ومستحضرات التجميل', 'https://logo.clearbit.com/sephora.com', true, true, true, 7, 'Sephora Beauty', 'Sephora beauty products and cosmetics', ARRAY['beauty', 'cosmetics', 'skincare']),
  ('L''Oreal', 'لوريال', 'loreal', 'Because You''re Worth It', 'لأنك تستحقين', 'https://logo.clearbit.com/loreal.com', true, false, true, 8, 'L''Oreal Beauty', 'L''Oreal beauty and skincare products', ARRAY['beauty', 'cosmetics', 'skincare']),
  ('Starbucks', 'ستاربكس', 'starbucks', 'Inspiring and nurturing the human spirit', 'إلهام وتغذية الروح البشرية', 'https://logo.clearbit.com/starbucks.com', true, true, true, 9, 'Starbucks', 'Starbucks coffee and beverages', ARRAY['food', 'beverages', 'coffee']),
  ('Nespresso', 'نسبرسو', 'nespresso', 'What else?', 'ماذا أيضاً؟', 'https://logo.clearbit.com/nespresso.com', true, false, true, 10, 'Nespresso', 'Nespresso coffee machines and capsules', ARRAY['food', 'beverages', 'coffee']),
  ('Dior', 'ديور', 'dior', 'Luxury fashion and beauty', 'الأزياء والجمال الفاخرة', 'https://logo.clearbit.com/dior.com', true, true, true, 11, 'Dior Luxury', 'Dior luxury fashion and beauty', ARRAY['luxury', 'fashion', 'beauty', 'premium']),
  ('Chanel', 'شانيل', 'chanel', 'Luxury and elegance', 'الفخامة والأناقة', 'https://logo.clearbit.com/chanel.com', true, true, true, 12, 'Chanel Luxury', 'Chanel luxury products', ARRAY['luxury', 'fashion', 'beauty', 'premium']),
  ('Ray-Ban', 'رايبان', 'ray-ban', 'Icons of style and culture', 'أيقونات الأناقة والثقافة', 'https://logo.clearbit.com/ray-ban.com', true, false, true, 13, 'Ray-Ban Sunglasses', 'Ray-Ban sunglasses and eyewear', ARRAY['fashion', 'accessories', 'eyewear']),
  ('Swatch', 'سووتش', 'swatch', 'Time is what you make of it', 'الوقت هو ما تصنعه', 'https://logo.clearbit.com/swatch.com', true, false, false, 14, 'Swatch Watches', 'Swatch watches and timepieces', ARRAY['fashion', 'accessories', 'watches']),
  ('Xbox', 'إكس بوكس', 'xbox', 'Power Your Dreams', 'قوة أحلامك', 'https://logo.clearbit.com/xbox.com', true, false, true, 15, 'Xbox Gaming', 'Xbox gaming consoles and accessories', ARRAY['gaming', 'electronics', 'entertainment']),
  ('PlayStation', 'بلايستيشن', 'playstation', 'Play Has No Limits', 'اللعب بلا حدود', 'https://logo.clearbit.com/playstation.com', true, false, true, 16, 'PlayStation Gaming', 'PlayStation gaming products', ARRAY['gaming', 'electronics', 'entertainment']),
  ('LEGO', 'ليغو', 'lego', 'Build the Future', 'بناء المستقبل', 'https://logo.clearbit.com/lego.com', true, true, true, 17, 'LEGO Toys', 'LEGO building sets and toys', ARRAY['toys', 'games', 'education']),
  ('Disney', 'ديزني', 'disney', 'Where Dreams Come True', 'حيث تتحقق الأحلام', 'https://logo.clearbit.com/disney.com', true, true, true, 18, 'Disney Products', 'Disney merchandise and collectibles', ARRAY['entertainment', 'toys', 'collectibles']),
  ('Nintendo', 'نينتندو', 'nintendo', 'Playing is for Everyone', 'اللعب للجميع', 'https://logo.clearbit.com/nintendo.com', true, false, true, 19, 'Nintendo Gaming', 'Nintendo gaming products', ARRAY['gaming', 'electronics', 'entertainment']),
  ('Canon', 'كانون', 'canon', 'Delighting You Always', 'إسعادك دائماً', 'https://logo.clearbit.com/canon.com', true, false, true, 20, 'Canon Cameras', 'Canon cameras and photography equipment', ARRAY['electronics', 'photography', 'cameras']),
  ('Bose', 'بوز', 'bose', 'Better Sound Through Research', 'صوت أفضل من خلال البحث', 'https://logo.clearbit.com/bose.com', true, false, true, 21, 'Bose Audio', 'Bose audio equipment and speakers', ARRAY['electronics', 'audio', 'speakers']),
  ('JBL', 'جيه بي إل', 'jbl', 'Hear the Truth', 'اسمع الحقيقة', 'https://logo.clearbit.com/jbl.com', true, false, false, 22, 'JBL Audio', 'JBL speakers and audio equipment', ARRAY['electronics', 'audio', 'speakers']),
  ('The Body Shop', 'ذا بودي شوب', 'the-body-shop', 'Enrich Not Exploit', 'إثراء وليس استغلال', 'https://logo.clearbit.com/thebodyshop.com', true, false, false, 23, 'The Body Shop', 'The Body Shop beauty and skincare', ARRAY['beauty', 'skincare', 'natural']),
  ('MAC Cosmetics', 'ماك كوزمتكس', 'mac-cosmetics', 'All Ages, All Races, All Genders', 'جميع الأعمار، جميع الأعراق، جميع الأجناس', 'https://logo.clearbit.com/maccosmetics.com', true, true, true, 24, 'MAC Cosmetics', 'MAC professional makeup', ARRAY['beauty', 'cosmetics', 'makeup']),
  ('Victoria''s Secret', 'فيكتوريا سيكريت', 'victorias-secret', 'A Body for Every Body', 'جسم لكل جسم', 'https://logo.clearbit.com/victoriassecret.com', true, false, true, 25, 'Victoria''s Secret', 'Victoria''s Secret lingerie and beauty', ARRAY['fashion', 'lingerie', 'beauty']),
  ('Calvin Klein', 'كالفن كلاين', 'calvin-klein', 'I am what I am', 'أنا ما أنا', 'https://logo.clearbit.com/calvinklein.com', true, false, true, 26, 'Calvin Klein', 'Calvin Klein fashion and fragrances', ARRAY['fashion', 'fragrance', 'lifestyle']),
  ('Hugo Boss', 'هوجو بوس', 'hugo-boss', 'Don''t Imitate. Innovate.', 'لا تقلد. ابتكر.', 'https://logo.clearbit.com/hugoboss.com', true, false, true, 27, 'Hugo Boss', 'Hugo Boss fashion and accessories', ARRAY['fashion', 'luxury', 'menswear']),
  ('Tiffany & Co.', 'تيفاني آند كو', 'tiffany-co', 'For the Love of Blue', 'من أجل حب الأزرق', 'https://logo.clearbit.com/tiffany.com', true, true, true, 28, 'Tiffany & Co.', 'Tiffany & Co. jewelry and accessories', ARRAY['luxury', 'jewelry', 'premium']),
  ('Pandora', 'باندورا', 'pandora', 'Unforgettable Moments', 'لحظات لا تُنسى', 'https://logo.clearbit.com/pandora.net', true, false, true, 29, 'Pandora Jewelry', 'Pandora jewelry and charms', ARRAY['jewelry', 'accessories', 'gifts'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  logo_url = EXCLUDED.logo_url,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  is_verified = EXCLUDED.is_verified,
  sort_order = EXCLUDED.sort_order,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Link some brands to categories (example relationships)
-- ====================================================================
-- Note: This assumes category IDs exist. Adjust based on your actual category structure.

DO $$
DECLARE
  v_apple_id UUID;
  v_samsung_id UUID;
  v_nike_id UUID;
  v_sephora_id UUID;
  v_electronics_cat_id UUID;
  v_fashion_cat_id UUID;
  v_beauty_cat_id UUID;
BEGIN
  -- Get brand IDs
  SELECT id INTO v_apple_id FROM public.brands WHERE slug = 'apple' LIMIT 1;
  SELECT id INTO v_samsung_id FROM public.brands WHERE slug = 'samsung' LIMIT 1;
  SELECT id INTO v_nike_id FROM public.brands WHERE slug = 'nike' LIMIT 1;
  SELECT id INTO v_sephora_id FROM public.brands WHERE slug = 'sephora' LIMIT 1;
  
  -- Get category IDs (assuming Electronics, Fashion, Beauty exist)
  SELECT id INTO v_electronics_cat_id FROM public.categories WHERE slug = 'electronics' AND level = 1 LIMIT 1;
  SELECT id INTO v_fashion_cat_id FROM public.categories WHERE slug = 'fashion' AND level = 1 LIMIT 1;
  SELECT id INTO v_beauty_cat_id FROM public.categories WHERE slug = 'beauty-health' AND level = 1 LIMIT 1;
  
  -- Link Apple to Electronics
  IF v_apple_id IS NOT NULL AND v_electronics_cat_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_apple_id, v_electronics_cat_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- Link Samsung to Electronics
  IF v_samsung_id IS NOT NULL AND v_electronics_cat_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_samsung_id, v_electronics_cat_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- Link Nike to Fashion
  IF v_nike_id IS NOT NULL AND v_fashion_cat_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_nike_id, v_fashion_cat_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- Link Sephora to Beauty
  IF v_sephora_id IS NOT NULL AND v_beauty_cat_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_sephora_id, v_beauty_cat_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE 'Linked sample brands to categories';
END $$;

-- Success message
-- ====================================================================
DO $$
DECLARE
  v_brand_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_brand_count FROM public.brands WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sample brands seeded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total active brands: %', v_brand_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Featured brands: Apple, Samsung, Nike, Adidas, Sephora, Dior, Chanel, Starbucks, LEGO, Disney';
  RAISE NOTICE '✓ Verified brands: Apple, Samsung, Sony, Nike, Adidas, Sephora, Dior, Chanel, MAC Cosmetics, Tiffany & Co.';
  RAISE NOTICE '';
END $$;

