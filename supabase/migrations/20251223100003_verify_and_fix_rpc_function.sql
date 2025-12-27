-- ================================
-- Verify and fix RPC function - ensure p_email parameter exists
-- ================================
-- Description: Verifies the function signature and recreates it if needed
-- Date: 2025-12-23

-- =====================================================
-- PART 1: Check current function signature
-- =====================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
  v_param_count INTEGER;
  v_has_email_param BOOLEAN := false;
  r RECORD;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'save_personal_details_onboarding'
  ) INTO v_func_exists;
  
  IF v_func_exists THEN
    -- Check parameters
    FOR r IN
      SELECT 
        p.proname,
        pg_get_function_arguments(p.oid) as args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'save_personal_details_onboarding'
    LOOP
      RAISE NOTICE 'Current function signature: %(%)', r.proname, r.args;
      
      -- Check if p_email is in the arguments
      IF r.args LIKE '%p_email%' THEN
        v_has_email_param := true;
        RAISE NOTICE '✓ Function has p_email parameter';
      ELSE
        RAISE NOTICE '⚠ Function does NOT have p_email parameter - will recreate';
      END IF;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠ Function does not exist - will create';
  END IF;
END $$;

-- =====================================================
-- PART 2: Force recreate function with correct signature
-- =====================================================

-- Drop function completely to ensure clean recreation
DROP FUNCTION IF EXISTS public.save_personal_details_onboarding CASCADE;

-- Recreate with explicit parameter list including p_email
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
STABLE
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
  
  -- Get user email: ALWAYS prefer parameter, NEVER query auth.users if provided
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    v_user_email := TRIM(p_email);
  ELSE
    -- Only query auth.users if email not provided (should be rare)
    -- This is the slow operation we're trying to avoid
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    -- If still NULL, use a default
    IF v_user_email IS NULL THEN
      v_user_email := v_user_id::TEXT || '@haady.app';
    END IF;
  END IF;
  
  -- Check if business_profile already exists (using index for fast lookup)
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
      contact_email = COALESCE(v_user_email, contact_email),
      onboarding_step = 'business-setup',
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
      'business-setup'
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO anon;

COMMENT ON FUNCTION public.save_personal_details_onboarding IS 'Step 1 of onboarding: Saves personal details. Optimized with p_email parameter and STABLE marking for better performance.';

-- =====================================================
-- PART 3: Verify function was created correctly
-- =====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Verifying function signature...';
  
  FOR r IN
    SELECT 
      p.proname,
      pg_get_function_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'save_personal_details_onboarding'
  LOOP
    RAISE NOTICE 'Function: %(%)', r.proname, r.args;
    
    IF r.args LIKE '%p_email%' THEN
      RAISE NOTICE '✓ Function has p_email parameter - SUCCESS!';
    ELSE
      RAISE WARNING '⚠ Function does NOT have p_email parameter!';
    END IF;
  END LOOP;
  
  RAISE NOTICE '==============================================';
END $$;

