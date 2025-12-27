-- ================================
-- Ensure opening_hours column exists in stores table
-- ================================
-- Description: Force creates opening_hours column if it doesn't exist
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Force add opening_hours column
-- =====================================================

DO $$
BEGIN
  -- Drop column if it exists with wrong type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'opening_hours'
    AND data_type != 'jsonb'
  ) THEN
    ALTER TABLE public.stores DROP COLUMN opening_hours;
    RAISE NOTICE 'Dropped existing opening_hours column with wrong type';
  END IF;
  
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'opening_hours'
  ) THEN
    ALTER TABLE public.stores 
    ADD COLUMN opening_hours JSONB DEFAULT NULL;
    
    RAISE NOTICE 'Added opening_hours column to stores table';
  ELSE
    RAISE NOTICE 'Column stores.opening_hours already exists';
  END IF;
END $$;

-- =====================================================
-- PART 2: Update column comment
-- =====================================================

COMMENT ON COLUMN public.stores.opening_hours IS 'JSON object containing store opening hours. Format: {day: {open: ''HH:MM'', close: ''HH:MM'', closed: boolean}}. Only set for retail store types.';

-- =====================================================
-- PART 3: Verify column exists
-- =====================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_column_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'opening_hours'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    SELECT data_type INTO v_column_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'opening_hours';
    
    RAISE NOTICE 'Verification: opening_hours column exists with type: %', v_column_type;
  ELSE
    RAISE EXCEPTION 'opening_hours column was not created successfully';
  END IF;
END $$;

-- =====================================================
-- PART 4: Recreate RPC function to ensure it works
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
      p_logo_url,
      'haady',
      true
    )
    RETURNING id INTO v_store_id;
  END IF;
  
  -- Update business_profile with store_id (link to the store)
  UPDATE public.business_profile
  SET 
    store_id = v_store_id,
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  -- Handle category associations (if junction table exists)
  -- Store categories is multi-select, so we handle all selected categories
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    -- Delete existing associations
    DELETE FROM public.store_categories WHERE store_id = v_store_id;
    
    -- Insert new associations (all selected categories)
    INSERT INTO public.store_categories (store_id, category_id)
    SELECT v_store_id, unnest(p_category_ids)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'store_id', v_store_id,
    'business_profile_id', v_business_profile_id,
    'slug', v_store_slug
  );
  
EXCEPTION
  WHEN undefined_column THEN
    -- If opening_hours column doesn't exist, return error with helpful message
    RETURN json_build_object(
      'success', false, 
      'error', 'Database schema error: opening_hours column not found. Please contact support.'
    );
  WHEN undefined_table THEN
    -- store_categories table might not exist, that's okay
    RETURN json_build_object(
      'success', true,
      'store_id', v_store_id,
      'business_profile_id', v_business_profile_id,
      'slug', v_store_slug,
      'warning', 'Category associations skipped - table not found'
    );
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_store_details_onboarding IS 'Step 2 of onboarding: Saves store details to stores table. Opening hours only set when retail is in store_types array. Categories and store_types are multi-select.';
GRANT EXECUTE ON FUNCTION public.save_store_details_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Ensured opening_hours column exists';
  RAISE NOTICE '  - Verified/created opening_hours column';
  RAISE NOTICE '  - Recreated RPC function with error handling';
  RAISE NOTICE '  - Opening hours only set when retail in store_types';
  RAISE NOTICE '==============================================';
END $$;

