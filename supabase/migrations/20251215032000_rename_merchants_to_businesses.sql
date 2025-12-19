-- ================================
-- Rename merchants table to businesses
-- ================================
-- Description: Rename merchants to businesses and update all references
-- Date: 2025-12-15

-- Step 1: Rename the merchants table to businesses
ALTER TABLE IF EXISTS public.merchants RENAME TO businesses;

-- Step 2: Rename the merchant_id column in business_profile to business_id
ALTER TABLE IF EXISTS public.business_profile RENAME COLUMN merchant_id TO business_id;

-- Step 3: Rename the merchant_id column in stores table to business_id
ALTER TABLE IF EXISTS public.stores RENAME COLUMN merchant_id TO business_id;

-- Step 4: Rename the merchant_id column in store_connections to business_id (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'store_connections' AND column_name = 'merchant_id') THEN
    ALTER TABLE public.store_connections RENAME COLUMN merchant_id TO business_id;
  END IF;
END $$;

-- Step 5: Rename indexes
ALTER INDEX IF EXISTS merchants_pkey RENAME TO businesses_pkey;
ALTER INDEX IF EXISTS idx_merchants_owner_id RENAME TO idx_businesses_owner_id;
ALTER INDEX IF EXISTS idx_merchants_business_type_id RENAME TO idx_businesses_business_type_id;

-- Step 6: Rename foreign key constraints
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- Rename constraints on businesses table
  FOR v_constraint_name IN
    SELECT constraint_name
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'businesses'
    AND constraint_name LIKE '%merchant%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.businesses RENAME CONSTRAINT %I TO %I', 
        v_constraint_name, 
        REPLACE(v_constraint_name, 'merchant', 'business'));
      RAISE NOTICE 'Renamed constraint % to %', v_constraint_name, REPLACE(v_constraint_name, 'merchant', 'business');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename constraint %: %', v_constraint_name, SQLERRM;
    END;
  END LOOP;
  
  -- Rename constraints on business_profile table
  FOR v_constraint_name IN
    SELECT constraint_name
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'business_profile'
    AND constraint_name LIKE '%merchant%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.business_profile RENAME CONSTRAINT %I TO %I', 
        v_constraint_name, 
        REPLACE(v_constraint_name, 'merchant', 'business'));
      RAISE NOTICE 'Renamed constraint % to %', v_constraint_name, REPLACE(v_constraint_name, 'merchant', 'business');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename constraint %: %', v_constraint_name, SQLERRM;
    END;
  END LOOP;
  
  -- Rename constraints on stores table
  FOR v_constraint_name IN
    SELECT constraint_name
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'stores'
    AND constraint_name LIKE '%merchant%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.stores RENAME CONSTRAINT %I TO %I', 
        v_constraint_name, 
        REPLACE(v_constraint_name, 'merchant', 'business'));
      RAISE NOTICE 'Renamed constraint % to %', v_constraint_name, REPLACE(v_constraint_name, 'merchant', 'business');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename constraint %: %', v_constraint_name, SQLERRM;
    END;
  END LOOP;
  
  -- Rename constraints on store_connections table
  FOR v_constraint_name IN
    SELECT constraint_name
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'store_connections'
    AND constraint_name LIKE '%merchant%'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.store_connections RENAME CONSTRAINT %I TO %I', 
        v_constraint_name, 
        REPLACE(v_constraint_name, 'merchant', 'business'));
      RAISE NOTICE 'Renamed constraint % to %', v_constraint_name, REPLACE(v_constraint_name, 'merchant', 'business');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename constraint %: %', v_constraint_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 7: Update foreign key from business_profile to businesses
DO $$
BEGIN
  ALTER TABLE public.business_profile DROP CONSTRAINT IF EXISTS business_profile_merchant_id_fkey_cascade;
  ALTER TABLE public.business_profile DROP CONSTRAINT IF EXISTS business_profile_business_id_fkey;
  
  ALTER TABLE public.business_profile 
  ADD CONSTRAINT business_profile_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
  
  RAISE NOTICE 'Updated business_profile.business_id foreign key';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update business_profile foreign key: %', SQLERRM;
END $$;

-- Step 8: Update foreign key from stores to businesses
DO $$
BEGIN
  ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_merchant_id_fkey;
  ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_business_id_fkey;
  
  ALTER TABLE public.stores 
  ADD CONSTRAINT stores_business_id_fkey 
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
  
  RAISE NOTICE 'Updated stores.business_id foreign key';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update stores foreign key: %', SQLERRM;
END $$;

-- Step 9: Update foreign key from store_connections to businesses (if business_id column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'store_connections' AND column_name = 'business_id') THEN
    ALTER TABLE public.store_connections DROP CONSTRAINT IF EXISTS store_connections_merchant_id_fkey;
    ALTER TABLE public.store_connections DROP CONSTRAINT IF EXISTS store_connections_business_id_fkey;
    
    ALTER TABLE public.store_connections 
    ADD CONSTRAINT store_connections_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated store_connections.business_id foreign key';
  ELSE
    RAISE NOTICE 'store_connections.business_id column does not exist, skipping foreign key update';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update store_connections foreign key: %', SQLERRM;
END $$;

-- Step 10: Drop and recreate the RPC function with new naming
DROP FUNCTION IF EXISTS public.create_merchant_onboarding CASCADE;

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
  
  SELECT id, business_id INTO v_existing_profile_id, v_existing_business_id
  FROM business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_existing_business_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a business account');
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
    
    INSERT INTO businesses (name, status, kyc_status, business_type_id)
    VALUES (business_name, 'pending', 'pending', selected_business_type_id)
    RETURNING id INTO v_business_id;
    
    UPDATE business_profile
    SET business_id = v_business_id
    WHERE id = v_business_profile_id;
    
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    IF v_business_profile_id IS NOT NULL THEN
      UPDATE businesses
      SET owner_id = v_business_profile_id, contact_email = v_user_email
      WHERE id = v_business_id;
    ELSE
      UPDATE businesses SET contact_email = v_user_email WHERE id = v_business_id;
    END IF;
    
    INSERT INTO public.users (id, full_name, phone)
    VALUES (v_user_id, user_full_name, user_phone)
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      updated_at = NOW();
  ELSE
    INSERT INTO businesses (name, status, kyc_status, business_type_id)
    VALUES (business_name, 'pending', 'pending', selected_business_type_id)
    RETURNING id INTO v_business_id;
    
    INSERT INTO business_profile (
      business_id, auth_user_id, role, phone, full_name,
      preferred_country, preferred_language, is_primary_contact
    )
    VALUES (
      v_business_id, v_user_id, 'manager', user_phone, user_full_name,
      v_preferred_country, v_preferred_language, true
    )
    RETURNING id INTO v_business_profile_id;
    
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    IF v_business_profile_id IS NOT NULL THEN
      UPDATE businesses
      SET owner_id = v_business_profile_id, contact_email = v_user_email
      WHERE id = v_business_id;
    ELSE
      UPDATE businesses SET contact_email = v_user_email WHERE id = v_business_id;
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
    'business_id', v_business_id,
    'business_profile_id', v_business_profile_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.create_business_onboarding IS 'Creates a business account and links it to the authenticated user via business_profile table.';

-- Step 11: Add table comments
COMMENT ON TABLE public.businesses IS 'Business accounts that can have multiple stores';
COMMENT ON COLUMN public.business_profile.business_id IS 'Reference to the business this profile belongs to';
COMMENT ON COLUMN public.stores.business_id IS 'Reference to the business that owns this store';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'store_connections' AND column_name = 'business_id') THEN
    COMMENT ON COLUMN public.store_connections.business_id IS 'Reference to the business that owns this connection';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Successfully renamed merchants to businesses and updated all references';
END $$;

