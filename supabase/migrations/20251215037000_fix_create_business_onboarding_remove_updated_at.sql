-- ================================
-- Fix create_business_onboarding function - remove updated_at reference
-- ================================
-- Description: The business_profile table doesn't have updated_at column
-- Date: 2025-12-15

-- Drop and recreate the function without updated_at reference
DROP FUNCTION IF EXISTS public.create_business_onboarding CASCADE;

CREATE OR REPLACE FUNCTION public.create_business_onboarding(
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
  v_business_id UUID;
  v_business_profile_id UUID;
  v_user_id UUID;
  v_existing_profile_id UUID;
  v_existing_business_id UUID;
  v_preferred_country TEXT;
  v_preferred_language TEXT;
  v_user_email TEXT;
BEGIN
  v_preferred_country := COALESCE(preferred_country, 'AE');
  v_preferred_language := COALESCE(preferred_language, 'en');
  
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if business_profile already exists for this user
  SELECT id, business_id INTO v_existing_profile_id, v_existing_business_id
  FROM business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  -- If user already has a business, reject
  IF v_existing_business_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a business account');
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  IF v_existing_profile_id IS NOT NULL THEN
    -- business_profile exists but no business - update the profile
    UPDATE business_profile
    SET 
      phone = user_phone,
      full_name = user_full_name,
      preferred_country = v_preferred_country,
      preferred_language = v_preferred_language
    WHERE id = v_existing_profile_id
    RETURNING id INTO v_business_profile_id;
    
    -- Create the business
    INSERT INTO businesses (name, status, kyc_status, business_type_id)
    VALUES (business_name, 'pending', 'pending', selected_business_type_id)
    RETURNING id INTO v_business_id;
    
    -- Link business_profile to business
    UPDATE business_profile
    SET business_id = v_business_id
    WHERE id = v_business_profile_id;
    
    -- Set owner and contact email on business
    UPDATE businesses
    SET owner_id = v_business_profile_id, contact_email = v_user_email
    WHERE id = v_business_id;
    
  ELSE
    -- No business_profile exists - create both business and profile
    
    -- Create the business first
    INSERT INTO businesses (name, status, kyc_status, business_type_id)
    VALUES (business_name, 'pending', 'pending', selected_business_type_id)
    RETURNING id INTO v_business_id;
    
    -- Create the business_profile
    INSERT INTO business_profile (
      business_id, 
      auth_user_id, 
      role, 
      phone, 
      full_name,
      preferred_country, 
      preferred_language, 
      is_primary_contact
    )
    VALUES (
      v_business_id, 
      v_user_id, 
      'manager', 
      user_phone, 
      user_full_name,
      v_preferred_country, 
      v_preferred_language, 
      true
    )
    RETURNING id INTO v_business_profile_id;
    
    -- Set owner and contact email on business
    UPDATE businesses
    SET owner_id = v_business_profile_id, contact_email = v_user_email
    WHERE id = v_business_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'business_id', v_business_id,
    'business_profile_id', v_business_profile_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.create_business_onboarding IS 'Creates a business account and links it to the authenticated user via business_profile table.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_business_onboarding TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Fixed create_business_onboarding function - removed updated_at reference';
END $$;

