-- ================================
-- Change store_type to array and prepare for logo upload
-- ================================
-- Description: Changes store_type from single enum to array of enums to support multi-select
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Change store_type column to array
-- =====================================================

DO $$
DECLARE
  v_current_type TEXT;
  v_column_exists BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'store_type'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    -- Get current type
    SELECT udt_name INTO v_current_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'store_type';
    
    -- If it's not already an array, convert it
    IF v_current_type NOT LIKE '%[]%' AND v_current_type != 'ARRAY' THEN
      -- Drop default first
      ALTER TABLE public.stores 
      ALTER COLUMN store_type DROP DEFAULT;
      
      -- Convert single enum value to array
      ALTER TABLE public.stores 
      ALTER COLUMN store_type TYPE store_type_enum[] 
      USING ARRAY[store_type]::store_type_enum[];
      
      -- Add default back
      ALTER TABLE public.stores 
      ALTER COLUMN store_type SET DEFAULT ARRAY['online']::store_type_enum[];
      
      RAISE NOTICE 'Converted store_type from single enum to array';
    ELSE
      RAISE NOTICE 'store_type is already an array type';
    END IF;
  ELSE
    -- Column doesn't exist, create it as array
    ALTER TABLE public.stores 
    ADD COLUMN store_type store_type_enum[] DEFAULT ARRAY['online']::store_type_enum[];
    
    RAISE NOTICE 'Created store_type column as array';
  END IF;
END $$;

-- Update comment
COMMENT ON COLUMN public.stores.store_type IS 'Array of store types: online, retail, hybrid, pop_up. Supports multi-select from dropdown.';

-- =====================================================
-- PART 2: Update RPC function to handle array store_type and logo upload
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
  v_store_types_array store_type_enum[];
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
  
  -- Convert store_types text array to enum array
  IF p_store_types IS NOT NULL AND array_length(p_store_types, 1) > 0 THEN
    SELECT array_agg(store_type_enum::store_type_enum)
    INTO v_store_types_array
    FROM unnest(p_store_types) AS store_type_enum
    WHERE store_type_enum::text IN ('online', 'retail', 'hybrid', 'pop_up');
    
    -- If no valid types, default to online
    IF v_store_types_array IS NULL OR array_length(v_store_types_array, 1) = 0 THEN
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
    'categories_count', array_length(v_final_categories, 1),
    'store_types', v_store_types_array
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

COMMENT ON FUNCTION public.save_store_details_onboarding IS 'Step 2 of onboarding: Saves store details to stores table. Store types saved as array (multi-select). Categories saved as UUID array. Timezone automatically set from country. Opening hours only set when retail is in store_types array.';
GRANT EXECUTE ON FUNCTION public.save_store_details_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Updated store_type to support arrays';
  RAISE NOTICE '  - Changed store_type from single enum to enum array';
  RAISE NOTICE '  - Updated RPC to handle multi-select store types';
  RAISE NOTICE '  - Logo URL can be passed to RPC (upload handled separately)';
  RAISE NOTICE '==============================================';
END $$;

