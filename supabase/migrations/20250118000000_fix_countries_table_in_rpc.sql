-- ================================
-- Fix countries table reference in create_merchant_onboarding RPC
-- ================================
-- Description: Update the RPC function to use 'countries' table directly
--              instead of trying 'countries_master' first
-- Date: 2025-01-18

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.create_merchant_onboarding(
  TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, UUID, TEXT, TEXT, TEXT
) CASCADE;

DROP FUNCTION IF EXISTS public.create_merchant_onboarding CASCADE;

-- Recreate the function using 'countries' table directly
CREATE OR REPLACE FUNCTION public.create_merchant_onboarding(
  user_full_name TEXT,
  user_phone TEXT,
  business_name TEXT,
  selected_business_type_id UUID,
  selected_category_id UUID DEFAULT NULL,
  store_name TEXT DEFAULT NULL,
  store_city TEXT DEFAULT NULL,
  store_lat DOUBLE PRECISION DEFAULT NULL,
  store_lng DOUBLE PRECISION DEFAULT NULL,
  store_address TEXT DEFAULT NULL,
  term_version_id UUID DEFAULT NULL,
  user_ip_address TEXT DEFAULT NULL,
  preferred_country TEXT DEFAULT NULL,
  preferred_language TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_merchant_id UUID;
  v_merchant_user_id UUID;
  v_user_id UUID;
  v_existing_merchant_user_id UUID;
  v_preferred_country TEXT;
  v_preferred_language TEXT;
  v_user_email TEXT;
  v_country_id UUID;
BEGIN
  -- Store parameter values in variables to avoid ambiguity with column names
  v_preferred_country := preferred_country;
  v_preferred_language := preferred_language;
  
  -- Get the current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Look up country_id from countries table
  IF v_preferred_country IS NOT NULL AND v_preferred_country != '' THEN
    SELECT id INTO v_country_id
    FROM public.countries
    WHERE iso2 = UPPER(v_preferred_country)
    LIMIT 1;
  END IF;
  
  -- If country not found, try to get default (SA) or first available country
  IF v_country_id IS NULL THEN
    SELECT id INTO v_country_id
    FROM public.countries
    WHERE iso2 = 'SA'
    LIMIT 1;
    
    -- If still not found, get first available country
    IF v_country_id IS NULL THEN
      SELECT id INTO v_country_id
      FROM public.countries
      ORDER BY name
      LIMIT 1;
    END IF;
  END IF;
  
  -- Check if merchant_user already exists for this user
  SELECT id INTO v_existing_merchant_user_id
  FROM public.merchant_users
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_existing_merchant_user_id IS NOT NULL THEN
    -- Get existing merchant_id
    SELECT merchant_id INTO v_merchant_id
    FROM public.merchant_users
    WHERE id = v_existing_merchant_user_id;
    
    -- Update existing merchant
    UPDATE public.merchants
    SET 
      name = business_name,
      country = v_country_id,
      updated_at = NOW()
    WHERE id = v_merchant_id;
    
    RETURN json_build_object(
      'success', true,
      'merchant_id', v_merchant_id,
      'merchant_user_id', v_existing_merchant_user_id,
      'message', 'Merchant updated successfully'
    );
  END IF;
  
  -- Create new merchant
  INSERT INTO public.merchants (
    name,
    country,
    created_at,
    updated_at
  ) VALUES (
    business_name,
    v_country_id,
    NOW(),
    NOW()
  ) RETURNING id INTO v_merchant_id;
  
  -- Create merchant_user
  INSERT INTO public.merchant_users (
    merchant_id,
    auth_user_id,
    full_name,
    phone,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_merchant_id,
    v_user_id,
    user_full_name,
    user_phone,
    v_user_email,
    'owner',
    NOW(),
    NOW()
  ) RETURNING id INTO v_merchant_user_id;
  
  RETURN json_build_object(
    'success', true,
    'merchant_id', v_merchant_id,
    'merchant_user_id', v_merchant_user_id,
    'message', 'Merchant created successfully'
  );
END;
$$;

COMMENT ON FUNCTION public.create_merchant_onboarding IS 'Creates a merchant account and links it to the authenticated user. Sets merchants.country as UUID foreign key referencing countries.id. Phone number is stored in merchant_users.phone, not merchants.contact_phone.';

