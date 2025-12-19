-- ================================
-- Merge businesses table into business_profile
-- ================================
-- Description: Consolidate businesses and business_profile into a single table
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Add business columns to business_profile
-- =====================================================

-- Add business-specific columns to business_profile
ALTER TABLE public.business_profile 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS business_type_id UUID,
ADD COLUMN IF NOT EXISTS business_country UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- PART 2: Migrate data from businesses to business_profile
-- =====================================================

-- Update business_profile with data from linked businesses
UPDATE public.business_profile bp
SET 
  business_name = b.name,
  contact_email = b.contact_email,
  status = b.status::TEXT,
  kyc_status = b.kyc_status::TEXT,
  is_active = COALESCE(b.is_active, true),
  business_type_id = b.business_type_id,
  business_country = b.country,
  updated_at = COALESCE(b.updated_at, NOW())
FROM public.businesses b
WHERE bp.business_id = b.id;

-- =====================================================
-- PART 3: Update foreign keys to point to business_profile
-- =====================================================

-- Update stores table
DO $$
BEGIN
  -- First, update the business_id values in stores to point to business_profile.id
  UPDATE public.stores s
  SET business_id = bp.id
  FROM public.business_profile bp
  WHERE s.business_id = bp.business_id
  AND bp.business_id IS NOT NULL;
  
  -- Drop old foreign key
  ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_business_id_fkey;
  ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_business_id_fkey_cascade;
  
  -- Add new foreign key to business_profile
  ALTER TABLE public.stores 
  ADD CONSTRAINT stores_business_profile_id_fkey 
  FOREIGN KEY (business_id) REFERENCES public.business_profile(id) ON DELETE CASCADE;
  
  RAISE NOTICE 'Updated stores foreign key to reference business_profile';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update stores foreign key: %', SQLERRM;
END $$;

-- Update orders table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'business_id') THEN
    -- Update the business_id values in orders to point to business_profile.id
    UPDATE public.orders o
    SET business_id = bp.id
    FROM public.business_profile bp
    WHERE o.business_id = bp.business_id
    AND bp.business_id IS NOT NULL;
    
    -- Drop old foreign key
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_business_id_fkey;
    
    -- Add new foreign key to business_profile
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_business_profile_id_fkey 
    FOREIGN KEY (business_id) REFERENCES public.business_profile(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated orders foreign key to reference business_profile';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update orders foreign key: %', SQLERRM;
END $$;

-- Update store_connections table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'store_connections' AND column_name = 'business_id') THEN
    -- Update the business_id values
    UPDATE public.store_connections sc
    SET business_id = bp.id
    FROM public.business_profile bp
    WHERE sc.business_id = bp.business_id
    AND bp.business_id IS NOT NULL;
    
    -- Drop old foreign key
    ALTER TABLE public.store_connections DROP CONSTRAINT IF EXISTS store_connections_business_id_fkey;
    
    -- Add new foreign key to business_profile
    ALTER TABLE public.store_connections 
    ADD CONSTRAINT store_connections_business_profile_id_fkey 
    FOREIGN KEY (business_id) REFERENCES public.business_profile(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated store_connections foreign key to reference business_profile';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update store_connections foreign key: %', SQLERRM;
END $$;

-- Update business_agreements table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'business_agreements') THEN
    -- Update the business_id values
    UPDATE public.business_agreements ba
    SET business_id = bp.id
    FROM public.business_profile bp
    WHERE ba.business_id = bp.business_id
    AND bp.business_id IS NOT NULL;
    
    -- Drop old foreign key
    ALTER TABLE public.business_agreements DROP CONSTRAINT IF EXISTS business_agreements_business_id_fkey;
    
    -- Add new foreign key to business_profile
    ALTER TABLE public.business_agreements 
    ADD CONSTRAINT business_agreements_business_profile_id_fkey 
    FOREIGN KEY (business_id) REFERENCES public.business_profile(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated business_agreements foreign key to reference business_profile';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update business_agreements foreign key: %', SQLERRM;
END $$;

-- =====================================================
-- PART 4: Drop RLS policies that depend on business_id
-- =====================================================

-- Drop policies on stores
DROP POLICY IF EXISTS "stores_merchant_access" ON public.stores;

-- Drop policies on orders
DROP POLICY IF EXISTS "orders_merchant_view" ON public.orders;

-- Drop policies on payments
DROP POLICY IF EXISTS "payments_merchant" ON public.payments;
DROP POLICY IF EXISTS "payments_select_merchant" ON public.payments;

-- Drop policies on storage.objects
DROP POLICY IF EXISTS "merchant_docs_upload" ON storage.objects;
DROP POLICY IF EXISTS "product_images_merchant_upload" ON storage.objects;
DROP POLICY IF EXISTS "product_images_merchant_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_merchant_delete" ON storage.objects;
DROP POLICY IF EXISTS "merchant_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

-- Drop policies on product_sources
DROP POLICY IF EXISTS "Users can view product sources for their stores" ON public.product_sources;
DROP POLICY IF EXISTS "Users can insert product sources for their stores" ON public.product_sources;
DROP POLICY IF EXISTS "Users can update product sources for their stores" ON public.product_sources;
DROP POLICY IF EXISTS "Users can delete product sources for their stores" ON public.product_sources;

-- =====================================================
-- PART 5: Drop the business_id column (no longer needed)
-- =====================================================

ALTER TABLE public.business_profile DROP COLUMN IF EXISTS business_id;

-- =====================================================
-- PART 6: Drop the businesses table
-- =====================================================

DROP TABLE IF EXISTS public.businesses CASCADE;

-- =====================================================
-- PART 7: Update the create_business_onboarding function
-- =====================================================

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
  
  -- Check if business_profile already exists for this user with a business
  SELECT id INTO v_existing_profile_id
  FROM business_profile
  WHERE auth_user_id = v_user_id
  AND business_name IS NOT NULL
  LIMIT 1;
  
  -- If user already has a business, reject
  IF v_existing_profile_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a business account');
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Check if profile exists without business
  SELECT id INTO v_existing_profile_id
  FROM business_profile
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_existing_profile_id IS NOT NULL THEN
    -- Update existing profile with business info
    UPDATE business_profile
    SET 
      phone = user_phone,
      full_name = user_full_name,
      business_name = create_business_onboarding.business_name::TEXT,
      contact_email = v_user_email,
      status = 'pending',
      kyc_status = 'pending',
      is_active = true,
      business_type_id = selected_business_type_id,
      preferred_country = v_preferred_country,
      preferred_language = v_preferred_language,
      is_primary_contact = true,
      updated_at = NOW()
    WHERE id = v_existing_profile_id
    RETURNING id INTO v_business_profile_id;
  ELSE
    -- Create new business_profile with all info
    INSERT INTO business_profile (
      auth_user_id, 
      role, 
      phone, 
      full_name,
      business_name,
      contact_email,
      status,
      kyc_status,
      is_active,
      business_type_id,
      preferred_country, 
      preferred_language, 
      is_primary_contact
    )
    VALUES (
      v_user_id, 
      'owner', 
      user_phone, 
      user_full_name,
      create_business_onboarding.business_name,
      v_user_email,
      'pending',
      'pending',
      true,
      selected_business_type_id,
      v_preferred_country, 
      v_preferred_language, 
      true
    )
    RETURNING id INTO v_business_profile_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'business_profile_id', v_business_profile_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.create_business_onboarding IS 'Creates a business profile for the authenticated user. Business data is now stored directly in the business_profile table.';

GRANT EXECUTE ON FUNCTION public.create_business_onboarding TO authenticated;

-- =====================================================
-- PART 8: Update other functions that reference businesses table
-- =====================================================

-- Update sign_business_agreement_internal to work with business_profile
DROP FUNCTION IF EXISTS public.sign_business_agreement_internal CASCADE;

CREATE OR REPLACE FUNCTION public.sign_business_agreement_internal(
  bp_id UUID,
  t_id UUID,
  u_id UUID,
  ip TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agreement_id UUID;
BEGIN
  INSERT INTO public.business_agreements (
    business_id,
    term_id,
    accepted_by_user_id,
    accepted_at,
    ip_address
  )
  VALUES (
    bp_id,
    t_id,
    u_id,
    NOW(),
    ip
  )
  ON CONFLICT (business_id, term_id) 
  DO UPDATE SET
    accepted_by_user_id = EXCLUDED.accepted_by_user_id,
    accepted_at = NOW(),
    ip_address = EXCLUDED.ip_address
  RETURNING id INTO v_agreement_id;
  
  RETURN v_agreement_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error signing business agreement: %', SQLERRM;
END;
$$;

-- =====================================================
-- PART 9: Drop old functions that referenced businesses
-- =====================================================

-- The trigger was already dropped when we dropped the businesses table with CASCADE
DROP FUNCTION IF EXISTS public.sync_business_status CASCADE;

-- =====================================================
-- PART 10: Update table comment
-- =====================================================

COMMENT ON TABLE public.business_profile IS 'Combined business and user profile. Contains all business information and the associated user details.';
COMMENT ON COLUMN public.business_profile.business_name IS 'Display name of the business';
COMMENT ON COLUMN public.business_profile.contact_email IS 'Primary contact email for the business';
COMMENT ON COLUMN public.business_profile.status IS 'Business account status (pending, active, suspended, inactive)';
COMMENT ON COLUMN public.business_profile.kyc_status IS 'KYC verification status (pending, approved, rejected)';
COMMENT ON COLUMN public.business_profile.is_active IS 'Whether the business account is currently active';
COMMENT ON COLUMN public.business_profile.business_type_id IS 'Reference to the business type';
COMMENT ON COLUMN public.business_profile.business_country IS 'Business country (UUID reference to countries table)';

-- =====================================================
-- PART 11: Recreate RLS policies with new structure
-- =====================================================

-- Stores RLS policies
DO $$
BEGIN
  -- Enable RLS on stores if not already enabled
  ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
  
  -- Policy for users to access their own stores
  CREATE POLICY "users_access_own_stores" ON public.stores
    FOR ALL
    USING (
      business_id IN (
        SELECT id FROM public.business_profile WHERE auth_user_id = auth.uid()
      )
    );
  
  RAISE NOTICE 'Created stores RLS policy';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create stores RLS policy: %', SQLERRM;
END $$;

-- Orders RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "users_view_own_orders" ON public.orders
      FOR SELECT
      USING (
        business_id IN (
          SELECT id FROM public.business_profile WHERE auth_user_id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Created orders RLS policy';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create orders RLS policy: %', SQLERRM;
END $$;

-- Payments RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "users_access_own_payments" ON public.payments
      FOR ALL
      USING (
        business_id IN (
          SELECT id FROM public.business_profile WHERE auth_user_id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Created payments RLS policy';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create payments RLS policy: %', SQLERRM;
END $$;

-- Product sources RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_sources') THEN
    ALTER TABLE public.product_sources ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "users_access_own_product_sources" ON public.product_sources
      FOR ALL
      USING (
        store_id IN (
          SELECT s.id FROM public.stores s
          JOIN public.business_profile bp ON s.business_id = bp.id
          WHERE bp.auth_user_id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Created product_sources RLS policy';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create product_sources RLS policy: %', SQLERRM;
END $$;

-- =====================================================
-- PART 12: Final verification
-- =====================================================

DO $$
BEGIN
  -- Verify businesses table is dropped
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'businesses') THEN
    RAISE NOTICE '✓ businesses table has been dropped';
  ELSE
    RAISE WARNING 'businesses table still exists!';
  END IF;
  
  -- Verify new columns exist in business_profile
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'business_profile' AND column_name = 'business_name') THEN
    RAISE NOTICE '✓ business_name column exists in business_profile';
  ELSE
    RAISE WARNING 'business_name column missing from business_profile!';
  END IF;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Merged businesses into business_profile!';
  RAISE NOTICE '==============================================';
END $$;

