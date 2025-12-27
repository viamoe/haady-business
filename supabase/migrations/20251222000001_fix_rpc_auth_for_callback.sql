-- ================================
-- Fix RPC authentication for callback route
-- ================================
-- Description: Updates save_store_connection_onboarding to accept user_id parameter
--              for server-side calls from the callback route
-- Date: 2025-12-22

DROP FUNCTION IF EXISTS public.save_store_connection_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.save_store_connection_onboarding(
  p_platform TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL,
  p_refresh_token TEXT DEFAULT NULL,
  p_token_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_external_store_id TEXT DEFAULT NULL,
  p_store_url TEXT DEFAULT NULL,
  p_webhook_secret TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL  -- Optional: for server-side calls
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
  -- Get user ID: prefer parameter, fallback to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
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
      expires_at = p_token_expires_at,
      store_external_id = p_external_store_id,
      store_domain = p_store_url,
      connection_status = 'connected',
      sync_status = 'idle',
      connected_at = NOW(),
      updated_at = NOW(),
      last_error = NULL
    WHERE id = v_connection_id;
  ELSE
    -- Create new connection
    INSERT INTO public.store_connections (
      store_id,
      platform,
      access_token,
      refresh_token,
      expires_at,
      store_external_id,
      store_domain,
      connection_status,
      sync_status,
      connected_at,
      created_at,
      updated_at
    )
    VALUES (
      v_store_id,
      v_platform_enum,
      p_access_token,
      p_refresh_token,
      p_token_expires_at,
      p_external_store_id,
      p_store_url,
      'connected',
      'idle',
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_connection_id;
  END IF;
  
  -- Also update the stores.platform field
  UPDATE public.stores
  SET 
    platform = v_platform_enum,
    updated_at = NOW()
  WHERE id = v_store_id;
  
  -- Update onboarding_step to 'summary'
  UPDATE public.business_profile
  SET 
    onboarding_step = 'summary',
    updated_at = NOW()
  WHERE id = v_business_profile_id;
  
  RETURN json_build_object(
    'success', true,
    'connection_id', v_connection_id,
    'store_id', v_store_id,
    'platform', p_platform,
    'connected_at', NOW(),
    'onboarding_step', 'summary'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.save_store_connection_onboarding IS 'Step 3 of onboarding: Saves external platform connection. Accepts optional p_user_id for server-side calls.';
GRANT EXECUTE ON FUNCTION public.save_store_connection_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_store_connection_onboarding TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'Updated save_store_connection_onboarding to accept p_user_id parameter';
END $$;

