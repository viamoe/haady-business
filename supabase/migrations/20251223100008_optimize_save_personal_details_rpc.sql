-- ================================
-- Optimize save_personal_details RPC function
-- ================================
-- Description: Optimizes the RPC function for faster execution using UPSERT pattern
-- Date: 2025-12-23

-- =====================================================
-- PART 1: Add unique constraint on auth_user_id if it doesn't exist
-- =====================================================

DO $$
BEGIN
  -- Check if unique constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.business_profile'::regclass
    AND contype = 'u'
    AND conkey::text LIKE '%auth_user_id%'
  ) THEN
    -- Try to create unique index (will fail if duplicates exist, which is fine)
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profile_auth_user_id_unique
      ON public.business_profile(auth_user_id)
      WHERE auth_user_id IS NOT NULL;
      
      RAISE NOTICE 'Created unique index on business_profile.auth_user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create unique index (duplicates may exist): %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Unique constraint on business_profile.auth_user_id already exists';
  END IF;
END $$;

-- =====================================================
-- PART 2: Optimize the RPC function
-- =====================================================

DROP FUNCTION IF EXISTS public.save_personal_details CASCADE;

CREATE OR REPLACE FUNCTION public.save_personal_details(
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_country_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
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
  v_updated BOOLEAN := false;
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
  
  -- Get user email: prefer parameter, fallback to auth.users query
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    v_user_email := TRIM(p_email);
  ELSE
    -- Fallback: query auth.users (only if email not provided)
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id LIMIT 1;
    IF v_user_email IS NULL THEN
      v_user_email := v_user_id::TEXT || '@haady.app';
    END IF;
  END IF;
  
  -- Optimized: Try UPDATE first (fast with index), get ID if updated
  UPDATE public.business_profile
  SET 
    full_name = TRIM(p_full_name),
    phone = TRIM(p_phone),
    business_country = p_country_id,
    role = v_role_enum,
    contact_email = COALESCE(v_user_email, contact_email),
    onboarding_step = 'business-setup',
    updated_at = NOW()
  WHERE auth_user_id = v_user_id
  RETURNING id INTO v_business_profile_id;
  
  -- If UPDATE didn't affect any rows, INSERT new profile
  IF v_business_profile_id IS NULL THEN
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
  
  -- Return success with business_profile_id and next step
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.save_personal_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_personal_details TO anon;

-- Add comment
COMMENT ON FUNCTION public.save_personal_details IS 'Optimized: Saves personal details and creates/updates business profile using efficient UPSERT pattern. Sets onboarding_step to business-setup.';

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Optimized save_personal_details RPC function';
  RAISE NOTICE '  - Uses UPDATE first, then INSERT pattern';
  RAISE NOTICE '  - Eliminates separate SELECT query';
  RAISE NOTICE '  - Faster execution with index on auth_user_id';
  RAISE NOTICE '==============================================';
END $$;

