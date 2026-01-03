-- ====================================================================
-- FIX MISSING LEVEL 1 CATEGORIES
-- Description: Ensure all Level 1 (Main) categories are inserted
-- Date: January 2025
-- ====================================================================

-- Insert Main Categories under "Joyful Gifting" (Level 1)
-- ====================================================================
DO $$
DECLARE
  joyful_gifting_id UUID;
BEGIN
  SELECT id INTO joyful_gifting_id FROM categories WHERE slug = 'joyful-gifting' AND level = 0 LIMIT 1;
  
  IF joyful_gifting_id IS NOT NULL THEN
    -- Electronics
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Electronics', 'الإلكترونيات', 'electronics', joyful_gifting_id, 1, '📱',
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
      'Smart choices they''ll appreciate daily',
      'خيارات ذكية سيقدرونها يومياً',
      true, true, 1
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Fashion
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Fashion', 'الموضة', 'fashion', joyful_gifting_id, 1, '👟',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
      'Style picks they''ll love wearing',
      'خيارات أزياء سيحبون ارتداءها',
      true, true, 2
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Beauty & Health
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Beauty & Health', 'الجمال والصحة', 'beauty-health', joyful_gifting_id, 1, '💄',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
      'Glow-up gifts for their routine',
      'هدايا للعناية بروتينهم اليومي',
      true, true, 3
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Accessories & Jewelry
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Accessories & Jewelry', 'الإكسسوارات والمجوهرات', 'accessories-jewelry', joyful_gifting_id, 1, '⌚',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
      'Little extras with big charm',
      'إضافات صغيرة بسحر كبير',
      true, true, 4
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Home & Appliances
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Home & Appliances', 'المنزل والأجهزة', 'home-appliances', joyful_gifting_id, 1, '☕',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
      'Make their space feel special',
      'اجعل مساحتهم مميزة',
      true, true, 5
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Gaming
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Gaming', 'الألعاب', 'gaming', joyful_gifting_id, 1, '🎮',
      'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400',
      'Playful gifts that spark joy',
      'هدايا مرحة تثير الفرح',
      true, true, 6
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Fragrances & Oud
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Fragrances & Oud', 'العطور والعود', 'fragrances-oud', joyful_gifting_id, 1, '🧴',
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400',
      'Scents that make memories last',
      'عطور تجعل الذكريات تدوم',
      true, true, 7
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Health & Nutrition
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Health & Nutrition', 'الصحة والتغذية', 'health-nutrition', joyful_gifting_id, 1, '🥤',
      'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400',
      'Wellness gifts they''ll feel good about',
      'هدايا صحية سيشعرون بالرضا عنها',
      true, true, 8
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Self Care
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Self Care', 'العناية الذاتية', 'self-care', joyful_gifting_id, 1, '✂️',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
      'Glow-up gifts for their routine',
      'هدايا للعناية بروتينهم اليومي',
      true, true, 9
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Luxury
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Luxury', 'الفاخر', 'luxury', joyful_gifting_id, 1, '👜',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400',
      'Fun picks for their downtime',
      'خيارات ممتعة لأوقات فراغهم',
      true, true, 10
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Fitness & Outdoor
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Fitness & Outdoor', 'اللياقة والهواء الطلق', 'fitness-outdoor', joyful_gifting_id, 1, '🧘',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      'Gear to keep them moving',
      'معدات لإبقائهم نشطين',
      true, true, 11
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Baby & Toys
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Baby & Toys', 'الأطفال والألعاب', 'baby-toys', joyful_gifting_id, 1, '🍼',
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400',
      'Joyful picks for little ones',
      'خيارات مبهجة للصغار',
      true, true, 12
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
  END IF;
END $$;

-- Insert Main Categories under "Tastes & Treats" (Level 1)
-- ====================================================================
DO $$
DECLARE
  tastes_treats_id UUID;
BEGIN
  SELECT id INTO tastes_treats_id FROM categories WHERE slug = 'tastes-treats' AND level = 0 LIMIT 1;
  
  IF tastes_treats_id IS NOT NULL THEN
    -- Treats & Meals
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Treats & Meals', 'الحلويات والوجبات', 'treats-meals', tastes_treats_id, 1, '🍔',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      'Instant cravings — delivered with love',
      'رغبات فورية — تُقدم بحب',
      true, true, 1
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Chocolates & Sweets
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Chocolates & Sweets', 'الشوكولاتة والحلويات', 'chocolates-sweets', tastes_treats_id, 1, '🍫',
      'https://images.unsplash.com/photo-1606312619070-d48b4bdc5b89?w=400',
      'Sweeten someone''s moment',
      'حلّي لحظة شخص ما',
      true, true, 2
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Coffee & Drinks
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Coffee & Drinks', 'القهوة والمشروبات', 'coffee-drinks', tastes_treats_id, 1, '☕',
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400',
      'Sips that warm the soul',
      'رشفات تدفئ الروح',
      true, true, 3
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Snacks & Bites
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Snacks & Bites', 'الوجبات الخفيفة', 'snacks-bites', tastes_treats_id, 1, '🥐',
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
      'Fun flavors they''ll love munching',
      'نكهات ممتعة سيحبون تناولها',
      true, true, 4
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Dates & Traditional Treats
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Dates & Traditional Treats', 'التمور والحلويات التقليدية', 'dates-traditional-treats', tastes_treats_id, 1, '🌴',
      'https://images.unsplash.com/photo-1606312619070-d48b4bdc5b89?w=400',
      'Sweet classics they''ll appreciate',
      'كلاسيكيات حلوة سيقدرونها',
      true, true, 5
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Specialty Picks
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Specialty Picks', 'خيارات خاصة', 'specialty-picks', tastes_treats_id, 1, '⭐',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      'Zesty gifts for flavor lovers',
      'هدايا لذيذة لعشاق النكهات',
      true, true, 6
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
  END IF;
END $$;

-- Insert Main Categories under "Digital Surprises" (Level 1)
-- ====================================================================
DO $$
DECLARE
  digital_surprises_id UUID;
BEGIN
  SELECT id INTO digital_surprises_id FROM categories WHERE slug = 'digital-surprises' AND level = 0 LIMIT 1;
  
  IF digital_surprises_id IS NOT NULL THEN
    -- Gift Cards
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Gift Cards', 'بطاقات الهدايا', 'gift-cards', digital_surprises_id, 1, '🎁',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
      'Let them choose what they love',
      'دعهم يختارون ما يحبون',
      true, true, 1
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Streaming Subscriptions
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Streaming Subscriptions', 'اشتراكات البث', 'streaming-subscriptions', digital_surprises_id, 1, '📺',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
      'Movies, music, and binge-worthy fun',
      'أفلام وموسيقى ومتعة تستحق المشاهدة',
      true, true, 2
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Gaming Credits
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Gaming Credits', 'رصيد الألعاب', 'gaming-credits', digital_surprises_id, 1, '🎮',
      'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400',
      'Power-ups they''ll thank you for',
      'تعزيزات سيشكرونك عليها',
      true, true, 3
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Mobile Top-Ups
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Mobile Top-Ups', 'شحن الجوال', 'mobile-top-ups', digital_surprises_id, 1, '📱',
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
      'Quick credits, always appreciated',
      'رصيد سريع، دائماً مقدر',
      true, true, 4
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- App Store Cards
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'App Store Cards', 'بطاقات متاجر التطبيقات', 'app-store-cards', digital_surprises_id, 1, '📲',
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
      'Gifts for any digital taste',
      'هدايا لأي ذوق رقمي',
      true, true, 5
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
  END IF;
END $$;

-- Insert Main Categories under "Moments & Meaning" (Level 1)
-- ====================================================================
DO $$
DECLARE
  moments_meaning_id UUID;
BEGIN
  SELECT id INTO moments_meaning_id FROM categories WHERE slug = 'moments-meaning' AND level = 0 LIMIT 1;
  
  IF moments_meaning_id IS NOT NULL THEN
    -- Spa & Wellness Vouchers
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Spa & Wellness Vouchers', 'قسائم السبا والعافية', 'spa-wellness-vouchers', moments_meaning_id, 1, '🧘',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
      'Relaxing getaways or treatments',
      'رحلات استرخاء أو علاجات',
      true, true, 1
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Dining Experiences
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Dining Experiences', 'تجارب الطعام', 'dining-experiences', moments_meaning_id, 1, '🍽️',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
      'Restaurant invites, chef boxes, tasting menus',
      'دعوات المطاعم وصناديق الشيف وقوائم التذوق',
      true, true, 2
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Event Tickets
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Event Tickets', 'تذاكر الفعاليات', 'event-tickets', moments_meaning_id, 1, '🎫',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
      'Concerts, festivals, theatre',
      'الحفلات والمهرجانات والمسرح',
      true, true, 3
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Adventure Gifts
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Adventure Gifts', 'هدايا المغامرة', 'adventure-gifts', moments_meaning_id, 1, '🏎️',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
      'Hot air balloons, karting, escape rooms',
      'المناطيد والكارتينغ وغرف الهروب',
      true, true, 4
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Pet Lovers
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Pet Lovers', 'عشاق الحيوانات الأليفة', 'pet-lovers', moments_meaning_id, 1, '🐾',
      'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
      'Gifts for their furry friends',
      'هدايا لأصدقائهم ذوي الفراء',
      true, true, 5
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
    
    -- Plants & Flowers
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Plants & Flowers', 'النباتات والزهور', 'plants-flowers', moments_meaning_id, 1, '🌸',
      'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
      'Living decor or thoughtful bouquets',
      'ديكور حي أو باقات مدروسة',
      true, true, 6
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
  END IF;
END $$;

-- Insert Main Categories under "Donation & Charity" (Level 1)
-- ====================================================================
DO $$
DECLARE
  donation_charity_id UUID;
BEGIN
  SELECT id INTO donation_charity_id FROM categories WHERE slug = 'donation-charity' AND level = 0 LIMIT 1;
  
  IF donation_charity_id IS NOT NULL THEN
    -- Charitable Donations
    INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
    VALUES (
      'Charitable Donations', 'التبرعات الخيرية', 'charitable-donations', donation_charity_id, 1, '💝',
      'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400',
      'Give back to meaningful causes',
      'رد الجميل للقضايا ذات المعنى',
      true, true, 1
    ) ON CONFLICT (slug) DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      level = 1,
      is_system = true,
      is_active = true;
  END IF;
END $$;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
DO $$
DECLARE
  level1_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO level1_count FROM categories WHERE level = 1 AND is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Level 1 categories inserted/updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total Level 1 categories: %', level1_count;
  RAISE NOTICE '';
END $$;

