-- ================================
-- Rename merchant_users table to business_users
-- ================================
-- Description: Rename merchant_users to business_users to better reflect that users can have multiple stores
-- Date: 2025-12-15

-- Step 1: Rename the table
ALTER TABLE IF EXISTS public.merchant_users RENAME TO business_users;

-- Step 2: Rename associated indexes (if any exist)
ALTER INDEX IF EXISTS merchant_users_pkey RENAME TO business_users_pkey;
ALTER INDEX IF EXISTS merchant_users_auth_user_id_idx RENAME TO business_users_auth_user_id_idx;
ALTER INDEX IF EXISTS merchant_users_merchant_id_idx RENAME TO business_users_merchant_id_idx;
ALTER INDEX IF EXISTS idx_merchant_users_auth_user_id RENAME TO idx_business_users_auth_user_id;
ALTER INDEX IF EXISTS idx_merchant_users_merchant_id RENAME TO idx_business_users_merchant_id;

-- Step 3: Rename foreign key constraints
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- Find and rename foreign key constraints that reference merchant_users
  FOR v_constraint_name IN
    SELECT constraint_name
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name LIKE '%merchant_users%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.business_users RENAME CONSTRAINT %I TO %I', 
        v_constraint_name, 
        REPLACE(v_constraint_name, 'merchant_users', 'business_users'));
      RAISE NOTICE 'Renamed constraint % to %', v_constraint_name, REPLACE(v_constraint_name, 'merchant_users', 'business_users');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename constraint %: %', v_constraint_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 4: Update foreign key references in other tables
-- Update merchants.owner_id constraint
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE public.merchants DROP CONSTRAINT IF EXISTS merchants_owner_id_fkey;
  
  -- Add new constraint referencing business_users
  ALTER TABLE public.merchants 
  ADD CONSTRAINT merchants_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.business_users(id) ON DELETE SET NULL;
  
  RAISE NOTICE 'Updated merchants.owner_id foreign key to reference business_users';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update merchants.owner_id constraint: %', SQLERRM;
END $$;

-- Step 5: Update the create_merchant_onboarding function to use business_users
DROP FUNCTION IF EXISTS public.create_merchant_onboarding CASCADE;

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
  v_business_user_id UUID;
  v_user_id UUID;
  v_existing_business_user_id UUID;
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
  
  -- Check if user already has a business_user record
  SELECT id, merchant_id INTO v_existing_business_user_id, v_merchant_id
  FROM business_users
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  -- If user already has a merchant (merchant_id is not null), reject
  IF v_merchant_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a merchant account');
  END IF;
  
  -- If business_user exists but merchant_id is null, update it instead of creating new
  IF v_existing_business_user_id IS NOT NULL THEN
    -- Update existing business_user record with new data
    UPDATE business_users
    SET 
      phone = user_phone,
      full_name = user_full_name,
      preferred_country = v_preferred_country,
      preferred_language = v_preferred_language
    WHERE business_users.id = v_existing_business_user_id
    RETURNING business_users.id INTO v_business_user_id;
    
    -- Create merchant (using business_type_id UUID)
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
    
    -- Update business_user with the new merchant_id
    UPDATE business_users
    SET merchant_id = v_merchant_id
    WHERE id = v_business_user_id;
    
    -- Get user email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Update merchants with owner_id and contact_email
    IF v_business_user_id IS NOT NULL THEN
      UPDATE merchants
      SET 
        owner_id = v_business_user_id,
        contact_email = v_user_email
      WHERE id = v_merchant_id;
    ELSE
      UPDATE merchants
      SET contact_email = v_user_email
      WHERE id = v_merchant_id;
    END IF;
    
    -- Update or insert into public.users
    INSERT INTO public.users (id, full_name, phone)
    VALUES (v_user_id, user_full_name, user_phone)
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = NOW();
  ELSE
    -- No business_user exists, create both merchant and business_user
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
    
    -- Create business_user link
    INSERT INTO business_users (
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
      true
    )
    RETURNING id INTO v_business_user_id;
    
    -- Get user email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    -- Update merchants with owner_id and contact_email
    IF v_business_user_id IS NOT NULL THEN
      UPDATE merchants
      SET 
        owner_id = v_business_user_id,
        contact_email = v_user_email
      WHERE id = v_merchant_id;
    ELSE
      UPDATE merchants
      SET contact_email = v_user_email
      WHERE id = v_merchant_id;
    END IF;
    
    -- Update or insert into public.users
    INSERT INTO public.users (id, full_name, phone)
    VALUES (v_user_id, user_full_name, user_phone)
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = NOW();
  END IF;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'merchant_id', v_merchant_id,
    'business_user_id', v_business_user_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.create_merchant_onboarding IS 'Creates a merchant account and links it to the authenticated user via business_users table.';

-- Step 6: Update RLS policies
DO $$
DECLARE
  v_policy_name TEXT;
BEGIN
  -- Drop old policies on the renamed table
  FOR v_policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'business_users'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.business_users', v_policy_name);
      RAISE NOTICE 'Dropped policy %', v_policy_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop policy %: %', v_policy_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Re-create RLS policies with correct names
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own business_user record
CREATE POLICY "Users can view own business_user"
ON public.business_users
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Policy: Users can update their own business_user record
CREATE POLICY "Users can update own business_user"
ON public.business_users
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Users can insert their own business_user record (for signup)
CREATE POLICY "Users can insert own business_user"
ON public.business_users
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Step 7: Add table comment
COMMENT ON TABLE public.business_users IS 'Links auth users to merchants. Each business user can manage multiple stores within their merchant account.';

-- Migration complete message (wrapped in DO block for valid syntax)
DO $$
BEGIN
  RAISE NOTICE 'Successfully renamed merchant_users to business_users and updated all references';
END $$;

