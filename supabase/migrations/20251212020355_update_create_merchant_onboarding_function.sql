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

-- Ensure owner_id column exists in merchants table
DO $$
BEGIN
  -- Drop existing constraint if it exists (might have different definition)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'merchants' 
    AND constraint_name = 'merchants_owner_id_fkey_cascade'
  ) THEN
    ALTER TABLE public.merchants 
    DROP CONSTRAINT merchants_owner_id_fkey_cascade;
    
    RAISE NOTICE 'Dropped existing merchants_owner_id_fkey_cascade constraint';
  END IF;
  
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchants' 
    AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.merchants 
    ADD COLUMN owner_id UUID;
    
    COMMENT ON COLUMN public.merchants.owner_id IS 'Reference to the merchant_user who owns this merchant account';
    
    RAISE NOTICE 'Added owner_id column to merchants table';
  END IF;
  
  -- Add foreign key constraint
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'merchants' 
    AND constraint_name = 'merchants_owner_id_fkey'
  ) THEN
    ALTER TABLE public.merchants 
    ADD CONSTRAINT merchants_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES public.merchant_users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added merchants_owner_id_fkey constraint';
  END IF;
END $$;

-- Drop the existing function first (if it exists) to allow changing signature
DROP FUNCTION IF EXISTS public.create_merchant_onboarding(
  TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, UUID, TEXT
) CASCADE;

-- Also try to drop with different possible signatures
DROP FUNCTION IF EXISTS public.create_merchant_onboarding CASCADE;

-- Create the RPC function to use merchant_users.phone
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
BEGIN
  -- Store parameter values in variables to avoid ambiguity with column names
  v_preferred_country := COALESCE(preferred_country, 'AE');
  v_preferred_language := COALESCE(preferred_language, 'en');
  
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
    -- Use variables to avoid ambiguity between parameters and column names
    UPDATE merchant_users
    SET 
      phone = user_phone,
      full_name = user_full_name,
      preferred_country = v_preferred_country,
      preferred_language = v_preferred_language
    WHERE merchant_users.id = v_existing_merchant_user_id
    RETURNING merchant_users.id INTO v_merchant_user_id;
    
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
    
    -- Update merchant_user with the new merchant_id
    UPDATE merchant_users
    SET merchant_id = v_merchant_id
    WHERE id = v_merchant_user_id;
    
    -- Get user email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Update merchants with owner_id and contact_email
    -- Only set owner_id if merchant_user_id is valid
    IF v_merchant_user_id IS NOT NULL THEN
      UPDATE merchants
      SET 
        owner_id = v_merchant_user_id,
        contact_email = v_user_email
      WHERE id = v_merchant_id;
    ELSE
      -- Fallback: update only contact_email if merchant_user_id is null
      UPDATE merchants
      SET contact_email = v_user_email
      WHERE id = v_merchant_id;
    END IF;
    
    -- Update or insert into public.users
    INSERT INTO public.users (id, full_name, phone, country)
    VALUES (v_user_id, user_full_name, user_phone, v_preferred_country)
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      country = EXCLUDED.country,
      updated_at = NOW();
  ELSE
    -- No merchant_user exists, create both merchant and merchant_user
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
    -- Only set owner_id if merchant_user_id is valid
    IF v_merchant_user_id IS NOT NULL THEN
      UPDATE merchants
      SET 
        owner_id = v_merchant_user_id,
        contact_email = v_user_email
      WHERE id = v_merchant_id;
    ELSE
      -- Fallback: update only contact_email if merchant_user_id is null
      UPDATE merchants
      SET contact_email = v_user_email
      WHERE id = v_merchant_id;
    END IF;
    
    -- Update or insert into public.users
    INSERT INTO public.users (id, full_name, phone, country)
    VALUES (v_user_id, user_full_name, user_phone, v_preferred_country)
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      country = EXCLUDED.country,
      updated_at = NOW();
  END IF;
  
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

