-- ====================================================================
-- SEED DEFAULT CATEGORIES WITH IMAGES AND DESCRIPTIONS
-- Description: Insert default categories and subcategories with images
-- Date: January 2025
-- ====================================================================

-- Insert default top-level categories with images
INSERT INTO categories (name, name_ar, slug, level, icon, image_url, description, description_ar, is_active, is_system, sort_order)
VALUES 
  ('Fashion & Apparel', 'الموضة والملابس', 'fashion-apparel', 0, '👗', 
   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
   'Clothing, shoes, accessories, and fashion items for all ages and genders',
   'الملابس والأحذية والإكسسوارات والعناصر الأزياء لجميع الأعمار والأجناس',
   true, true, 1),
  
  ('Electronics', 'الإلكترونيات', 'electronics', 0, '📱',
   'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
   'Phones, computers, tablets, gadgets, and electronic devices',
   'الهواتف وأجهزة الكمبيوتر والأجهزة اللوحية والأدوات والأجهزة الإلكترونية',
   true, true, 2),
  
  ('Home & Garden', 'المنزل والحديقة', 'home-garden', 0, '🏠',
   'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
   'Furniture, home decor, kitchenware, gardening tools, and outdoor equipment',
   'الأثاث وديكور المنزل وأدوات المطبخ وأدوات البستنة والمعدات الخارجية',
   true, true, 3),
  
  ('Beauty & Health', 'الجمال والصحة', 'beauty-health', 0, '💄',
   'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
   'Cosmetics, skincare, personal care, wellness products, and health supplements',
   'مستحضرات التجميل والعناية بالبشرة والعناية الشخصية ومنتجات العافية والمكملات الصحية',
   true, true, 4),
  
  ('Sports & Outdoors', 'الرياضة والهواء الطلق', 'sports-outdoors', 0, '⚽',
   'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
   'Athletic gear, sports equipment, outdoor activities, and fitness accessories',
   'معدات رياضية ومعدات رياضية وأنشطة خارجية وإكسسوارات اللياقة البدنية',
   true, true, 5),
  
  ('Food & Beverages', 'الطعام والمشروبات', 'food-beverages', 0, '🍔',
   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
   'Restaurants, cafes, food products, beverages, and culinary services',
   'المطاعم والمقاهي ومنتجات الطعام والمشروبات والخدمات الطهي',
   true, true, 6),
  
  ('Books & Media', 'الكتب والإعلام', 'books-media', 0, '📚',
   'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
   'Books, e-books, movies, music, games, and digital media',
   'الكتب والكتب الإلكترونية والأفلام والموسيقى والألعاب والوسائط الرقمية',
   true, true, 7),
  
  ('Toys & Kids', 'الألعاب والأطفال', 'toys-kids', 0, '🧸',
   'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400',
   'Toys, games, baby products, children clothing, and educational items',
   'الألعاب والألعاب ومنتجات الأطفال وملابس الأطفال والمواد التعليمية',
   true, true, 8),
  
  ('Automotive', 'السيارات', 'automotive', 0, '🚗',
   'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400',
   'Cars, motorcycles, parts, accessories, and automotive services',
   'السيارات والدراجات النارية والقطع والإكسسوارات وخدمات السيارات',
   true, true, 9),
  
  ('Services', 'الخدمات', 'services', 0, '🛠️',
   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400',
   'Professional services, consultations, repairs, and business services',
   'الخدمات المهنية والاستشارات والإصلاحات وخدمات الأعمال',
   true, true, 10),
  
  ('Handmade & Crafts', 'المصنوعات اليدوية', 'handmade-crafts', 0, '🎨',
   'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
   'Handcrafted items, artisan products, custom made goods, and DIY supplies',
   'العناصر المصنوعة يدوياً ومنتجات الحرفيين والسلع المصنوعة حسب الطلب ومستلزمات DIY',
   true, true, 11),
  
  ('Pets', 'الحيوانات الأليفة', 'pets', 0, '🐾',
   'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
   'Pet supplies, pet food, accessories, and pet services',
   'مستلزمات الحيوانات الأليفة وطعام الحيوانات الأليفة والإكسسوارات وخدمات الحيوانات الأليفة',
   true, true, 12),
  
  ('Office & Business', 'المكتب والأعمال', 'office-business', 0, '💼',
   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
   'Office supplies, business equipment, stationery, and professional tools',
   'مستلزمات المكتب ومعدات الأعمال والقرطاسية والأدوات المهنية',
   true, true, 13),
  
  ('Jewelry & Watches', 'المجوهرات والساعات', 'jewelry-watches', 0, '💎',
   'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
   'Fine jewelry, watches, accessories, and luxury timepieces',
   'المجوهرات الفاخرة والساعات والإكسسوارات والساعات الفاخرة',
   true, true, 14),
  
  ('Other', 'أخرى', 'other', 0, '📦',
   'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
   'Miscellaneous products and services that do not fit into other categories',
   'منتجات وخدمات متنوعة لا تنتمي إلى فئات أخرى',
   true, true, 99)
ON CONFLICT (slug) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  is_system = true;

-- Insert subcategories for Fashion & Apparel
WITH fashion_id AS (SELECT id FROM categories WHERE slug = 'fashion-apparel')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Men''s Clothing', 'ملابس رجالية', 'mens-clothing', fashion_id.id, 1, '👔',
  'Men''s shirts, pants, suits, and casual wear',
  'قمصان رجالية وبناطيل وبدلات وملابس غير رسمية',
  true, true, 1
FROM fashion_id
ON CONFLICT (slug) DO NOTHING;

WITH fashion_id AS (SELECT id FROM categories WHERE slug = 'fashion-apparel')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Women''s Clothing', 'ملابس نسائية', 'womens-clothing', fashion_id.id, 1, '👗',
  'Women''s dresses, tops, bottoms, and fashion apparel',
  'فساتين نسائية وقمصان وبناطيل وملابس أزياء',
  true, true, 2
FROM fashion_id
ON CONFLICT (slug) DO NOTHING;

WITH fashion_id AS (SELECT id FROM categories WHERE slug = 'fashion-apparel')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Shoes', 'أحذية', 'shoes', fashion_id.id, 1, '👠',
  'Men''s and women''s footwear, sneakers, boots, and sandals',
  'أحذية رجالية ونسائية وأحذية رياضية وأحذية وقبعات',
  true, true, 3
FROM fashion_id
ON CONFLICT (slug) DO NOTHING;

WITH fashion_id AS (SELECT id FROM categories WHERE slug = 'fashion-apparel')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Accessories', 'إكسسوارات', 'accessories', fashion_id.id, 1, '👜',
  'Bags, wallets, belts, jewelry, and fashion accessories',
  'حقائب ومحافظ وأحزمة ومجوهرات وإكسسوارات أزياء',
  true, true, 4
FROM fashion_id
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for Electronics
WITH electronics_id AS (SELECT id FROM categories WHERE slug = 'electronics')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Smartphones', 'الهواتف الذكية', 'smartphones', electronics_id.id, 1, '📱',
  'Mobile phones, smartphones, and phone accessories',
  'الهواتف المحمولة والهواتف الذكية وإكسسوارات الهاتف',
  true, true, 1
FROM electronics_id
ON CONFLICT (slug) DO NOTHING;

WITH electronics_id AS (SELECT id FROM categories WHERE slug = 'electronics')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Computers & Laptops', 'أجهزة الكمبيوتر وأجهزة الكمبيوتر المحمولة', 'computers-laptops', electronics_id.id, 1, '💻',
  'Desktop computers, laptops, tablets, and computer accessories',
  'أجهزة الكمبيوتر المكتبية وأجهزة الكمبيوتر المحمولة والأجهزة اللوحية وإكسسوارات الكمبيوتر',
  true, true, 2
FROM electronics_id
ON CONFLICT (slug) DO NOTHING;

WITH electronics_id AS (SELECT id FROM categories WHERE slug = 'electronics')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Audio & Video', 'الصوت والفيديو', 'audio-video', electronics_id.id, 1, '🎧',
  'Headphones, speakers, TVs, cameras, and audio/video equipment',
  'سماعات الرأس ومكبرات الصوت وأجهزة التلفزيون والكاميرات ومعدات الصوت والفيديو',
  true, true, 3
FROM electronics_id
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for Home & Garden
WITH home_id AS (SELECT id FROM categories WHERE slug = 'home-garden')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Furniture', 'الأثاث', 'furniture', home_id.id, 1, '🛋️',
  'Living room, bedroom, dining room, and office furniture',
  'أثاث غرفة المعيشة وغرفة النوم وغرفة الطعام والمكتب',
  true, true, 1
FROM home_id
ON CONFLICT (slug) DO NOTHING;

WITH home_id AS (SELECT id FROM categories WHERE slug = 'home-garden')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Kitchen & Dining', 'المطبخ والطعام', 'kitchen-dining', home_id.id, 1, '🍽️',
  'Kitchen appliances, cookware, dinnerware, and kitchen accessories',
  'أجهزة المطبخ وأدوات الطهي وأدوات المائدة وإكسسوارات المطبخ',
  true, true, 2
FROM home_id
ON CONFLICT (slug) DO NOTHING;

WITH home_id AS (SELECT id FROM categories WHERE slug = 'home-garden')
INSERT INTO categories (name, name_ar, slug, parent_id, level, icon, description, description_ar, is_active, is_system, sort_order)
SELECT 
  'Home Decor', 'ديكور المنزل', 'home-decor', home_id.id, 1, '🖼️',
  'Wall art, lighting, rugs, curtains, and decorative items',
  'فن الحائط والإضاءة والسجاد والستائر والعناصر الزخرفية',
  true, true, 3
FROM home_id
ON CONFLICT (slug) DO NOTHING;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Default categories seeded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - 15 top-level categories with images';
  RAISE NOTICE '   - Multiple subcategories for major categories';
  RAISE NOTICE '   - All categories marked as system categories';
  RAISE NOTICE '';
END $$;

