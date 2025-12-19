-- ================================
-- Final cleanup: Remove any remaining references to delete_business_on_owner_delete
-- ================================
-- Description: Ensures the function is completely gone and won't cause errors.
-- Date: 2025-12-15

-- Force drop with all possible variations
DO $$
BEGIN
  -- Try dropping with no parameters
  DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete() CASCADE;
  
  -- Try dropping with RETURNS TRIGGER signature
  DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete() CASCADE;
  
  -- Drop any trigger that might still exist
  DROP TRIGGER IF EXISTS trigger_delete_business_on_owner_delete ON public.business_profile CASCADE;
  
  RAISE NOTICE 'Completed force cleanup of delete_business_on_owner_delete';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cleanup completed with notices: %', SQLERRM;
END $$;

-- Verify removal and list any remaining triggers on business_profile
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE 'Checking for any DELETE triggers on business_profile...';
  
  FOR trigger_record IN
    SELECT tgname, tgenabled, tgtype::text
    FROM pg_trigger
    WHERE tgrelid = 'public.business_profile'::regclass
      AND tgisinternal = false
  LOOP
    RAISE NOTICE 'Found trigger: % (enabled: %, type: %)', 
      trigger_record.tgname, 
      trigger_record.tgenabled,
      trigger_record.tgtype;
  END LOOP;
  
  -- Check if our problematic trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_delete_business_on_owner_delete'
      AND tgrelid = 'public.business_profile'::regclass
  ) THEN
    RAISE WARNING '⚠ trigger_delete_business_on_owner_delete still exists!';
  ELSE
    RAISE NOTICE '✓ trigger_delete_business_on_owner_delete does not exist';
  END IF;
  
  -- Check if function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'delete_business_on_owner_delete'
  ) THEN
    RAISE WARNING '⚠ delete_business_on_owner_delete function still exists!';
  ELSE
    RAISE NOTICE '✓ delete_business_on_owner_delete function does not exist';
  END IF;
END $$;

