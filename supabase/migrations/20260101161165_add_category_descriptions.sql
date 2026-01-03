-- ====================================================================
-- ADD CATEGORY DESCRIPTIONS FROM PROTOTYPE
-- Description: Add descriptions/subtitles to categories as shown in prototype screenshots
-- Date: February 2025
-- ====================================================================

-- Update Level 1 categories under "Joyful Gifting" (Category Type)
-- ====================================================================

-- Electronics
UPDATE public.categories
SET description = 'Smart choices they''ll appreciate daily',
    description_ar = 'خيارات ذكية سيقدرونها يومياً',
    updated_at = NOW()
WHERE slug = 'electronics' AND level = 1;

-- Fashion
UPDATE public.categories
SET description = 'Style picks they''ll love wearing',
    description_ar = 'خيارات أسلوب سيحبون ارتداءها',
    updated_at = NOW()
WHERE slug = 'fashion' AND level = 1;

-- Fragrances & Oud
UPDATE public.categories
SET description = 'Scents that make memories last',
    description_ar = 'عطور تجعل الذكريات تدوم',
    updated_at = NOW()
WHERE slug = 'fragrances-oud' AND level = 1;

-- Beauty & Health
UPDATE public.categories
SET description = 'Glow-up gifts for their routine',
    description_ar = 'هدايا إشراق لروتينهم',
    updated_at = NOW()
WHERE slug = 'beauty-health' AND level = 1;

-- Baby & Toys
UPDATE public.categories
SET description = 'Joyful picks for little ones',
    description_ar = 'خيارات مبهجة للصغار',
    updated_at = NOW()
WHERE slug = 'baby-toys' AND level = 1;

-- Gaming
UPDATE public.categories
SET description = 'Playful gifts that spark joy',
    description_ar = 'هدايا مرحة تشعل الفرح',
    updated_at = NOW()
WHERE slug = 'gaming' AND level = 1;

-- Accessories & Jewelry
UPDATE public.categories
SET description = 'Little extras with big charm',
    description_ar = 'إضافات صغيرة بسحر كبير',
    updated_at = NOW()
WHERE slug = 'accessories-jewelry' AND level = 1;

-- Fitness & Outdoor
UPDATE public.categories
SET description = 'Gear to keep them moving',
    description_ar = 'معدات لإبقائهم نشطين',
    updated_at = NOW()
WHERE slug = 'fitness-outdoor' AND level = 1;

-- Health & Nutritions
UPDATE public.categories
SET description = 'Wellness gifts they''ll feel good about',
    description_ar = 'هدايا صحية سيشعرون بالرضا عنها',
    updated_at = NOW()
WHERE slug = 'health-nutritions' AND level = 1;

-- Home & Appliances
UPDATE public.categories
SET description = 'Make their space feel special',
    description_ar = 'اجعل مساحتهم مميزة',
    updated_at = NOW()
WHERE slug = 'home-appliances' AND level = 1;

-- Luxury
UPDATE public.categories
SET description = 'Fun picks for their downtime',
    description_ar = 'خيارات ممتعة لأوقات فراغهم',
    updated_at = NOW()
WHERE slug = 'luxury' AND level = 1;

-- Self Care
UPDATE public.categories
SET description = 'Glow-up gifts for their routine',
    description_ar = 'هدايا إشراق لروتينهم',
    updated_at = NOW()
WHERE slug = 'self-care' AND level = 1;

-- Update Level 1 categories under "Tastes & Treats" (Category Type)
-- ====================================================================

-- Treats & Meals
UPDATE public.categories
SET description = 'Instant cravings — delivered with love',
    description_ar = 'رغبات فورية — تُقدم بحب',
    updated_at = NOW()
WHERE slug = 'treats-meals' AND level = 1;

-- Chocolates & Sweets
UPDATE public.categories
SET description = 'Sweeten someone''s moment',
    description_ar = 'حلّي لحظة شخص ما',
    updated_at = NOW()
WHERE slug = 'chocolates-sweets' AND level = 1;

-- Coffee & Drinks
UPDATE public.categories
SET description = 'Sips that warm the soul',
    description_ar = 'رشفات تدفئ الروح',
    updated_at = NOW()
WHERE slug = 'coffee-drinks' AND level = 1;

-- Snacks & Bites
UPDATE public.categories
SET description = 'Fun flavors they''ll love munching',
    description_ar = 'نكهات ممتعة سيحبون تناولها',
    updated_at = NOW()
WHERE slug = 'snacks-bites' AND level = 1;

-- Dates & Traditional Treats
UPDATE public.categories
SET description = 'Sweet classics they''ll appreciate',
    description_ar = 'كلاسيكيات حلوة سيقدرونها',
    updated_at = NOW()
WHERE slug = 'dates-traditional-treats' AND level = 1;

-- Specialty Picks
UPDATE public.categories
SET description = 'Zesty gifts for flavor lovers',
    description_ar = 'هدايا نكهة لعشاق الطعم',
    updated_at = NOW()
WHERE slug = 'specialty-picks' AND level = 1;

-- Update Level 1 categories under "Digital Surprises" (Category Type)
-- ====================================================================

-- Gift Cards
UPDATE public.categories
SET description = 'Let them choose what they love',
    description_ar = 'دعهم يختارون ما يحبون',
    updated_at = NOW()
WHERE slug = 'gift-cards' AND level = 1;

-- Streaming Subscriptions
UPDATE public.categories
SET description = 'Movies, music, and binge-worthy fun',
    description_ar = 'أفلام وموسيقى ومتعة تستحق المشاهدة',
    updated_at = NOW()
WHERE slug = 'streaming-subscriptions' AND level = 1;

-- Gaming Credits
UPDATE public.categories
SET description = 'Power-ups they''ll thank you for',
    description_ar = 'تعزيزات سيشكرونك عليها',
    updated_at = NOW()
WHERE slug = 'gaming-credits' AND level = 1;

-- Mobile Top-Ups
UPDATE public.categories
SET description = 'Quick credits, always appreciated',
    description_ar = 'رصيد سريع، دائماً مقدر',
    updated_at = NOW()
WHERE slug = 'mobile-top-ups' AND level = 1;

-- App Store Cards
UPDATE public.categories
SET description = 'Gifts for any digital taste',
    description_ar = 'هدايا لأي ذوق رقمي',
    updated_at = NOW()
WHERE slug = 'app-store-cards' AND level = 1;

-- Update Level 1 categories under "Moments & Meaning" (Category Type)
-- ====================================================================

-- Spa & Wellness Vouchers
UPDATE public.categories
SET description = 'Relaxing getaways or treatments',
    description_ar = 'رحلات استرخاء أو علاجات',
    updated_at = NOW()
WHERE slug = 'spa-wellness-vouchers' AND level = 1;

-- Dining Experiences
UPDATE public.categories
SET description = 'Restaurant invites, chef boxes, tasting menus',
    description_ar = 'دعوات مطاعم، صناديق شيف، قوائم تذوق',
    updated_at = NOW()
WHERE slug = 'dining-experiences' AND level = 1;

-- Event Tickets
UPDATE public.categories
SET description = 'Concerts, festivals, theatre',
    description_ar = 'حفلات موسيقية، مهرجانات، مسرح',
    updated_at = NOW()
WHERE slug = 'event-tickets' AND level = 1;

-- Adventure Gifts
UPDATE public.categories
SET description = 'Hot air balloons, karting, escape rooms',
    description_ar = 'مناطيد هوائية، كارتنج، غرف الهروب',
    updated_at = NOW()
WHERE slug = 'adventure-gifts' AND level = 1;

-- Pet Lovers
UPDATE public.categories
SET description = 'Gifts for their furry friends',
    description_ar = 'هدايا لأصدقائهم ذوي الفراء',
    updated_at = NOW()
WHERE slug = 'pet-lovers' AND level = 1;

-- Plants & Flowers
UPDATE public.categories
SET description = 'Living decor or thoughtful bouquets',
    description_ar = 'ديكور حي أو باقات مدروسة',
    updated_at = NOW()
WHERE slug = 'plants-flowers' AND level = 1;

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE level = 1 
    AND description IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Category descriptions added!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Level 1 categories with descriptions: %', v_count;
  RAISE NOTICE '';
END $$;

