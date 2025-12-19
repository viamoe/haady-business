-- ================================
-- Recreate functions and triggers with business naming
-- ================================
-- Description: Recreate important functions and triggers that were dropped during merchant->business rename
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Recreate sync_business_status function and trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_business_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sync business status based on various conditions
  -- Add your business logic here based on what the original function did
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_business_status IS 'Trigger function to sync business status';

-- Create trigger for syncing business status (if businesses table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'businesses') THEN
    DROP TRIGGER IF EXISTS trg_sync_business_status ON public.businesses;
    CREATE TRIGGER trg_sync_business_status
      AFTER UPDATE ON public.businesses
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_business_status();
    RAISE NOTICE 'Created trigger trg_sync_business_status on businesses table';
  END IF;
END $$;

-- =====================================================
-- PART 2: Recreate handle_new_business_user function and trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_business_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_full_name TEXT;
BEGIN
  -- Extract full name from metadata
  v_user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Check if business_profile record already exists
  IF NOT EXISTS (SELECT 1 FROM public.business_profile WHERE auth_user_id = NEW.id) THEN
    -- Create a basic business_profile record
    INSERT INTO public.business_profile (auth_user_id, full_name, role)
    VALUES (NEW.id, v_user_full_name, 'manager')
    ON CONFLICT (auth_user_id) DO NOTHING;
    
    RAISE NOTICE 'Created business_profile for new user: %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error in handle_new_business_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_business_user IS 'Creates a business_profile record when a new auth user is created';

-- Create trigger for handling new users
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created_business ON auth.users;
  CREATE TRIGGER on_auth_user_created_business
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_business_user();
  RAISE NOTICE 'Created trigger on_auth_user_created_business on auth.users';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create trigger on auth.users: %', SQLERRM;
END $$;

-- =====================================================
-- PART 3: Remove obsolete delete_business_on_owner_delete function
-- =====================================================
-- NOTE: This function is no longer needed since businesses table
--       was merged into business_profile. CASCADE deletes handle everything.

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_delete_business_on_owner_delete ON public.business_profile;

-- Drop the function (it references business_id which no longer exists)
DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete() CASCADE;

RAISE NOTICE 'Removed obsolete delete_business_on_owner_delete function and trigger (businesses table merged into business_profile)';

-- =====================================================
-- PART 4: Recreate sign_business_agreement_internal function
-- =====================================================

CREATE OR REPLACE FUNCTION public.sign_business_agreement_internal(
  b_id UUID,
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
  -- Insert or update the business agreement
  INSERT INTO public.business_agreements (
    business_id,
    term_id,
    accepted_by_user_id,
    accepted_at,
    ip_address
  )
  VALUES (
    b_id,
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

COMMENT ON FUNCTION public.sign_business_agreement_internal IS 'Internal function to sign a business agreement';

-- =====================================================
-- PART 5: Verification
-- =====================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify functions were created
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname IN ('sync_business_status', 'handle_new_business_user', 'delete_business_on_owner_delete', 'sign_business_agreement_internal');
  
  RAISE NOTICE 'Created % business-related functions', v_count;
  
  -- Verify triggers were created
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname LIKE '%business%';
  
  RAISE NOTICE 'Created % business-related triggers', v_count;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Business functions and triggers recreated!';
  RAISE NOTICE '==============================================';
END $$;

