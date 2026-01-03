-- ====================================================================
-- LINK ALL BRANDS TO CATEGORIES
-- Description: Link all seeded brands to their appropriate categories
-- Date: February 2025
-- ====================================================================

DO $$
DECLARE
  -- Brand IDs
  v_apple_id UUID;
  v_samsung_id UUID;
  v_sony_id UUID;
  v_nike_id UUID;
  v_adidas_id UUID;
  v_zara_id UUID;
  v_sephora_id UUID;
  v_loreal_id UUID;
  v_starbucks_id UUID;
  v_nespresso_id UUID;
  v_dior_id UUID;
  v_chanel_id UUID;
  v_rayban_id UUID;
  v_swatch_id UUID;
  v_xbox_id UUID;
  v_playstation_id UUID;
  v_lego_id UUID;
  v_disney_id UUID;
  v_nintendo_id UUID;
  v_canon_id UUID;
  v_bose_id UUID;
  v_jbl_id UUID;
  v_body_shop_id UUID;
  v_mac_id UUID;
  v_victorias_secret_id UUID;
  v_calvin_klein_id UUID;
  v_hugo_boss_id UUID;
  v_tiffany_id UUID;
  v_pandora_id UUID;
  
  -- Category IDs (Level 1 - Main Categories)
  v_electronics_id UUID;
  v_fashion_id UUID;
  v_beauty_health_id UUID;
  v_accessories_jewelry_id UUID;
  v_gaming_id UUID;
  v_home_appliances_id UUID;
  v_coffee_drinks_id UUID;
  v_luxury_id UUID;
  v_baby_toys_id UUID;
BEGIN
  -- Get brand IDs
  SELECT id INTO v_apple_id FROM public.brands WHERE slug = 'apple' LIMIT 1;
  SELECT id INTO v_samsung_id FROM public.brands WHERE slug = 'samsung' LIMIT 1;
  SELECT id INTO v_sony_id FROM public.brands WHERE slug = 'sony' LIMIT 1;
  SELECT id INTO v_nike_id FROM public.brands WHERE slug = 'nike' LIMIT 1;
  SELECT id INTO v_adidas_id FROM public.brands WHERE slug = 'adidas' LIMIT 1;
  SELECT id INTO v_zara_id FROM public.brands WHERE slug = 'zara' LIMIT 1;
  SELECT id INTO v_sephora_id FROM public.brands WHERE slug = 'sephora' LIMIT 1;
  SELECT id INTO v_loreal_id FROM public.brands WHERE slug = 'loreal' LIMIT 1;
  SELECT id INTO v_starbucks_id FROM public.brands WHERE slug = 'starbucks' LIMIT 1;
  SELECT id INTO v_nespresso_id FROM public.brands WHERE slug = 'nespresso' LIMIT 1;
  SELECT id INTO v_dior_id FROM public.brands WHERE slug = 'dior' LIMIT 1;
  SELECT id INTO v_chanel_id FROM public.brands WHERE slug = 'chanel' LIMIT 1;
  SELECT id INTO v_rayban_id FROM public.brands WHERE slug = 'ray-ban' LIMIT 1;
  SELECT id INTO v_swatch_id FROM public.brands WHERE slug = 'swatch' LIMIT 1;
  SELECT id INTO v_xbox_id FROM public.brands WHERE slug = 'xbox' LIMIT 1;
  SELECT id INTO v_playstation_id FROM public.brands WHERE slug = 'playstation' LIMIT 1;
  SELECT id INTO v_lego_id FROM public.brands WHERE slug = 'lego' LIMIT 1;
  SELECT id INTO v_disney_id FROM public.brands WHERE slug = 'disney' LIMIT 1;
  SELECT id INTO v_nintendo_id FROM public.brands WHERE slug = 'nintendo' LIMIT 1;
  SELECT id INTO v_canon_id FROM public.brands WHERE slug = 'canon' LIMIT 1;
  SELECT id INTO v_bose_id FROM public.brands WHERE slug = 'bose' LIMIT 1;
  SELECT id INTO v_jbl_id FROM public.brands WHERE slug = 'jbl' LIMIT 1;
  SELECT id INTO v_body_shop_id FROM public.brands WHERE slug = 'the-body-shop' LIMIT 1;
  SELECT id INTO v_mac_id FROM public.brands WHERE slug = 'mac-cosmetics' LIMIT 1;
  SELECT id INTO v_victorias_secret_id FROM public.brands WHERE slug = 'victorias-secret' LIMIT 1;
  SELECT id INTO v_calvin_klein_id FROM public.brands WHERE slug = 'calvin-klein' LIMIT 1;
  SELECT id INTO v_hugo_boss_id FROM public.brands WHERE slug = 'hugo-boss' LIMIT 1;
  SELECT id INTO v_tiffany_id FROM public.brands WHERE slug = 'tiffany-co' LIMIT 1;
  SELECT id INTO v_pandora_id FROM public.brands WHERE slug = 'pandora' LIMIT 1;
  
  -- Get category IDs (Level 1 - Main Categories under "Joyful Gifting")
  SELECT id INTO v_electronics_id FROM public.categories WHERE slug = 'electronics' AND level = 1 LIMIT 1;
  SELECT id INTO v_fashion_id FROM public.categories WHERE slug = 'fashion' AND level = 1 LIMIT 1;
  SELECT id INTO v_beauty_health_id FROM public.categories WHERE slug = 'beauty-health' AND level = 1 LIMIT 1;
  SELECT id INTO v_accessories_jewelry_id FROM public.categories WHERE slug = 'accessories-jewelry' AND level = 1 LIMIT 1;
  SELECT id INTO v_gaming_id FROM public.categories WHERE slug = 'gaming' AND level = 1 LIMIT 1;
  SELECT id INTO v_home_appliances_id FROM public.categories WHERE slug = 'home-appliances' AND level = 1 LIMIT 1;
  SELECT id INTO v_baby_toys_id FROM public.categories WHERE slug = 'baby-toys' AND level = 1 LIMIT 1;
  SELECT id INTO v_luxury_id FROM public.categories WHERE slug = 'luxury' AND level = 1 LIMIT 1;
  
  -- Get category IDs from "Tastes & Treats"
  SELECT id INTO v_coffee_drinks_id FROM public.categories WHERE slug = 'coffee-drinks' AND level = 1 LIMIT 1;
  
  -- ====================================================================
  -- ELECTRONICS & TECH BRANDS
  -- ====================================================================
  IF v_apple_id IS NOT NULL AND v_electronics_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_apple_id, v_electronics_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_samsung_id IS NOT NULL AND v_electronics_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_samsung_id, v_electronics_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_sony_id IS NOT NULL AND v_electronics_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_sony_id, v_electronics_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_canon_id IS NOT NULL AND v_electronics_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_canon_id, v_electronics_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_bose_id IS NOT NULL AND v_electronics_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_bose_id, v_electronics_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_jbl_id IS NOT NULL AND v_electronics_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_jbl_id, v_electronics_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- ====================================================================
  -- FASHION & APPAREL BRANDS
  -- ====================================================================
  IF v_nike_id IS NOT NULL AND v_fashion_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_nike_id, v_fashion_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_adidas_id IS NOT NULL AND v_fashion_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_adidas_id, v_fashion_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_zara_id IS NOT NULL AND v_fashion_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_zara_id, v_fashion_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_calvin_klein_id IS NOT NULL AND v_fashion_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_calvin_klein_id, v_fashion_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_hugo_boss_id IS NOT NULL AND v_fashion_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_hugo_boss_id, v_fashion_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_victorias_secret_id IS NOT NULL AND v_fashion_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_victorias_secret_id, v_fashion_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- ====================================================================
  -- BEAUTY & HEALTH BRANDS
  -- ====================================================================
  IF v_sephora_id IS NOT NULL AND v_beauty_health_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_sephora_id, v_beauty_health_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_loreal_id IS NOT NULL AND v_beauty_health_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_loreal_id, v_beauty_health_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_body_shop_id IS NOT NULL AND v_beauty_health_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_body_shop_id, v_beauty_health_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_mac_id IS NOT NULL AND v_beauty_health_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_mac_id, v_beauty_health_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- ====================================================================
  -- ACCESSORIES & JEWELRY BRANDS
  -- ====================================================================
  IF v_rayban_id IS NOT NULL AND v_accessories_jewelry_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_rayban_id, v_accessories_jewelry_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_swatch_id IS NOT NULL AND v_accessories_jewelry_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_swatch_id, v_accessories_jewelry_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_tiffany_id IS NOT NULL AND v_accessories_jewelry_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_tiffany_id, v_accessories_jewelry_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_pandora_id IS NOT NULL AND v_accessories_jewelry_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_pandora_id, v_accessories_jewelry_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- ====================================================================
  -- GAMING BRANDS
  -- ====================================================================
  IF v_xbox_id IS NOT NULL AND v_gaming_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_xbox_id, v_gaming_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_playstation_id IS NOT NULL AND v_gaming_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_playstation_id, v_gaming_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_nintendo_id IS NOT NULL AND v_gaming_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_nintendo_id, v_gaming_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- ====================================================================
  -- TOYS & ENTERTAINMENT BRANDS
  -- ====================================================================
  IF v_lego_id IS NOT NULL AND v_baby_toys_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_lego_id, v_baby_toys_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_disney_id IS NOT NULL AND v_baby_toys_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_disney_id, v_baby_toys_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- ====================================================================
  -- FOOD & BEVERAGES BRANDS
  -- ====================================================================
  IF v_starbucks_id IS NOT NULL AND v_coffee_drinks_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_starbucks_id, v_coffee_drinks_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  IF v_nespresso_id IS NOT NULL AND v_coffee_drinks_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_nespresso_id, v_coffee_drinks_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  -- ====================================================================
  -- LUXURY BRANDS (can be in multiple categories)
  -- ====================================================================
  IF v_dior_id IS NOT NULL THEN
    -- Dior is in both Luxury and Beauty & Health
    IF v_luxury_id IS NOT NULL THEN
      INSERT INTO public.brand_categories (brand_id, category_id)
      VALUES (v_dior_id, v_luxury_id)
      ON CONFLICT (brand_id, category_id) DO NOTHING;
    END IF;
    IF v_beauty_health_id IS NOT NULL THEN
      INSERT INTO public.brand_categories (brand_id, category_id)
      VALUES (v_dior_id, v_beauty_health_id)
      ON CONFLICT (brand_id, category_id) DO NOTHING;
    END IF;
    IF v_fashion_id IS NOT NULL THEN
      INSERT INTO public.brand_categories (brand_id, category_id)
      VALUES (v_dior_id, v_fashion_id)
      ON CONFLICT (brand_id, category_id) DO NOTHING;
    END IF;
  END IF;
  
  IF v_chanel_id IS NOT NULL THEN
    -- Chanel is in both Luxury and Beauty & Health
    IF v_luxury_id IS NOT NULL THEN
      INSERT INTO public.brand_categories (brand_id, category_id)
      VALUES (v_chanel_id, v_luxury_id)
      ON CONFLICT (brand_id, category_id) DO NOTHING;
    END IF;
    IF v_beauty_health_id IS NOT NULL THEN
      INSERT INTO public.brand_categories (brand_id, category_id)
      VALUES (v_chanel_id, v_beauty_health_id)
      ON CONFLICT (brand_id, category_id) DO NOTHING;
    END IF;
    IF v_fashion_id IS NOT NULL THEN
      INSERT INTO public.brand_categories (brand_id, category_id)
      VALUES (v_chanel_id, v_fashion_id)
      ON CONFLICT (brand_id, category_id) DO NOTHING;
    END IF;
  END IF;
  
  IF v_tiffany_id IS NOT NULL AND v_luxury_id IS NOT NULL THEN
    INSERT INTO public.brand_categories (brand_id, category_id)
    VALUES (v_tiffany_id, v_luxury_id)
    ON CONFLICT (brand_id, category_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Linked all brands to their appropriate categories';
END $$;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
DO $$
DECLARE
  v_linked_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT brand_id) INTO v_linked_count FROM public.brand_categories;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Brand-to-category links created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total brands linked to categories: %', v_linked_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Category mappings:';
  RAISE NOTICE '   - Electronics: Apple, Samsung, Sony, Canon, Bose, JBL';
  RAISE NOTICE '   - Fashion: Nike, Adidas, Zara, Calvin Klein, Hugo Boss, Victoria''s Secret';
  RAISE NOTICE '   - Beauty & Health: Sephora, L''Oreal, The Body Shop, MAC Cosmetics';
  RAISE NOTICE '   - Accessories & Jewelry: Ray-Ban, Swatch, Tiffany & Co., Pandora';
  RAISE NOTICE '   - Gaming: Xbox, PlayStation, Nintendo';
  RAISE NOTICE '   - Baby & Toys: LEGO, Disney';
  RAISE NOTICE '   - Coffee & Drinks: Starbucks, Nespresso';
  RAISE NOTICE '   - Luxury: Dior, Chanel, Tiffany & Co.';
  RAISE NOTICE '';
END $$;

