-- ================================
-- Fix store_connections table structure and RPC
-- ================================
-- Description: 
--   1. Adds platform column back to store_connections (needed to track which platform the connection is for)
--   2. Renames token_expires_at to expires_at if needed
--   3. Adds connected_at column
--   4. Updates save_store_connection_onboarding RPC to set all required fields
-- Date: 2025-12-22

-- =====================================================
-- PART 1: Add platform column to store_connections if not exists
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'platform'
  ) THEN
    ALTER TABLE public.store_connections 
    ADD COLUMN platform store_platform;
    
    RAISE NOTICE 'Added platform column to store_connections';
  ELSE
    RAISE NOTICE 'platform column already exists in store_connections';
  END IF;
END $$;

-- =====================================================
-- PART 2: Rename token_expires_at to expires_at if needed
-- =====================================================

DO $$
BEGIN
  -- Check if token_expires_at exists and expires_at doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'token_expires_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.store_connections 
    RENAME COLUMN token_expires_at TO expires_at;
    
    RAISE NOTICE 'Renamed token_expires_at to expires_at';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'expires_at'
  ) THEN
    -- Neither column exists, add expires_at
    ALTER TABLE public.store_connections 
    ADD COLUMN expires_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added expires_at column to store_connections';
  ELSE
    RAISE NOTICE 'expires_at column already exists in store_connections';
  END IF;
END $$;

-- =====================================================
-- PART 3: Add connected_at column if not exists
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'connected_at'
  ) THEN
    ALTER TABLE public.store_connections 
    ADD COLUMN connected_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added connected_at column to store_connections';
  ELSE
    RAISE NOTICE 'connected_at column already exists in store_connections';
  END IF;
END $$;

-- =====================================================
-- PART 4: Add comments for new columns
-- =====================================================

COMMENT ON COLUMN public.store_connections.platform IS 'E-commerce platform: salla, shopify, zid, woocommerce';
COMMENT ON COLUMN public.store_connections.expires_at IS 'When the access token expires';
COMMENT ON COLUMN public.store_connections.connected_at IS 'Timestamp when the connection was established or last reconnected';

-- =====================================================
-- PART 5: Create index on platform for faster lookups
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_store_connections_platform 
ON public.store_connections(platform);

-- =====================================================
-- PART 6: Update save_store_connection_onboarding RPC
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
  
  -- Update onboarding_step to 'summary' (move to summary step, not complete yet)
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

COMMENT ON FUNCTION public.save_store_connection_onboarding IS 'Step 3 of onboarding (optional): Saves external platform connection to store_connections table with all OAuth data and sets onboarding_step to summary';
GRANT EXECUTE ON FUNCTION public.save_store_connection_onboarding TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Fixed store_connections table and RPC';
  RAISE NOTICE '  - Added platform column to store_connections';
  RAISE NOTICE '  - Added/renamed expires_at column';
  RAISE NOTICE '  - Added connected_at column';
  RAISE NOTICE '  - Updated save_store_connection_onboarding RPC';
  RAISE NOTICE '==============================================';
END $$;

