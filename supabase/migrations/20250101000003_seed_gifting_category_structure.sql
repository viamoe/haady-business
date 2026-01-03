-- ====================================================================
-- SEED GIFTING CATEGORY STRUCTURE
-- Description: Insert category structure matching the social gifting platform prototype
-- Date: January 2025
-- Structure: Level 0 (Category Types) → Level 1 (Main Categories) → Level 2 (Sub Categories)
-- ====================================================================

-- Step 1: Insert Category Types (Level 0)
-- ====================================================================
INSERT INTO categories (name, name_ar, slug, level, category_type, icon, description, description_ar, is_active, is_system, sort_order)
VALUES 
  ('Joyful Gifting', 'الهدايا المبهجة', 'joyful-gifting', 0, 'joyful_gifting', '🎮',
   'Discover fun and exciting gifts that bring joy and happiness',
   'اكتشف الهدايا الممتعة والمثيرة التي تجلب الفرح والسعادة',
   true, true, 1),
  
  ('Tastes & Treats', 'المذاقات والحلويات', 'tastes-treats', 0, 'tastes_treats', '🍔',
   'Delicious food, drinks, and treats to satisfy any craving',
   'أطعمة ومشروبات وحلويات لذيذة لإرضاء أي رغبة',
   true, true, 2),
  
  ('Digital Surprises', 'المفاجآت الرقمية', 'digital-surprises', 0, 'digital_surprises', '📱',
   'Digital gifts, subscriptions, and online experiences',
   'الهدايا الرقمية والاشتراكات والتجارب عبر الإنترنت',
   true, true, 3),
  
  ('Moments & Meaning', 'اللحظات والمعاني', 'moments-meaning', 0, 'moments_meaning', '🌸',
   'Experiences, vouchers, and meaningful gifts that create memories',
   'التجارب والقسائم والهدايا ذات المعنى التي تخلق الذكريات',
   true, true, 4),
  
  ('Donation & Charity', 'التبرع والصدقة', 'donation-charity', 0, 'donation_charity', '❤️',
   'Give back with charitable donations and meaningful causes',
   'رد الجميل من خلال التبرعات الخيرية والقضايا ذات المعنى',
   true, true, 5)
ON CONFLICT (slug) DO UPDATE SET
  category_type = EXCLUDED.category_type,
  is_system = true,
  is_active = true;

-- Step 2: Insert Main Categories under "Joyful Gifting" (Level 1)
-- ====================================================================
WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Electronics', 'الإلكترونيات', 'electronics', joyful_gifting_id.id, 1, '📱',
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  'Smart choices they''ll appreciate daily',
  'خيارات ذكية سيقدرونها يومياً',
  true, true, 1
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Fashion', 'الموضة', 'fashion', joyful_gifting_id.id, 1, '👟',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
  'Style picks they''ll love wearing',
  'خيارات أزياء سيحبون ارتداءها',
  true, true, 2
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Beauty & Health', 'الجمال والصحة', 'beauty-health', joyful_gifting_id.id, 1, '💄',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
  'Glow-up gifts for their routine',
  'هدايا للعناية بروتينهم اليومي',
  true, true, 3
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Accessories & Jewelry', 'الإكسسوارات والمجوهرات', 'accessories-jewelry', joyful_gifting_id.id, 1, '⌚',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
  'Little extras with big charm',
  'إضافات صغيرة بسحر كبير',
  true, true, 4
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Home & Appliances', 'المنزل والأجهزة', 'home-appliances', joyful_gifting_id.id, 1, '☕',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
  'Make their space feel special',
  'اجعل مساحتهم مميزة',
  true, true, 5
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Gaming', 'الألعاب', 'gaming', joyful_gifting_id.id, 1, '🎮',
  'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400',
  'Playful gifts that spark joy',
  'هدايا مرحة تثير الفرح',
  true, true, 6
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Fragrances & Oud', 'العطور والعود', 'fragrances-oud', joyful_gifting_id.id, 1, '🧴',
  'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400',
  'Scents that make memories last',
  'عطور تجعل الذكريات تدوم',
  true, true, 7
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Health & Nutrition', 'الصحة والتغذية', 'health-nutrition', joyful_gifting_id.id, 1, '🥤',
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400',
  'Wellness gifts they''ll feel good about',
  'هدايا صحية سيشعرون بالرضا عنها',
  true, true, 8
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Self Care', 'العناية الذاتية', 'self-care', joyful_gifting_id.id, 1, '✂️',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
  'Glow-up gifts for their routine',
  'هدايا للعناية بروتينهم اليومي',
  true, true, 9
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Luxury', 'الفاخر', 'luxury', joyful_gifting_id.id, 1, '👜',
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400',
  'Fun picks for their downtime',
  'خيارات ممتعة لأوقات فراغهم',
  true, true, 10
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Fitness & Outdoor', 'اللياقة والهواء الطلق', 'fitness-outdoor', joyful_gifting_id.id, 1, '🧘',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
  'Gear to keep them moving',
  'معدات لإبقائهم نشطين',
  true, true, 11
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH joyful_gifting_id AS (SELECT id FROM categories WHERE slug = 'joyful-gifting')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Baby & Toys', 'الأطفال والألعاب', 'baby-toys', joyful_gifting_id.id, 1, '🍼',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400',
  'Joyful picks for little ones',
  'خيارات مبهجة للصغار',
  true, true, 12
FROM joyful_gifting_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

-- Step 3: Insert Main Categories under "Tastes & Treats" (Level 1)
-- ====================================================================
WITH tastes_treats_id AS (SELECT id FROM categories WHERE slug = 'tastes-treats')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Treats & Meals', 'الحلويات والوجبات', 'treats-meals', tastes_treats_id.id, 1, '🍔',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Instant cravings — delivered with love',
  'رغبات فورية — تُقدم بحب',
  true, true, 1
FROM tastes_treats_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH tastes_treats_id AS (SELECT id FROM categories WHERE slug = 'tastes-treats')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Chocolates & Sweets', 'الشوكولاتة والحلويات', 'chocolates-sweets', tastes_treats_id.id, 1, '🍫',
  'https://images.unsplash.com/photo-1606312619070-d48b4bdc5b89?w=400',
  'Sweeten someone''s moment',
  'حلّي لحظة شخص ما',
  true, true, 2
FROM tastes_treats_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH tastes_treats_id AS (SELECT id FROM categories WHERE slug = 'tastes-treats')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Coffee & Drinks', 'القهوة والمشروبات', 'coffee-drinks', tastes_treats_id.id, 1, '☕',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400',
  'Sips that warm the soul',
  'رشفات تدفئ الروح',
  true, true, 3
FROM tastes_treats_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH tastes_treats_id AS (SELECT id FROM categories WHERE slug = 'tastes-treats')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Snacks & Bites', 'الوجبات الخفيفة', 'snacks-bites', tastes_treats_id.id, 1, '🥐',
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
  'Fun flavors they''ll love munching',
  'نكهات ممتعة سيحبون تناولها',
  true, true, 4
FROM tastes_treats_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH tastes_treats_id AS (SELECT id FROM categories WHERE slug = 'tastes-treats')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Dates & Traditional Treats', 'التمور والحلويات التقليدية', 'dates-traditional-treats', tastes_treats_id.id, 1, '🌴',
  'https://images.unsplash.com/photo-1606312619070-d48b4bdc5b89?w=400',
  'Sweet classics they''ll appreciate',
  'كلاسيكيات حلوة سيقدرونها',
  true, true, 5
FROM tastes_treats_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH tastes_treats_id AS (SELECT id FROM categories WHERE slug = 'tastes-treats')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Specialty Picks', 'خيارات خاصة', 'specialty-picks', tastes_treats_id.id, 1, '⭐',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Zesty gifts for flavor lovers',
  'هدايا لذيذة لعشاق النكهات',
  true, true, 6
FROM tastes_treats_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

-- Step 4: Insert Main Categories under "Digital Surprises" (Level 1)
-- ====================================================================
WITH digital_surprises_id AS (SELECT id FROM categories WHERE slug = 'digital-surprises')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Gift Cards', 'بطاقات الهدايا', 'gift-cards', digital_surprises_id.id, 1, '🎁',
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
  'Let them choose what they love',
  'دعهم يختارون ما يحبون',
  true, true, 1
FROM digital_surprises_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH digital_surprises_id AS (SELECT id FROM categories WHERE slug = 'digital-surprises')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Streaming Subscriptions', 'اشتراكات البث', 'streaming-subscriptions', digital_surprises_id.id, 1, '📺',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
  'Movies, music, and binge-worthy fun',
  'أفلام وموسيقى ومتعة تستحق المشاهدة',
  true, true, 2
FROM digital_surprises_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH digital_surprises_id AS (SELECT id FROM categories WHERE slug = 'digital-surprises')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Gaming Credits', 'رصيد الألعاب', 'gaming-credits', digital_surprises_id.id, 1, '🎮',
  'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400',
  'Power-ups they''ll thank you for',
  'تعزيزات سيشكرونك عليها',
  true, true, 3
FROM digital_surprises_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH digital_surprises_id AS (SELECT id FROM categories WHERE slug = 'digital-surprises')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Mobile Top-Ups', 'شحن الجوال', 'mobile-top-ups', digital_surprises_id.id, 1, '📱',
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  'Quick credits, always appreciated',
  'رصيد سريع، دائماً مقدر',
  true, true, 4
FROM digital_surprises_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH digital_surprises_id AS (SELECT id FROM categories WHERE slug = 'digital-surprises')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'App Store Cards', 'بطاقات متاجر التطبيقات', 'app-store-cards', digital_surprises_id.id, 1, '📲',
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  'Gifts for any digital taste',
  'هدايا لأي ذوق رقمي',
  true, true, 5
FROM digital_surprises_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

-- Step 5: Insert Main Categories under "Moments & Meaning" (Level 1)
-- ====================================================================
WITH moments_meaning_id AS (SELECT id FROM categories WHERE slug = 'moments-meaning')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Spa & Wellness Vouchers', 'قسائم السبا والعافية', 'spa-wellness-vouchers', moments_meaning_id.id, 1, '🧘',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
  'Relaxing getaways or treatments',
  'رحلات استرخاء أو علاجات',
  true, true, 1
FROM moments_meaning_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH moments_meaning_id AS (SELECT id FROM categories WHERE slug = 'moments-meaning')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Dining Experiences', 'تجارب الطعام', 'dining-experiences', moments_meaning_id.id, 1, '🍽️',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
  'Restaurant invites, chef boxes, tasting menus',
  'دعوات المطاعم وصناديق الشيف وقوائم التذوق',
  true, true, 2
FROM moments_meaning_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH moments_meaning_id AS (SELECT id FROM categories WHERE slug = 'moments-meaning')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Event Tickets', 'تذاكر الفعاليات', 'event-tickets', moments_meaning_id.id, 1, '🎫',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
  'Concerts, festivals, theatre',
  'الحفلات والمهرجانات والمسرح',
  true, true, 3
FROM moments_meaning_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH moments_meaning_id AS (SELECT id FROM categories WHERE slug = 'moments-meaning')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Adventure Gifts', 'هدايا المغامرة', 'adventure-gifts', moments_meaning_id.id, 1, '🏎️',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  'Hot air balloons, karting, escape rooms',
  'المناطيد والكارتينغ وغرف الهروب',
  true, true, 4
FROM moments_meaning_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH moments_meaning_id AS (SELECT id FROM categories WHERE slug = 'moments-meaning')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Pet Lovers', 'عشاق الحيوانات الأليفة', 'pet-lovers', moments_meaning_id.id, 1, '🐾',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
  'Gifts for their furry friends',
  'هدايا لأصدقائهم ذوي الفراء',
  true, true, 5
FROM moments_meaning_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

WITH moments_meaning_id AS (SELECT id FROM categories WHERE slug = 'moments-meaning')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Plants & Flowers', 'النباتات والزهور', 'plants-flowers', moments_meaning_id.id, 1, '🌸',
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
  'Living decor or thoughtful bouquets',
  'ديكور حي أو باقات مدروسة',
  true, true, 6
FROM moments_meaning_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

-- Step 6: Insert Main Categories under "Donation & Charity" (Level 1)
-- ====================================================================
WITH donation_charity_id AS (SELECT id FROM categories WHERE slug = 'donation-charity')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Charitable Donations', 'التبرعات الخيرية', 'charitable-donations', donation_charity_id.id, 1, '💝',
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400',
  'Give back to meaningful causes',
  'رد الجميل للقضايا ذات المعنى',
  true, true, 1
FROM donation_charity_id
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = 1,
  is_system = true,
  is_active = true;

-- Step 7: Insert Sub Categories (Level 2) - Examples for key main categories
-- ====================================================================

-- Subcategories under Electronics (Level 2)
WITH electronics_id AS (SELECT id FROM categories WHERE slug = 'electronics' AND level = 1)
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Smartphones', 'الهواتف الذكية', 'smartphones', electronics_id.id, 2, '📱',
  'Mobile phones and smartphones',
  'الهواتف المحمولة والهواتف الذكية',
  true, true, 1
FROM electronics_id
ON CONFLICT (slug) DO NOTHING;

WITH electronics_id AS (SELECT id FROM categories WHERE slug = 'electronics' AND level = 1)
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Laptops & Computers', 'أجهزة الكمبيوتر المحمولة', 'laptops-computers', electronics_id.id, 2, '💻',
  'Laptops, desktops, and computing devices',
  'أجهزة الكمبيوتر المحمولة والمكتبية وأجهزة الحوسبة',
  true, true, 2
FROM electronics_id
ON CONFLICT (slug) DO NOTHING;

WITH electronics_id AS (SELECT id FROM categories WHERE slug = 'electronics' AND level = 1)
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Audio & Headphones', 'الصوت وسماعات الرأس', 'audio-headphones', electronics_id.id, 2, '🎧',
  'Headphones, speakers, and audio equipment',
  'سماعات الرأس ومكبرات الصوت ومعدات الصوت',
  true, true, 3
FROM electronics_id
ON CONFLICT (slug) DO NOTHING;

-- Subcategories under Fashion (Level 2)
WITH fashion_id AS (SELECT id FROM categories WHERE slug = 'fashion' AND level = 1)
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Men''s Clothing', 'ملابس رجالية', 'mens-clothing', fashion_id.id, 2, '👔',
  'Men''s shirts, pants, suits, and casual wear',
  'قمصان رجالية وبناطيل وبدلات وملابس غير رسمية',
  true, true, 1
FROM fashion_id
ON CONFLICT (slug) DO NOTHING;

WITH fashion_id AS (SELECT id FROM categories WHERE slug = 'fashion' AND level = 1)
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Women''s Clothing', 'ملابس نسائية', 'womens-clothing', fashion_id.id, 2, '👗',
  'Women''s dresses, tops, bottoms, and fashion apparel',
  'فساتين نسائية وقمصان وبناطيل وملابس أزياء',
  true, true, 2
FROM fashion_id
ON CONFLICT (slug) DO NOTHING;

WITH fashion_id AS (SELECT id FROM categories WHERE slug = 'fashion' AND level = 1)
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Shoes', 'أحذية', 'shoes', fashion_id.id, 2, '👠',
  'Men''s and women''s footwear, sneakers, boots, and sandals',
  'أحذية رجالية ونسائية وأحذية رياضية وأحذية وقبعات',
  true, true, 3
FROM fashion_id
ON CONFLICT (slug) DO NOTHING;

WITH fashion_id AS (SELECT id FROM categories WHERE slug = 'fashion' AND level = 1)
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Accessories', 'إكسسوارات', 'accessories', fashion_id.id, 2, '👜',
  'Bags, wallets, belts, and fashion accessories',
  'حقائب ومحافظ وأحزمة وإكسسوارات أزياء',
  true, true, 4
FROM fashion_id
ON CONFLICT (slug) DO NOTHING;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
DO $$
DECLARE
  type_count INTEGER;
  main_count INTEGER;
  sub_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO type_count FROM categories WHERE level = 0 AND category_type IS NOT NULL;
  SELECT COUNT(*) INTO main_count FROM categories WHERE level = 1;
  SELECT COUNT(*) INTO sub_count FROM categories WHERE level = 2;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Gifting category structure seeded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - Category Types (Level 0): %', type_count;
  RAISE NOTICE '   - Main Categories (Level 1): %', main_count;
  RAISE NOTICE '   - Sub Categories (Level 2): %', sub_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Structure:';
  RAISE NOTICE '   - Level 0: Category Types (Joyful Gifting, Tastes & Treats, etc.)';
  RAISE NOTICE '   - Level 1: Main Categories (Electronics, Fashion, etc.)';
  RAISE NOTICE '   - Level 2: Sub Categories (Smartphones, Sneakers, etc.)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Products should be primarily assigned to Level 1 (Main Categories)';
  RAISE NOTICE '   but can also be assigned to Level 0 or Level 2 if needed.';
  RAISE NOTICE '';
END $$;

