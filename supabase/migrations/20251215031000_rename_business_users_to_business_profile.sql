-- ================================
-- Rename business_users table to business_profile
-- ================================
-- Description: Rename business_users to business_profile for clearer naming
-- Date: 2025-12-15

-- Step 1: Rename the table
ALTER TABLE IF EXISTS public.business_users RENAME TO business_profile;

-- Step 2: Rename associated indexes
ALTER INDEX IF EXISTS business_users_pkey RENAME TO business_profile_pkey;
ALTER INDEX IF EXISTS business_users_auth_user_id_idx RENAME TO business_profile_auth_user_id_idx;
ALTER INDEX IF EXISTS business_users_merchant_id_idx RENAME TO business_profile_merchant_id_idx;
ALTER INDEX IF EXISTS idx_business_users_auth_user_id RENAME TO idx_business_profile_auth_user_id;
ALTER INDEX IF EXISTS idx_business_users_merchant_id RENAME TO idx_business_profile_merchant_id;

-- Step 3: Rename foreign key constraints
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  FOR v_constraint_name IN
    SELECT constraint_name
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name LIKE '%business_users%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.business_profile RENAME CONSTRAINT %I TO %I', 
        v_constraint_name, 
        REPLACE(v_constraint_name, 'business_users', 'business_profile'));
      RAISE NOTICE 'Renamed constraint % to %', v_constraint_name, REPLACE(v_constraint_name, 'business_users', 'business_profile');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename constraint %: %', v_constraint_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 4: Update foreign key reference in merchants table
DO $$
BEGIN
  ALTER TABLE public.merchants DROP CONSTRAINT IF EXISTS merchants_owner_id_fkey;
  
  ALTER TABLE public.merchants 
  ADD CONSTRAINT merchants_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.business_profile(id) ON DELETE SET NULL;
  
  RAISE NOTICE 'Updated merchants.owner_id foreign key to reference business_profile';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update merchants.owner_id constraint: %', SQLERRM;
END $$;

-- Step 5: Update the create_merchant_onboarding function
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
  v_business_profile_id UUID;
  v_user_id UUID;
  v_existing_profile_id UUID;
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
  
  SELECT id, merchant_id INTO v_existing_profile_id, v_merchant_id
  FROM business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_merchant_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a merchant account');
  END IF;
  
  IF v_existing_profile_id IS NOT NULL THEN
    UPDATE business_profile
    SET 
      phone = user_phone,
      full_name = user_full_name,
      preferred_country = v_preferred_country,
      preferred_language = v_preferred_language
    WHERE business_profile.id = v_existing_profile_id
    RETURNING business_profile.id INTO v_business_profile_id;
    
    INSERT INTO merchants (name, status, kyc_status, business_type_id)
    VALUES (business_name, 'pending', 'pending', selected_business_type_id)
    RETURNING id INTO v_merchant_id;
    
    UPDATE business_profile
    SET merchant_id = v_merchant_id
    WHERE id = v_business_profile_id;
    
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    IF v_business_profile_id IS NOT NULL THEN
      UPDATE merchants
      SET owner_id = v_business_profile_id, contact_email = v_user_email
      WHERE id = v_merchant_id;
    ELSE
      UPDATE merchants SET contact_email = v_user_email WHERE id = v_merchant_id;
    END IF;
    
    INSERT INTO public.users (id, full_name, phone)
    VALUES (v_user_id, user_full_name, user_phone)
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = NOW();
  ELSE
    INSERT INTO merchants (name, status, kyc_status, business_type_id)
    VALUES (business_name, 'pending', 'pending', selected_business_type_id)
    RETURNING id INTO v_merchant_id;
    
    INSERT INTO business_profile (
      merchant_id, auth_user_id, role, phone, full_name,
      preferred_country, preferred_language, is_primary_contact
    )
    VALUES (
      v_merchant_id, v_user_id, 'manager', user_phone, user_full_name,
      v_preferred_country, v_preferred_language, true
    )
    RETURNING id INTO v_business_profile_id;
    
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    IF v_business_profile_id IS NOT NULL THEN
      UPDATE merchants
      SET owner_id = v_business_profile_id, contact_email = v_user_email
      WHERE id = v_merchant_id;
    ELSE
      UPDATE merchants SET contact_email = v_user_email WHERE id = v_merchant_id;
    END IF;
    
    INSERT INTO public.users (id, full_name, phone)
    VALUES (v_user_id, user_full_name, user_phone)
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = NOW();
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'merchant_id', v_merchant_id,
    'business_profile_id', v_business_profile_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.create_merchant_onboarding IS 'Creates a merchant account and links it to the authenticated user via business_profile table.';

-- Step 6: Update RLS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own business_user" ON public.business_profile;
  DROP POLICY IF EXISTS "Users can update own business_user" ON public.business_profile;
  DROP POLICY IF EXISTS "Users can insert own business_user" ON public.business_profile;
  
  ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Users can view own profile"
  ON public.business_profile FOR SELECT
  USING (auth.uid() = auth_user_id);
  
  CREATE POLICY "Users can update own profile"
  ON public.business_profile FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
  
  CREATE POLICY "Users can insert own profile"
  ON public.business_profile FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);
  
  RAISE NOTICE 'Successfully created RLS policies for business_profile';
END $$;

COMMENT ON TABLE public.business_profile IS 'User profile for business accounts. Links auth users to merchants.';

DO $$
BEGIN
  RAISE NOTICE 'Successfully renamed business_users to business_profile';
END $$;

