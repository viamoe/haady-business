-- ================================
-- Fix business_profile column reference error
-- ================================
-- Description: Fixes the error "column business_profile of relation business_profile does not exist"
--              by using proper table aliases in the function
-- Date: 2025-12-15

-- Drop and recreate the function with proper table aliases
DROP FUNCTION IF EXISTS public.create_business_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.create_business_onboarding(
  user_full_name TEXT,
  user_phone TEXT,
  business_name TEXT,
  selected_business_type_id UUID,
  selected_category_id UUID DEFAULT NULL,
  store_name TEXT DEFAULT NULL,
  store_city TEXT DEFAULT NULL,
  store_lat DOUBLE PRECISION DEFAULT NULL,
  store_lng DOUBLE PRECISION DEFAULT NULL,
  store_address TEXT DEFAULT NULL,
  term_version_id UUID DEFAULT NULL,
  user_ip_address TEXT DEFAULT NULL,
  preferred_country TEXT DEFAULT NULL,
  preferred_language TEXT DEFAULT NULL,
  business_country UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_profile_id UUID;
  v_user_id UUID;
  v_existing_profile_id UUID;
  v_preferred_country TEXT;
  v_preferred_language TEXT;
  v_user_email TEXT;
  v_business_name TEXT; -- Local variable to avoid ambiguity
BEGIN
  v_preferred_country := COALESCE(preferred_country, 'AE');
  v_preferred_language := COALESCE(preferred_language, 'en');
  v_business_name := business_name; -- Store parameter in local variable
  
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if business_profile already exists for this user with a business
  -- Use table alias to avoid ambiguity
  SELECT bp.id INTO v_existing_profile_id
  FROM public.business_profile bp
  WHERE bp.auth_user_id = v_user_id
  AND bp.business_name IS NOT NULL
  LIMIT 1;
  
  -- If user already has a business, reject
  IF v_existing_profile_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a business account');
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Check if profile exists without business
  SELECT bp.id INTO v_existing_profile_id
  FROM public.business_profile bp
  WHERE bp.auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_existing_profile_id IS NOT NULL THEN
    -- Update existing profile with business info
    -- Use table alias in UPDATE
    UPDATE public.business_profile bp
    SET 
      phone = user_phone,
      full_name = user_full_name,
      business_name = v_business_name, -- Use local variable
      contact_email = v_user_email,
      status = 'pending',
      kyc_status = 'pending',
      is_active = true,
      business_type_id = selected_business_type_id,
      business_country = business_country, -- Set business_country from selected country ID
      preferred_country = v_preferred_country,
      preferred_language = v_preferred_language,
      is_primary_contact = true,
      updated_at = NOW()
    WHERE bp.id = v_existing_profile_id
    RETURNING bp.id INTO v_business_profile_id;
  ELSE
    -- Create new business_profile with all info
    INSERT INTO public.business_profile (
      auth_user_id, 
      role, 
      phone, 
      full_name,
      business_name,
      contact_email,
      status,
      kyc_status,
      is_active,
      business_type_id,
      business_country,
      preferred_country, 
      preferred_language, 
      is_primary_contact
    )
    VALUES (
      v_user_id, 
      'owner', 
      user_phone, 
      user_full_name,
      v_business_name, -- Use local variable
      v_user_email,
      'pending',
      'pending',
      true,
      selected_business_type_id,
      business_country, -- Set business_country from selected country ID
      v_preferred_country, 
      v_preferred_language, 
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
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.create_business_onboarding IS 'Creates or updates business profile with business information';

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Fixed business_profile column reference error';
  RAISE NOTICE '==============================================';
END $$;

