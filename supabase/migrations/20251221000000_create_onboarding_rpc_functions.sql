-- ================================
-- Onboarding RPC Functions
-- ================================
-- Description: Creates 3 separate RPC functions for the onboarding flow:
--   1. save_personal_details_onboarding - Step 1: Personal details -> business_profile
--   2. save_store_details_onboarding - Step 2: Store setup -> stores
--   3. save_store_connection_onboarding - Step 3: Connect store -> store_connections (optional)
-- Date: 2025-12-21

-- =====================================================
-- STEP 1: Personal Details -> business_profile
-- =====================================================

DROP FUNCTION IF EXISTS public.save_personal_details_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_personal_details_onboarding(
  p_full_name TEXT,
  p_phone TEXT,
  p_country_id UUID,
  p_role TEXT DEFAULT 'owner',
  p_preferred_language TEXT DEFAULT 'en'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_business_profile_id UUID;
  v_existing_profile_id UUID;
  v_country_iso2 TEXT;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get country ISO2 code for preferred_country
  SELECT iso2 INTO v_country_iso2 
  FROM public.countries 
  WHERE id = p_country_id;
  
  -- Check if business_profile already exists for this user
  SELECT id INTO v_existing_profile_id
  FROM public.business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_existing_profile_id IS NOT NULL THEN
    -- Update existing profile
    UPDATE public.business_profile
    SET 
      full_name = p_full_name,
      phone = p_phone,
      role = p_role,
      contact_email = v_user_email,
      business_country = p_country_id,
      preferred_country = COALESCE(v_country_iso2, 'SA'),
      preferred_language = p_preferred_language,
      updated_at = NOW()
    WHERE id = v_existing_profile_id
    RETURNING id INTO v_business_profile_id;
  ELSE
    -- Create new business_profile
    INSERT INTO public.business_profile (
      auth_user_id,
      full_name,
      phone,
      role,
      contact_email,
      business_country,
      preferred_country,
      preferred_language,
      status,
      kyc_status,
      is_active,
      is_primary_contact
    )
    VALUES (
      v_user_id,
      p_full_name,
      p_phone,
      p_role,
      v_user_email,
      p_country_id,
      COALESCE(v_country_iso2, 'SA'),
      p_preferred_language,
      'pending',
      'pending',
      true,
      true
    )
    RETURNING id INTO v_business_profile_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'business_profile_id', v_business_profile_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_personal_details_onboarding IS 'Step 1 of onboarding: Saves personal details to business_profile table';
GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO authenticated;


-- =====================================================
-- STEP 2: Store Details -> stores
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
  
  -- Only set address if store type includes 'retail'
  -- Address is NULL for online-only stores
  IF 'retail' = ANY(p_store_types) OR 'hybrid' = ANY(p_store_types) THEN
    v_final_address := p_address;
  ELSE
    v_final_address := NULL;
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
      opening_hours = CASE 
        WHEN 'retail' = ANY(p_store_types) OR 'hybrid' = ANY(p_store_types) OR 'pop_up' = ANY(p_store_types)
        THEN p_opening_hours 
        ELSE NULL 
      END,
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
      CASE 
        WHEN 'retail' = ANY(p_store_types) OR 'hybrid' = ANY(p_store_types) OR 'pop_up' = ANY(p_store_types)
        THEN p_opening_hours 
        ELSE NULL 
      END,
      p_logo_url,
      'haady',
      true
    )
    RETURNING id INTO v_store_id;
  END IF;
  
  -- Update business_profile with business_name (using store name)
  UPDATE public.business_profile
  SET 
    business_name = COALESCE(NULLIF(TRIM(p_store_name), ''), NULLIF(TRIM(p_store_name_ar), '')),
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  -- Handle category associations (if junction table exists)
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    -- Delete existing associations
    DELETE FROM public.store_categories WHERE store_id = v_store_id;
    
    -- Insert new associations
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

COMMENT ON FUNCTION public.save_store_details_onboarding IS 'Step 2 of onboarding: Saves store details to stores table. Address is only saved for retail/hybrid store types.';
GRANT EXECUTE ON FUNCTION public.save_store_details_onboarding TO authenticated;


-- =====================================================
-- STEP 3: Store Connection -> store_connections (Optional)
-- =====================================================

DROP FUNCTION IF EXISTS public.save_store_connection_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_store_connection_onboarding(
  p_platform TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_token_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_external_store_id TEXT DEFAULT NULL,
  p_store_url TEXT DEFAULT NULL,
  p_webhook_secret TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_business_profile_id UUID;
  v_store_id UUID;
  v_connection_id UUID;
  v_existing_connection_id UUID;
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
  
  -- Get store_id for this business
  SELECT id INTO v_store_id
  FROM public.stores
  WHERE business_id = v_business_profile_id
  LIMIT 1;
  
  IF v_store_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Store not found. Please complete step 2 first.');
  END IF;
  
  -- Check if connection already exists for this store
  SELECT id INTO v_existing_connection_id
  FROM public.store_connections
  WHERE store_id = v_store_id
  LIMIT 1;
  
  IF v_existing_connection_id IS NOT NULL THEN
    -- Update existing connection
    UPDATE public.store_connections
    SET 
      access_token = p_access_token,
      refresh_token = p_refresh_token,
      token_expires_at = p_token_expires_at,
      external_store_id = p_external_store_id,
      webhook_secret = p_webhook_secret,
      connection_status = 'connected',
      updated_at = NOW()
    WHERE id = v_existing_connection_id
    RETURNING id INTO v_connection_id;
  ELSE
    -- Create new connection
    INSERT INTO public.store_connections (
      store_id,
      access_token,
      refresh_token,
      token_expires_at,
      external_store_id,
      webhook_secret,
      connection_status,
      sync_status
    )
    VALUES (
      v_store_id,
      p_access_token,
      p_refresh_token,
      p_token_expires_at,
      p_external_store_id,
      p_webhook_secret,
      'connected',
      'pending'
    )
    RETURNING id INTO v_connection_id;
  END IF;
  
  -- Update store platform
  UPDATE public.stores
  SET 
    platform = p_platform::store_platform,
    updated_at = NOW()
  WHERE id = v_store_id;
  
  RETURN json_build_object(
    'success', true,
    'connection_id', v_connection_id,
    'store_id', v_store_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_store_connection_onboarding IS 'Step 3 of onboarding (optional): Saves external platform connection to store_connections table';
GRANT EXECUTE ON FUNCTION public.save_store_connection_onboarding TO authenticated;


-- =====================================================
-- Helper: Mark onboarding as complete
-- =====================================================

DROP FUNCTION IF EXISTS public.complete_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_business_profile_id UUID;
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
    RETURN json_build_object('success', false, 'error', 'Business profile not found');
  END IF;
  
  -- Update business profile to mark onboarding as complete
  UPDATE public.business_profile
  SET 
    status = 'active',
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  RETURN json_build_object(
    'success', true,
    'business_profile_id', v_business_profile_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.complete_onboarding IS 'Marks the onboarding process as complete by setting business_profile status to active';
GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;


-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Created onboarding RPC functions:';
  RAISE NOTICE '  1. save_personal_details_onboarding - Personal info -> business_profile';
  RAISE NOTICE '  2. save_store_details_onboarding - Store setup -> stores';
  RAISE NOTICE '  3. save_store_connection_onboarding - Connect platform -> store_connections';
  RAISE NOTICE '  4. complete_onboarding - Mark onboarding as complete';
  RAISE NOTICE '';
  RAISE NOTICE 'Flow:';
  RAISE NOTICE '  - All users get a business_profile record (Step 1)';
  RAISE NOTICE '  - All users get a store record (Step 2)';
  RAISE NOTICE '  - Only users who connect external platforms get store_connections (Step 3 - optional)';
  RAISE NOTICE '  - Address in stores is only set for retail/hybrid store types';
  RAISE NOTICE '==============================================';
END $$;

