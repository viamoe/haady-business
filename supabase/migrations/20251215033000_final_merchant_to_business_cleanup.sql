-- ================================
-- Final cleanup: Ensure all merchant references are renamed to business
-- ================================
-- Description: Comprehensive cleanup of any remaining merchant references in the database
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Verify and rename any remaining tables
-- =====================================================

-- Rename merchants table if it still exists (should already be done)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchants') THEN
    ALTER TABLE public.merchants RENAME TO businesses;
    RAISE NOTICE 'Renamed table merchants to businesses';
  ELSE
    RAISE NOTICE 'Table merchants already renamed or does not exist';
  END IF;
END $$;

-- Rename merchant_users table if it still exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchant_users') THEN
    ALTER TABLE public.merchant_users RENAME TO business_profile;
    RAISE NOTICE 'Renamed table merchant_users to business_profile';
  ELSE
    RAISE NOTICE 'Table merchant_users already renamed or does not exist';
  END IF;
END $$;

-- =====================================================
-- PART 2: Rename columns containing 'merchant'
-- =====================================================

-- Rename merchant_id to business_id in business_profile
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'business_profile' AND column_name = 'merchant_id') THEN
    ALTER TABLE public.business_profile RENAME COLUMN merchant_id TO business_id;
    RAISE NOTICE 'Renamed column business_profile.merchant_id to business_id';
  ELSE
    RAISE NOTICE 'Column business_profile.merchant_id already renamed or does not exist';
  END IF;
END $$;

-- Rename merchant_id to business_id in stores
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'merchant_id') THEN
    ALTER TABLE public.stores RENAME COLUMN merchant_id TO business_id;
    RAISE NOTICE 'Renamed column stores.merchant_id to business_id';
  ELSE
    RAISE NOTICE 'Column stores.merchant_id already renamed or does not exist';
  END IF;
END $$;

-- Rename merchant_id to business_id in store_connections (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'store_connections' AND column_name = 'merchant_id') THEN
    ALTER TABLE public.store_connections RENAME COLUMN merchant_id TO business_id;
    RAISE NOTICE 'Renamed column store_connections.merchant_id to business_id';
  ELSE
    RAISE NOTICE 'Column store_connections.merchant_id already renamed or does not exist';
  END IF;
END $$;

-- Rename merchant_id to business_id in products (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'merchant_id') THEN
    ALTER TABLE public.products RENAME COLUMN merchant_id TO business_id;
    RAISE NOTICE 'Renamed column products.merchant_id to business_id';
  ELSE
    RAISE NOTICE 'Column products.merchant_id does not exist';
  END IF;
END $$;

-- Rename merchant_id to business_id in orders (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'merchant_id') THEN
    ALTER TABLE public.orders RENAME COLUMN merchant_id TO business_id;
    RAISE NOTICE 'Renamed column orders.merchant_id to business_id';
  ELSE
    RAISE NOTICE 'Column orders.merchant_id does not exist';
  END IF;
END $$;

-- =====================================================
-- PART 3: Drop old functions with 'merchant' in name
-- =====================================================

DROP FUNCTION IF EXISTS public.create_merchant_onboarding CASCADE;
DROP FUNCTION IF EXISTS public.get_merchant_stores CASCADE;
DROP FUNCTION IF EXISTS public.get_merchant_products CASCADE;
DROP FUNCTION IF EXISTS public.get_merchant_orders CASCADE;

-- =====================================================
-- PART 4: Create/update the business onboarding function
-- =====================================================

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

-- =====================================================
-- PART 5: Rename any remaining constraints with 'merchant'
-- =====================================================

DO $$
DECLARE
  v_constraint_name TEXT;
  v_table_name TEXT;
  v_new_name TEXT;
BEGIN
  -- Find and rename all constraints containing 'merchant'
  FOR v_constraint_name, v_table_name IN
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public' 
    AND tc.constraint_name LIKE '%merchant%'
  LOOP
    v_new_name := REPLACE(v_constraint_name, 'merchant', 'business');
    BEGIN
      EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', 
        v_table_name, v_constraint_name, v_new_name);
      RAISE NOTICE 'Renamed constraint % to %', v_constraint_name, v_new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename constraint %: %', v_constraint_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- PART 6: Rename any remaining indexes with 'merchant'
-- =====================================================

DO $$
DECLARE
  v_index_name TEXT;
  v_new_name TEXT;
BEGIN
  FOR v_index_name IN
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE '%merchant%'
  LOOP
    v_new_name := REPLACE(v_index_name, 'merchant', 'business');
    BEGIN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', v_index_name, v_new_name);
      RAISE NOTICE 'Renamed index % to %', v_index_name, v_new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename index %: %', v_index_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- PART 7: Rename any enums containing 'merchant'
-- =====================================================

DO $$
DECLARE
  v_enum_name TEXT;
  v_new_name TEXT;
BEGIN
  FOR v_enum_name IN
    SELECT typname 
    FROM pg_type 
    WHERE typtype = 'e' 
    AND typname LIKE '%merchant%'
  LOOP
    v_new_name := REPLACE(v_enum_name, 'merchant', 'business');
    BEGIN
      EXECUTE format('ALTER TYPE public.%I RENAME TO %I', v_enum_name, v_new_name);
      RAISE NOTICE 'Renamed enum % to %', v_enum_name, v_new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename enum %: %', v_enum_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- PART 8: Update table comments
-- =====================================================

COMMENT ON TABLE public.businesses IS 'Business accounts that can have multiple stores';
COMMENT ON TABLE public.business_profile IS 'User profiles for business accounts. Links auth users to businesses.';

-- =====================================================
-- PART 9: Update RLS policies (drop old, create new)
-- =====================================================

-- Drop any old merchant-related policies on business_profile
DO $$
DECLARE
  v_policy_name TEXT;
BEGIN
  FOR v_policy_name IN
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'business_profile'
    AND policyname LIKE '%merchant%'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.business_profile', v_policy_name);
      RAISE NOTICE 'Dropped policy %', v_policy_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop policy %: %', v_policy_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Drop any old merchant-related policies on businesses table
DO $$
DECLARE
  v_policy_name TEXT;
BEGIN
  FOR v_policy_name IN
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'businesses'
    AND policyname LIKE '%merchant%'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.businesses', v_policy_name);
      RAISE NOTICE 'Dropped policy %', v_policy_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop policy %: %', v_policy_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Ensure RLS policies exist for business_profile
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies to recreate them cleanly
  DROP POLICY IF EXISTS "Users can view own profile" ON public.business_profile;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.business_profile;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.business_profile;
  
  -- Create policies
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
  
  RAISE NOTICE 'Created RLS policies for business_profile';
END $$;

-- =====================================================
-- PART 10: Final verification and cleanup report
-- =====================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check for any remaining 'merchant' references in table names
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Found % tables still containing "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No tables with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in column names
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND column_name LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Found % columns still containing "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No columns with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in function names
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Found % functions still containing "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No functions with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in constraint names
  SELECT COUNT(*) INTO v_count
  FROM information_schema.table_constraints 
  WHERE constraint_schema = 'public' 
  AND constraint_name LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Found % constraints still containing "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No constraints with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in index names
  SELECT COUNT(*) INTO v_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND indexname LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Found % indexes still containing "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No indexes with "merchant" in name';
  END IF;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Merchant to Business rename cleanup complete!';
  RAISE NOTICE '==============================================';
END $$;

