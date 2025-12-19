-- ================================
-- Ensure delete_business_on_owner_delete function is completely removed
-- ================================
-- Description: This function references business_id which no longer exists.
--              It must be completely removed to allow user deletion.
-- Date: 2025-12-15

-- First, drop the trigger (must be dropped before function)
DO $$
BEGIN
  -- Drop trigger if it exists
  DROP TRIGGER IF EXISTS trigger_delete_business_on_owner_delete ON public.business_profile;
  RAISE NOTICE 'Dropped trigger trigger_delete_business_on_owner_delete';
  
  -- Also try dropping with CASCADE in case there are dependencies
  BEGIN
    DROP TRIGGER trigger_delete_business_on_owner_delete ON public.business_profile CASCADE;
  EXCEPTION WHEN undefined_object THEN
    -- Trigger doesn't exist, that's fine
    NULL;
  END;
END $$;

-- Drop the function with all possible signatures
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Find all versions of this function
  FOR func_record IN
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'delete_business_on_owner_delete'
  LOOP
    BEGIN
      EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
        func_record.proname, 
        func_record.args);
      RAISE NOTICE 'Dropped function: %(%)', func_record.proname, func_record.args;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping function %(%): %', func_record.proname, func_record.args, SQLERRM;
    END;
  END LOOP;
  
  -- If no functions were found, that's good
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'delete_business_on_owner_delete'
  ) THEN
    RAISE NOTICE '✓ Function delete_business_on_owner_delete does not exist';
  END IF;
END $$;

-- Final verification
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  -- Check if function still exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'delete_business_on_owner_delete'
  ) INTO v_function_exists;
  
  -- Check if trigger still exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_delete_business_on_owner_delete'
      AND tgrelid = 'public.business_profile'::regclass
  ) INTO v_trigger_exists;
  
  IF v_function_exists THEN
    RAISE WARNING '⚠ Function still exists! This will cause deletion errors.';
  ELSE
    RAISE NOTICE '✓ Function successfully removed';
  END IF;
  
  IF v_trigger_exists THEN
    RAISE WARNING '⚠ Trigger still exists! This will cause deletion errors.';
  ELSE
    RAISE NOTICE '✓ Trigger successfully removed';
  END IF;
END $$;

