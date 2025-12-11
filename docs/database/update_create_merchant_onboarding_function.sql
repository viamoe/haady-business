-- Update create_merchant_onboarding RPC function to use merchant_users.phone instead of merchants.contact_phone
-- This function creates a merchant account and links it to the authenticated user

-- First, ensure the phone column exists in merchant_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchant_users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.merchant_users 
    ADD COLUMN phone TEXT;
    
    COMMENT ON COLUMN public.merchant_users.phone IS 'User phone number with country code (e.g., +966501234567)';
    
    RAISE NOTICE 'Added phone column to merchant_users table';
  END IF;
END $$;

-- Update the RPC function to use merchant_users.phone
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
  user_ip_address TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_merchant_id UUID;
  v_merchant_user_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if user already has a merchant
  SELECT merchant_id INTO v_merchant_id
  FROM merchant_users
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_merchant_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a merchant account');
  END IF;
  
  -- Create merchant (using business_type_id UUID, not business_type text)
  -- Note: merchants table does NOT have contact_phone or legal_name columns
  INSERT INTO merchants (
    name, 
    status, 
    kyc_status,
    business_type_id
  )
  VALUES (
    business_name, 
    'pending', 
    'pending',
    selected_business_type_id
  )
  RETURNING id INTO v_merchant_id;
  
  -- Create merchant_user link with phone number, full name, and set as primary contact
  INSERT INTO merchant_users (
    merchant_id, 
    auth_user_id, 
    role, 
    phone,
    full_name,
    is_primary_contact
  )
  VALUES (
    v_merchant_id, 
    v_user_id, 
    'manager',
    user_phone,
    user_full_name,
    true  -- First user is primary contact
  )
  RETURNING id INTO v_merchant_user_id;
  
  -- Update merchant with owner_id (reference to the merchant_user who created it)
  UPDATE merchants
  SET owner_id = v_merchant_user_id
  WHERE id = v_merchant_id;
  
  -- Note: Store creation is skipped during onboarding
  -- Store will be created later when user sets up their merchant account
  
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

-- Add comment to function
COMMENT ON FUNCTION public.create_merchant_onboarding IS 'Creates a merchant account and links it to the authenticated user. Phone number is stored in merchant_users.phone, not merchants.contact_phone.';

