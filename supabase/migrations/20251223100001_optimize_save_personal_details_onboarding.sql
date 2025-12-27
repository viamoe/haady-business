-- ================================
-- Optimize save_personal_details_onboarding RPC function
-- ================================
-- Description: Optimizes the RPC function to accept email as parameter
--              and avoid slow query to auth.users table
-- Date: 2025-12-22

-- =====================================================
-- Update save_personal_details_onboarding RPC
-- =====================================================

DROP FUNCTION IF EXISTS public.save_personal_details_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_personal_details_onboarding(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_country_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL  -- Add email parameter to avoid querying auth.users
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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
      -- Invalid enum value, default to 'owner'
      v_role_enum := 'owner';
  END;
  
  -- Get user email: prefer parameter, fallback to query (but only if needed)
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    v_user_email := TRIM(p_email);
  ELSE
    -- Only query auth.users if email not provided (should be rare)
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    -- If still NULL, use a default
    IF v_user_email IS NULL THEN
      v_user_email := v_user_id::TEXT || '@haady.app';
    END IF;
  END IF;
  
  -- Check if business_profile already exists
  SELECT id INTO v_business_profile_id
  FROM public.business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_business_profile_id IS NOT NULL THEN
    -- Update existing business_profile
    UPDATE public.business_profile
    SET 
      full_name = TRIM(p_full_name),
      phone = TRIM(p_phone),
      business_country = p_country_id,
      role = v_role_enum,
      contact_email = COALESCE(v_user_email, contact_email), -- Only update if we have email
      onboarding_step = 'business-setup', -- Move to next step
      updated_at = NOW()
    WHERE id = v_business_profile_id;
  ELSE
    -- Create new business_profile
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
      'business-setup' -- Set to next step
    )
    RETURNING id INTO v_business_profile_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'business_profile_id', v_business_profile_id,
    'onboarding_step', 'business-setup'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_personal_details_onboarding IS 'Step 1 of onboarding: Saves personal details to business_profile table and sets onboarding_step to business-setup. Optimized to accept email parameter to avoid slow auth.users query.';
GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Optimized save_personal_details_onboarding';
  RAISE NOTICE '  - Added p_email parameter to avoid querying auth.users';
  RAISE NOTICE '  - Falls back to auth.users query only if email not provided';
  RAISE NOTICE '  - Should significantly improve performance';
  RAISE NOTICE '==============================================';
END $$;

