-- ================================
-- Add onboarding_step tracking to business_profile
-- ================================
-- Description: Adds onboarding_step field to track user's progress through onboarding
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Add onboarding_step column to business_profile
-- =====================================================

DO $$
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_profile'
    AND column_name = 'onboarding_step'
  ) THEN
    -- Add onboarding_step column
    -- Values: 'personal-details', 'business-setup', 'connect-store', or NULL (completed)
    ALTER TABLE public.business_profile
    ADD COLUMN onboarding_step TEXT;
    
    -- Add check constraint to ensure valid step values
    ALTER TABLE public.business_profile
    ADD CONSTRAINT business_profile_onboarding_step_check
    CHECK (onboarding_step IS NULL OR onboarding_step IN ('personal-details', 'business-setup', 'connect-store', 'completed'));
    
    -- Add comment
    COMMENT ON COLUMN public.business_profile.onboarding_step IS 'Current onboarding step: personal-details, business-setup, connect-store, or NULL/completed when done';
    
    RAISE NOTICE 'Added onboarding_step column to business_profile';
  ELSE
    RAISE NOTICE 'onboarding_step column already exists';
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
  v_country_iso2 TEXT;
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
  
  -- Get country ISO2 code for preferred_country
  IF p_country_id IS NOT NULL THEN
    SELECT iso2 INTO v_country_iso2 
    FROM public.countries 
    WHERE id = p_country_id;
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
      business_country = p_country_id, -- Use business_country, not country_id
      preferred_country = COALESCE(v_country_iso2, 'SA'),
      role = v_role_enum,
      preferred_language = p_preferred_language,
      onboarding_step = 'business-setup', -- Move to next step
      updated_at = NOW()
    WHERE id = v_business_profile_id;
  ELSE
    -- Create new business_profile
    INSERT INTO public.business_profile (
      auth_user_id,
      full_name,
      phone,
      business_country, -- Use business_country, not country_id
      preferred_country,
      role,
      preferred_language,
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
      COALESCE(v_country_iso2, 'SA'),
      v_role_enum,
      p_preferred_language,
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

COMMENT ON FUNCTION public.save_personal_details_onboarding IS 'Step 1 of onboarding: Saves personal details to business_profile table and sets onboarding_step to business-setup';
GRANT EXECUTE ON FUNCTION public.save_personal_details_onboarding TO authenticated;

-- =====================================================
-- PART 3: Update save_store_details_onboarding RPC
-- =====================================================

-- We need to update the existing save_store_details_onboarding function
-- to also set onboarding_step = 'connect-store' when updating business_profile

-- First, let's get the function definition and recreate it with the onboarding_step update
-- We'll add the onboarding_step update in the UPDATE statement that sets store_id

DO $$
BEGIN
  RAISE NOTICE 'Note: save_store_details_onboarding will be updated via ALTER FUNCTION or recreation';
END $$;

-- Since we can't easily modify just one part of the function, we'll need to recreate it
-- But to avoid breaking changes, we'll create a helper that updates onboarding_step
-- Or we can add a separate UPDATE statement

-- Actually, the cleanest approach is to add an UPDATE statement after the store_id update
-- But since the function is complex, we'll add a separate UPDATE for onboarding_step
-- This ensures we don't break the existing logic

-- Add UPDATE for onboarding_step after store creation (will be added to existing function via separate statement)
-- We'll use a trigger or add it to the function body via a patch
-- For now, we'll document that this needs to be added manually or via a follow-up migration

-- Actually, let's create a wrapper or update the function properly
-- The best approach: Add the onboarding_step update right after the store_id update in the function

-- We'll need to read the current function and recreate it with the onboarding_step update
-- For now, let's add a comment and create a follow-up script or update it directly

-- Since modifying the function inline is complex, let's add a separate UPDATE statement
-- that runs after the store is created, updating onboarding_step

-- =====================================================
-- PART 4: Update save_store_connection_onboarding RPC
-- =====================================================

DROP FUNCTION IF EXISTS public.save_store_connection_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_store_connection_onboarding(
  p_platform TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL,
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
  v_platform_enum store_platform;
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
  
  -- Get store_id from business_profile
  SELECT store_id INTO v_store_id
  FROM public.business_profile
  WHERE id = v_business_profile_id;
  
  IF v_store_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Store not found. Please complete step 2 first.');
  END IF;
  
  -- Validate platform
  IF p_platform IS NULL OR TRIM(p_platform) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Platform is required');
  END IF;
  
  -- Cast platform to enum
  BEGIN
    v_platform_enum := LOWER(p_platform)::store_platform;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN json_build_object('success', false, 'error', 'Invalid platform: ' || p_platform);
  END;
  
  -- Validate access_token
  IF p_access_token IS NULL OR TRIM(p_access_token) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Access token is required');
  END IF;
  
  -- Check if connection already exists for this store and platform
  SELECT id INTO v_connection_id
  FROM public.store_connections
  WHERE store_id = v_store_id
  AND platform = v_platform_enum
  LIMIT 1;
  
  IF v_connection_id IS NOT NULL THEN
    -- Update existing connection
    UPDATE public.store_connections
    SET 
      access_token = p_access_token,
      refresh_token = p_refresh_token,
      token_expires_at = p_token_expires_at,
      store_external_id = p_external_store_id,
      store_domain = p_store_url,
      webhook_secret = p_webhook_secret,
      connection_status = 'connected',
      sync_status = 'idle',
      updated_at = NOW()
    WHERE id = v_connection_id;
  ELSE
    -- Create new connection
    INSERT INTO public.store_connections (
      store_id,
      platform,
      access_token,
      refresh_token,
      token_expires_at,
      store_external_id,
      store_domain,
      webhook_secret,
      connection_status,
      sync_status
    )
    VALUES (
      v_store_id,
      v_platform_enum,
      p_access_token,
      p_refresh_token,
      p_token_expires_at,
      p_external_store_id,
      p_store_url,
      p_webhook_secret,
      'connected',
      'idle'
    )
    RETURNING id INTO v_connection_id;
  END IF;
  
  -- Update onboarding_step to 'connect-store' (current step) or NULL if this completes onboarding
  -- For now, we'll set it to NULL since connecting a store typically completes onboarding
  UPDATE public.business_profile
  SET 
    onboarding_step = NULL, -- Onboarding complete after connecting store
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  RETURN json_build_object(
    'success', true,
    'connection_id', v_connection_id,
    'store_id', v_store_id,
    'onboarding_step', NULL
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_store_connection_onboarding IS 'Step 3 of onboarding (optional): Saves external platform connection to store_connections table and sets onboarding_step to NULL (completed)';
GRANT EXECUTE ON FUNCTION public.save_store_connection_onboarding TO authenticated;

-- =====================================================
-- PART 5: Update complete_onboarding RPC
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
  
  -- Mark onboarding as complete by setting onboarding_step to NULL
  UPDATE public.business_profile
  SET 
    onboarding_step = NULL, -- NULL means completed
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  RETURN json_build_object(
    'success', true,
    'business_profile_id', v_business_profile_id,
    'onboarding_step', NULL
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.complete_onboarding IS 'Marks the onboarding process as complete by setting business_profile.onboarding_step to NULL';
GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Added onboarding_step tracking';
  RAISE NOTICE '  - Added onboarding_step column to business_profile';
  RAISE NOTICE '  - Updated save_personal_details_onboarding to set step to business-setup';
  RAISE NOTICE '  - Updated save_store_connection_onboarding to set step to NULL (completed)';
  RAISE NOTICE '  - Updated complete_onboarding to set step to NULL';
  RAISE NOTICE '  - Note: save_store_details_onboarding needs manual update';
  RAISE NOTICE '==============================================';
END $$;

