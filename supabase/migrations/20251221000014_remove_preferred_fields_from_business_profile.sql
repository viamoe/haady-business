-- ================================
-- Remove preferred_country and preferred_language from business_profile
-- ================================
-- Description: Removes preferred_country and preferred_language columns from business_profile table
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Remove columns from business_profile
-- =====================================================

DO $$
BEGIN
  -- Remove preferred_country column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_profile'
    AND column_name = 'preferred_country'
  ) THEN
    ALTER TABLE public.business_profile
    DROP COLUMN preferred_country;
    
    RAISE NOTICE 'Removed preferred_country column from business_profile';
  ELSE
    RAISE NOTICE 'preferred_country column does not exist';
  END IF;
  
  -- Remove preferred_language column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_profile'
    AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE public.business_profile
    DROP COLUMN preferred_language;
    
    RAISE NOTICE 'Removed preferred_language column from business_profile';
  ELSE
    RAISE NOTICE 'preferred_language column does not exist';
  END IF;
END $$;

-- =====================================================
-- PART 2: Update save_personal_details_onboarding RPC
-- =====================================================

DROP FUNCTION IF EXISTS public.save_personal_details_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_personal_details_onboarding(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_country_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_preferred_language TEXT DEFAULT NULL
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
    v_role_enum := p_role::business_role_enum;
  EXCEPTION
    WHEN invalid_text_representation THEN
      -- Invalid enum value, default to 'owner'
      v_role_enum := 'owner';
  END;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
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

COMMENT ON FUNCTION public.save_personal_details_onboarding IS 'Step 1 of onboarding: Saves personal details to business_profile table and sets onboarding_step to business-setup. Uses business_country column.';
GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Removed preferred_country and preferred_language';
  RAISE NOTICE '  - Dropped preferred_country column';
  RAISE NOTICE '  - Dropped preferred_language column';
  RAISE NOTICE '  - Updated save_personal_details_onboarding RPC';
  RAISE NOTICE '==============================================';
END $$;

