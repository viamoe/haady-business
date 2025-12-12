-- ================================
-- Update public.users country_id from merchant country
-- ================================
-- Description: Update the create_merchant_onboarding RPC function to also update
--              public.users.country_id based on the merchant's country
-- Date: 2024-12-13

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.create_merchant_onboarding(
  TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, UUID, TEXT, TEXT, TEXT
) CASCADE;

DROP FUNCTION IF EXISTS public.create_merchant_onboarding CASCADE;

-- Recreate the function with country_id update for public.users
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
  v_preferred_country := COALESCE(preferred_country, 'SA');
  v_preferred_language := COALESCE(preferred_language, 'en');
  
  -- Look up country_id from the countries table directly
  SELECT id INTO v_country_id
  FROM public.countries
  WHERE iso2 = UPPER(v_preferred_country)
  LIMIT 1;
  
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
      ORDER BY name ASC
      LIMIT 1;
    END IF;
  END IF;
  
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if user already has a merchant_user record
  SELECT id, merchant_id INTO v_existing_merchant_user_id, v_merchant_id
  FROM merchant_users
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  -- If user already has a merchant (merchant_id is not null), reject
  IF v_merchant_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a merchant account');
  END IF;
  
  -- If merchant_user exists but merchant_id is null, update it instead of creating new
  IF v_existing_merchant_user_id IS NOT NULL THEN
    -- Update existing merchant_user record with new data
    UPDATE merchant_users
    SET 
      phone = user_phone,
      full_name = user_full_name,
      preferred_country = v_preferred_country,
      preferred_language = v_preferred_language
    WHERE merchant_users.id = v_existing_merchant_user_id
    RETURNING merchant_users.id INTO v_merchant_user_id;
    
    -- Create merchant with country_id (UUID foreign key)
    INSERT INTO merchants (
      name, 
      status, 
      kyc_status,
      business_type_id,
      country
    )
    VALUES (
      business_name, 
      'pending', 
      'pending',
      selected_business_type_id,
      v_country_id
    )
    RETURNING id INTO v_merchant_id;
    
    -- Update merchant_user with the new merchant_id
    UPDATE merchant_users
    SET merchant_id = v_merchant_id
    WHERE id = v_merchant_user_id;
    
    -- Get user email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Update merchants with owner_id and contact_email
    IF v_merchant_user_id IS NOT NULL THEN
      UPDATE merchants
      SET 
        owner_id = v_merchant_user_id,
        contact_email = v_user_email
      WHERE id = v_merchant_id;
    ELSE
      UPDATE merchants
      SET contact_email = v_user_email
      WHERE id = v_merchant_id;
    END IF;
    
    -- Update or insert into public.users with country_id from merchant
    INSERT INTO public.users (id, full_name, phone, country_id)
    VALUES (v_user_id, user_full_name, user_phone, v_country_id)
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      country_id = v_country_id,
      updated_at = NOW();
  ELSE
    -- No merchant_user exists, create both merchant and merchant_user
    -- Create merchant with country_id (UUID foreign key)
    INSERT INTO merchants (
      name, 
      status, 
      kyc_status,
      business_type_id,
      country
    )
    VALUES (
      business_name, 
      'pending', 
      'pending',
      selected_business_type_id,
      v_country_id
    )
    RETURNING id INTO v_merchant_id;
    
    -- Create merchant_user link with phone number, full name, country, language, and set as primary contact
    INSERT INTO merchant_users (
      merchant_id, 
      auth_user_id, 
      role, 
      phone,
      full_name,
      preferred_country,
      preferred_language,
      is_primary_contact
    )
    VALUES (
      v_merchant_id, 
      v_user_id, 
      'manager',
      user_phone,
      user_full_name,
      v_preferred_country,
      v_preferred_language,
      true  -- First user is primary contact
    )
    RETURNING id INTO v_merchant_user_id;
    
    -- Get user email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Update merchants with owner_id and contact_email
    IF v_merchant_user_id IS NOT NULL THEN
      UPDATE merchants
      SET 
        owner_id = v_merchant_user_id,
        contact_email = v_user_email
      WHERE id = v_merchant_id;
    ELSE
      UPDATE merchants
      SET contact_email = v_user_email
      WHERE id = v_merchant_id;
    END IF;
    
    -- Update or insert into public.users with country_id from merchant
    INSERT INTO public.users (id, full_name, phone, country_id)
    VALUES (v_user_id, user_full_name, user_phone, v_country_id)
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      country_id = v_country_id,
      updated_at = NOW();
  END IF;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'merchant_id', v_merchant_id,
    'merchant_user_id', v_merchant_user_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update comment to function
COMMENT ON FUNCTION public.create_merchant_onboarding IS 'Creates a merchant account and links it to the authenticated user. Sets merchants.country as UUID foreign key referencing countries table. Updates public.users.country_id to match the merchant country. Default country is Saudi Arabia (SA). Phone number is stored in merchant_users.phone, not merchants.contact_phone.';

