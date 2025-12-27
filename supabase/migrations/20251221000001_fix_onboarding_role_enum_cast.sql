-- ================================
-- Fix role enum casting in onboarding RPC
-- ================================
-- Description: Fixes the role column type casting from TEXT to business_role_enum
-- Date: 2025-12-21

-- Drop and recreate the function with proper enum casting
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
  v_role_enum business_role_enum;
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
  
  -- Cast role to enum, default to 'owner' if invalid
  BEGIN
    v_role_enum := p_role::business_role_enum;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role_enum := 'owner'::business_role_enum;
  END;
  
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
      role = v_role_enum,
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
      v_role_enum,
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

COMMENT ON FUNCTION public.save_personal_details_onboarding IS 'Step 1 of onboarding: Saves personal details to business_profile table (with proper enum casting)';
GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Fixed role enum casting in save_personal_details_onboarding';
END $$;

