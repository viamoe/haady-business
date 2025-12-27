-- ================================
-- Update save_store_details_onboarding to set onboarding_step
-- ================================
-- Description: Updates save_store_details_onboarding RPC to set onboarding_step to 'connect-store' after step 2
-- Date: 2025-12-21

-- =====================================================
-- Update save_store_details_onboarding RPC
-- =====================================================

DROP FUNCTION IF EXISTS public.save_store_details_onboarding CASCADE;

-- Recreate the function with onboarding_step update
-- This is based on the latest version from 20251221000010_fix_store_type_enum_values.sql
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
  v_store_types_array store_type_enum[];
  v_final_address TEXT;
  v_city_name TEXT;
  v_has_retail_type BOOLEAN;
  v_final_opening_hours JSONB;
  v_country_timezone TEXT;
  v_final_categories UUID[];
  v_store_type_text TEXT;
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
  
  -- Convert store_types text array to enum array with proper error handling
  v_store_types_array := ARRAY[]::store_type_enum[];
  
  IF p_store_types IS NOT NULL AND array_length(p_store_types, 1) > 0 THEN
    -- Build array one by one with error handling
    FOR v_store_type_text IN SELECT unnest(p_store_types)
    LOOP
      BEGIN
        -- Try to cast to enum
        v_store_types_array := array_append(v_store_types_array, v_store_type_text::store_type_enum);
      EXCEPTION
        WHEN invalid_text_representation THEN
          -- Invalid enum value, skip it
          RAISE NOTICE 'Skipping invalid store type: %', v_store_type_text;
      END;
    END LOOP;
    
    -- If no valid types after filtering, default to online
    IF array_length(v_store_types_array, 1) = 0 THEN
      v_store_types_array := ARRAY['online']::store_type_enum[];
    END IF;
  ELSE
    v_store_types_array := ARRAY['online']::store_type_enum[];
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
      store_type = v_store_types_array, -- Save as array
      opening_hours = v_final_opening_hours,
      store_categories = v_final_categories,
      timezone = v_country_timezone,
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
      store_type, -- Array of store types
      opening_hours,
      store_categories,
      timezone,
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
      v_store_types_array, -- Array of store types
      v_final_opening_hours,
      v_final_categories,
      v_country_timezone,
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
  
  -- Update business_profile with store_id (link to the store) and move to next step
  UPDATE public.business_profile
  SET 
    store_id = v_store_id,
    onboarding_step = 'connect-store', -- Move to next step
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  RETURN json_build_object(
    'success', true,
    'store_id', v_store_id,
    'business_profile_id', v_business_profile_id,
    'slug', v_store_slug,
    'timezone', v_country_timezone,
    'categories_count', array_length(v_final_categories, 1),
    'store_types', v_store_types_array,
    'onboarding_step', 'connect-store'
  );
  
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Invalid store type value. Valid values are: online, retail, hybrid, pop_up'
    );
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

COMMENT ON FUNCTION public.save_store_details_onboarding IS 'Step 2 of onboarding: Saves store details to stores table and sets onboarding_step to connect-store. Store types saved as array (multi-select). Categories saved as UUID array. Timezone automatically set from country. Opening hours only set when retail is in store_types array.';
GRANT EXECUTE ON FUNCTION public.save_store_details_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Updated save_store_details_onboarding';
  RAISE NOTICE '  - Now sets onboarding_step to connect-store';
  RAISE NOTICE '  - Returns onboarding_step in response';
  RAISE NOTICE '==============================================';
END $$;

