-- ================================
-- Add store_categories array field and update timezone from country
-- ================================
-- Description: Adds store_categories as UUID array in stores table and updates timezone from country
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Add store_categories column to stores table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'store_categories'
  ) THEN
    ALTER TABLE public.stores 
    ADD COLUMN store_categories UUID[] DEFAULT ARRAY[]::UUID[];
    
    COMMENT ON COLUMN public.stores.store_categories IS 'Array of category UUIDs for this store. Updated from multi-select dropdown in onboarding.';
    
    RAISE NOTICE 'Added store_categories column to stores table';
  ELSE
    RAISE NOTICE 'Column stores.store_categories already exists';
  END IF;
END $$;

-- =====================================================
-- PART 2: Ensure timezone column exists in stores
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.stores 
    ADD COLUMN timezone TEXT;
    
    COMMENT ON COLUMN public.stores.timezone IS 'Timezone of the store (e.g., ''Asia/Riyadh'', ''UTC'', ''America/New_York''). Automatically set from country timezone.';
    
    RAISE NOTICE 'Added timezone column to stores table';
  ELSE
    RAISE NOTICE 'Column stores.timezone already exists';
  END IF;
END $$;

-- =====================================================
-- PART 3: Check if countries table has timezone column
-- =====================================================

DO $$
DECLARE
  v_countries_has_timezone BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'countries'
    AND column_name = 'timezone'
  ) INTO v_countries_has_timezone;
  
  IF NOT v_countries_has_timezone THEN
    RAISE NOTICE 'countries table does not have timezone column - will need to add it or use default';
  ELSE
    RAISE NOTICE 'countries table has timezone column';
  END IF;
END $$;

-- =====================================================
-- PART 4: Update RPC function to use store_categories array and set timezone
-- =====================================================

DROP FUNCTION IF EXISTS public.save_store_details_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_store_details_onboarding(
  p_store_name TEXT DEFAULT NULL,
  p_store_name_ar TEXT DEFAULT NULL,
  p_category_ids UUID[] DEFAULT NULL,
  p_store_types TEXT[] DEFAULT ARRAY['online'],
  p_country_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_opening_hours JSONB DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_business_profile_id UUID;
  v_store_id UUID;
  v_store_slug TEXT;
  v_store_type TEXT;
  v_final_address TEXT;
  v_city_name TEXT;
  v_has_retail_type BOOLEAN;
  v_final_opening_hours JSONB;
  v_country_timezone TEXT;
  v_final_categories UUID[];
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Get business_profile_id for this user
  SELECT id INTO v_business_profile_id
  FROM public.business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_business_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Business profile not found. Please complete step 1 first.');
  END IF;
  
  -- Validate at least one store name is provided
  IF (p_store_name IS NULL OR TRIM(p_store_name) = '') AND (p_store_name_ar IS NULL OR TRIM(p_store_name_ar) = '') THEN
    RETURN json_build_object('success', false, 'error', 'At least one store name (English or Arabic) is required');
  END IF;
  
  -- Check if 'retail' is in the store_types array
  v_has_retail_type := 'retail' = ANY(p_store_types);
  
  -- Get timezone from country
  IF p_country_id IS NOT NULL THEN
    BEGIN
      -- Try to get timezone from countries table
      SELECT timezone INTO v_country_timezone
      FROM public.countries
      WHERE id = p_country_id;
      
      -- If timezone column doesn't exist or is NULL, use default based on common timezones
      IF v_country_timezone IS NULL THEN
        -- Try to infer from country ISO2 code (common timezones)
        SELECT 
          CASE 
            WHEN iso2 = 'SA' THEN 'Asia/Riyadh'
            WHEN iso2 = 'AE' THEN 'Asia/Dubai'
            WHEN iso2 = 'EG' THEN 'Africa/Cairo'
            WHEN iso2 = 'US' THEN 'America/New_York'
            WHEN iso2 = 'GB' THEN 'Europe/London'
            ELSE 'UTC'
          END INTO v_country_timezone
        FROM public.countries
        WHERE id = p_country_id;
      END IF;
    EXCEPTION
      WHEN undefined_column THEN
        -- timezone column doesn't exist in countries table, use default
        v_country_timezone := 'UTC';
      WHEN OTHERS THEN
        v_country_timezone := 'UTC';
    END;
  ELSE
    v_country_timezone := 'UTC';
  END IF;
  
  -- Set categories array (from multi-select dropdown)
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    v_final_categories := p_category_ids;
  ELSE
    v_final_categories := ARRAY[]::UUID[];
  END IF;
  
  -- Generate slug from store name (prefer English, fallback to Arabic)
  v_store_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NULLIF(TRIM(p_store_name), ''), NULLIF(TRIM(p_store_name_ar), ''), 'store'),
    '[^a-z0-9]+', '-', 'g'
  ));
  
  -- Remove leading/trailing hyphens
  v_store_slug := TRIM(BOTH '-' FROM v_store_slug);
  
  -- Ensure slug is unique
  WHILE EXISTS (SELECT 1 FROM public.stores WHERE slug = v_store_slug) LOOP
    v_store_slug := v_store_slug || '-' || FLOOR(RANDOM() * 10000)::TEXT;
  END LOOP;
  
  -- Determine primary store type (use first from array)
  v_store_type := COALESCE(p_store_types[1], 'online');
  
  -- Only set address if store type includes 'retail' or 'hybrid'
  -- Address is NULL for online-only stores
  IF 'retail' = ANY(p_store_types) OR 'hybrid' = ANY(p_store_types) THEN
    v_final_address := p_address;
  ELSE
    v_final_address := NULL;
  END IF;
  
  -- Only set opening_hours if 'retail' is in the store_types array
  -- Opening hours are only relevant for physical/retail stores
  IF v_has_retail_type THEN
    v_final_opening_hours := p_opening_hours;
  ELSE
    v_final_opening_hours := NULL;
  END IF;
  
  -- Get city name from cities table
  IF p_city_id IS NOT NULL THEN
    SELECT name INTO v_city_name FROM public.cities WHERE id = p_city_id;
  END IF;
  
  -- Check if store already exists for this business
  SELECT id INTO v_store_id
  FROM public.stores
  WHERE business_id = v_business_profile_id
  LIMIT 1;
  
  IF v_store_id IS NOT NULL THEN
    -- Update existing store
    UPDATE public.stores
    SET 
      name = NULLIF(TRIM(p_store_name), ''),
      name_ar = NULLIF(TRIM(p_store_name_ar), ''),
      country = p_country_id,
      city = COALESCE(v_city_name, p_city_id::TEXT),
      address = v_final_address,
      store_type = v_store_type::store_type_enum,
      opening_hours = v_final_opening_hours,
      store_categories = v_final_categories, -- Update categories array directly
      timezone = v_country_timezone, -- Update timezone from country
      logo_url = COALESCE(p_logo_url, logo_url),
      updated_at = NOW()
    WHERE id = v_store_id;
  ELSE
    -- Create new store
    INSERT INTO public.stores (
      business_id,
      name,
      name_ar,
      slug,
      country,
      city,
      address,
      store_type,
      opening_hours,
      store_categories, -- Save categories array directly
      timezone, -- Set timezone from country
      logo_url,
      platform,
      is_active
    )
    VALUES (
      v_business_profile_id,
      NULLIF(TRIM(p_store_name), ''),
      NULLIF(TRIM(p_store_name_ar), ''),
      v_store_slug,
      p_country_id,
      COALESCE(v_city_name, p_city_id::TEXT),
      v_final_address,
      v_store_type::store_type_enum,
      v_final_opening_hours,
      v_final_categories, -- Categories array
      v_country_timezone, -- Timezone from country
      p_logo_url,
      'haady',
      true
    )
    RETURNING id INTO v_store_id;
  END IF;
  
  -- Verify store was created/updated successfully
  IF v_store_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Failed to create or update store');
  END IF;
  
  -- Update business_profile with store_id (link to the store)
  UPDATE public.business_profile
  SET 
    store_id = v_store_id,
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  RETURN json_build_object(
    'success', true,
    'store_id', v_store_id,
    'business_profile_id', v_business_profile_id,
    'slug', v_store_slug,
    'timezone', v_country_timezone,
    'categories_count', array_length(v_final_categories, 1)
  );
  
EXCEPTION
  WHEN undefined_column THEN
    -- If column doesn't exist, return error with helpful message
    RETURN json_build_object(
      'success', false, 
      'error', 'Database schema error. Please contact support.'
    );
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_store_details_onboarding IS 'Step 2 of onboarding: Saves store details to stores table. Categories saved as UUID array in store_categories column. Timezone automatically set from country. Opening hours only set when retail is in store_types array.';
GRANT EXECUTE ON FUNCTION public.save_store_details_onboarding TO authenticated;

-- =====================================================
-- PART 5: Backfill timezone for existing stores
-- =====================================================

DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update timezone for existing stores based on their country
  UPDATE public.stores s
  SET timezone = COALESCE(
    (
      SELECT c.timezone 
      FROM public.countries c 
      WHERE c.id = s.country
    ),
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.countries c 
        WHERE c.id = s.country AND c.iso2 = 'SA'
      ) THEN 'Asia/Riyadh'
      WHEN EXISTS (
        SELECT 1 FROM public.countries c 
        WHERE c.id = s.country AND c.iso2 = 'AE'
      ) THEN 'Asia/Dubai'
      WHEN EXISTS (
        SELECT 1 FROM public.countries c 
        WHERE c.id = s.country AND c.iso2 = 'EG'
      ) THEN 'Africa/Cairo'
      ELSE 'UTC'
    END
  )
  WHERE s.timezone IS NULL 
    AND s.country IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated timezone for % existing stores', v_updated_count;
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Skipping timezone backfill - column may not exist';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error backfilling timezone: %', SQLERRM;
END $$;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Added store_categories and timezone updates';
  RAISE NOTICE '  - Added store_categories UUID[] column to stores';
  RAISE NOTICE '  - Categories saved directly from multi-select dropdown';
  RAISE NOTICE '  - Timezone automatically set from country';
  RAISE NOTICE '  - Updated RPC function to handle both';
  RAISE NOTICE '  - Backfilled timezone for existing stores';
  RAISE NOTICE '==============================================';
END $$;

