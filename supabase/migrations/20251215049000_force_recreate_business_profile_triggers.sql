-- ================================
-- Force recreate business_profile triggers (without delete_business_on_owner_delete)
-- ================================
-- Description: Ensures all triggers are clean and the problematic function is gone
-- Date: 2025-12-15

-- First, drop ALL triggers on business_profile to start fresh
DO $$
DECLARE
  trigger_name TEXT;
BEGIN
  FOR trigger_name IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.business_profile'::regclass
      AND tgisinternal = false
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.business_profile CASCADE', trigger_name);
    RAISE NOTICE 'Dropped trigger: %', trigger_name;
  END LOOP;
END $$;

-- Ensure the problematic function is completely gone
DO $$
BEGIN
  -- Try all possible ways to drop it
  DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete() CASCADE;
  DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete CASCADE;
  
  -- Verify it's gone
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'delete_business_on_owner_delete'
  ) THEN
    RAISE EXCEPTION 'Function delete_business_on_owner_delete still exists after drop attempts!';
  ELSE
    RAISE NOTICE '✓ Confirmed: delete_business_on_owner_delete function does not exist';
  END IF;
END $$;

-- Verify no triggers reference the deleted function
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT tgname, pg_get_triggerdef(oid) as definition
    FROM pg_trigger
    WHERE tgrelid = 'public.business_profile'::regclass
      AND tgisinternal = false
  LOOP
    IF trigger_record.definition LIKE '%delete_business_on_owner_delete%' THEN
      RAISE EXCEPTION 'Trigger % still references delete_business_on_owner_delete!', trigger_record.tgname;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ No triggers reference delete_business_on_owner_delete';
END $$;

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'business_profile triggers cleaned successfully';
  RAISE NOTICE 'The delete_business_on_owner_delete function';
  RAISE NOTICE 'has been completely removed.';
  RAISE NOTICE '==============================================';
END $$;

