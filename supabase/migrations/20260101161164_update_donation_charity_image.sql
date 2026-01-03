-- ====================================================================
-- UPDATE DONATION & CHARITY CATEGORY TYPE IMAGE
-- Description: Update image URL for the "Donation & Charity" category type
-- Date: February 2025
-- ====================================================================

-- Update all categories matching donation-charity
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/donation.png',
    updated_at = NOW()
WHERE slug = 'donation-charity';

-- Also update by category_type if slug doesn't match
UPDATE public.categories
SET image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/donation.png',
    updated_at = NOW()
WHERE category_type = 'donation_charity' 
  AND level = 0
  AND image_url IS DISTINCT FROM 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/donation.png';

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.categories 
  WHERE slug = 'donation-charity' 
    AND image_url = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady/gifts/donation.png';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Donation & Charity category type image updated!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Categories with image: %', v_count;
  RAISE NOTICE '';
END $$;

