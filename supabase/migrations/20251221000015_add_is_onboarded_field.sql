-- ================================
-- Add is_onboarded field to business_profile
-- ================================
-- Description: Adds is_onboarded boolean field to track if user has completed onboarding
-- Date: 2025-12-21

-- =====================================================
-- PART 1: Add is_onboarded column to business_profile
-- =====================================================

DO $$
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'business_profile'
    AND column_name = 'is_onboarded'
  ) THEN
    -- Add is_onboarded column (defaults to false)
    ALTER TABLE public.business_profile
    ADD COLUMN is_onboarded BOOLEAN DEFAULT false NOT NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.business_profile.is_onboarded IS 'Indicates if the user has completed all onboarding steps. Set to true when onboarding is complete.';
    
    RAISE NOTICE 'Added is_onboarded column to business_profile';
  ELSE
    RAISE NOTICE 'is_onboarded column already exists';
  END IF;
END $$;

-- =====================================================
-- PART 2: Update complete_onboarding RPC
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
  
  -- Mark onboarding as complete by setting onboarding_step to NULL and is_onboarded to true
  UPDATE public.business_profile
  SET 
    onboarding_step = NULL, -- NULL means completed
    is_onboarded = true, -- Set to true when onboarding is complete
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  RETURN json_build_object(
    'success', true,
    'business_profile_id', v_business_profile_id,
    'onboarding_step', NULL,
    'is_onboarded', true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.complete_onboarding IS 'Marks the onboarding process as complete by setting business_profile.onboarding_step to NULL and is_onboarded to true';
GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;

-- =====================================================
-- PART 3: Update save_store_connection_onboarding RPC
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
  
  -- Update onboarding_step to NULL and is_onboarded to true (onboarding complete after connecting store)
  UPDATE public.business_profile
  SET 
    onboarding_step = NULL, -- Onboarding complete
    is_onboarded = true, -- Set to true when onboarding is complete
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  RETURN json_build_object(
    'success', true,
    'connection_id', v_connection_id,
    'store_id', v_store_id,
    'onboarding_step', NULL,
    'is_onboarded', true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_store_connection_onboarding IS 'Step 3 of onboarding (optional): Saves external platform connection to store_connections table and sets onboarding_step to NULL and is_onboarded to true (completed)';
GRANT EXECUTE ON FUNCTION public.save_store_connection_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Added is_onboarded field';
  RAISE NOTICE '  - Added is_onboarded column (BOOLEAN, default false)';
  RAISE NOTICE '  - Updated complete_onboarding to set is_onboarded = true';
  RAISE NOTICE '  - Updated save_store_connection_onboarding to set is_onboarded = true';
  RAISE NOTICE '==============================================';
END $$;

