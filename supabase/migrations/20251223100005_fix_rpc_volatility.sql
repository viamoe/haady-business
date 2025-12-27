-- ================================
-- Fix RPC function volatility
-- ================================
-- Description: Removes STABLE marking from save_personal_details_onboarding
--              since it performs INSERT/UPDATE operations which require VOLATILE
-- Date: 2025-12-23

-- =====================================================
-- Fix save_personal_details_onboarding volatility
-- =====================================================

DROP FUNCTION IF EXISTS public.save_personal_details_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_personal_details_onboarding(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_country_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
-- Removed STABLE - functions that INSERT/UPDATE must be VOLATILE (default)
AS $$
DECLARE
  v_user_id UUID;
  v_business_profile_id UUID;
  v_role_enum business_role_enum;
  v_user_email TEXT;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Validate required fields
  IF p_full_name IS NULL OR TRIM(p_full_name) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Full name is required');
  END IF;
  
  IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Phone number is required');
  END IF;
  
  -- Cast role to enum with error handling
  BEGIN
    v_role_enum := COALESCE(p_role, 'owner')::business_role_enum;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_role_enum := 'owner';
  END;
  
  -- Get user email: ALWAYS prefer parameter
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    v_user_email := TRIM(p_email);
  ELSE
    -- Fallback: query auth.users (slow, but only if email not provided)
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id LIMIT 1;
    IF v_user_email IS NULL THEN
      v_user_email := v_user_id::TEXT || '@haady.app';
    END IF;
  END IF;
  
  -- Fast lookup using index (should be instant)
  SELECT id INTO v_business_profile_id
  FROM public.business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_business_profile_id IS NOT NULL THEN
    -- Update existing - use direct WHERE clause for speed
    UPDATE public.business_profile
    SET 
      full_name = TRIM(p_full_name),
      phone = TRIM(p_phone),
      business_country = p_country_id,
      role = v_role_enum,
      contact_email = COALESCE(v_user_email, contact_email),
      onboarding_step = 'business-setup',
      updated_at = NOW()
    WHERE id = v_business_profile_id;
  ELSE
    -- Insert new - minimal columns
    INSERT INTO public.business_profile (
      auth_user_id,
      full_name,
      phone,
      business_country,
      role,
      contact_email,
      status,
      kyc_status,
      is_active,
      is_primary_contact,
      onboarding_step
    )
    VALUES (
      v_user_id,
      TRIM(p_full_name),
      TRIM(p_phone),
      p_country_id,
      v_role_enum,
      v_user_email,
      'pending',
      'pending',
      true,
      true,
      'business-setup'
    )
    RETURNING id INTO v_business_profile_id;
  END IF;
  
  -- Return immediately
  RETURN json_build_object(
    'success', true,
    'business_profile_id', v_business_profile_id,
    'onboarding_step', 'business-setup'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO anon;

COMMENT ON FUNCTION public.save_personal_details_onboarding IS 'Step 1 of onboarding: Saves personal details. VOLATILE (default) since it performs INSERT/UPDATE operations.';

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Fixed RPC function volatility';
  RAISE NOTICE '  - Removed STABLE marking (functions that INSERT/UPDATE must be VOLATILE)';
  RAISE NOTICE '  - Function now allows INSERT/UPDATE operations';
  RAISE NOTICE '==============================================';
END $$;

