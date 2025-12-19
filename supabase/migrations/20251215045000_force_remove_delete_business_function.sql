-- ================================
-- Force remove delete_business_on_owner_delete function
-- ================================
-- Description: Ensures the obsolete function is completely removed.
--              This function references business_id which no longer exists.
-- Date: 2025-12-15

-- Drop the trigger first (must be dropped before the function)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_delete_business_on_owner_delete ON public.business_profile;
  RAISE NOTICE 'Dropped trigger trigger_delete_business_on_owner_delete';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error dropping trigger: %', SQLERRM;
END $$;

-- Drop the function with CASCADE to remove any dependencies
DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete() CASCADE;
  RAISE NOTICE 'Dropped function delete_business_on_owner_delete';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error dropping function: %', SQLERRM;
END $$;

-- Verify it's gone
DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'delete_business_on_owner_delete'
      AND pronamespace = 'public'::regnamespace
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RAISE WARNING 'Function still exists! Attempting force drop...';
    -- Try to drop with all possible signatures
    DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete() CASCADE;
  ELSE
    RAISE NOTICE '✓ Function successfully removed';
  END IF;
END $$;

-- Verify trigger is gone
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_delete_business_on_owner_delete'
      AND tgrelid = 'public.business_profile'::regclass
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE WARNING 'Trigger still exists!';
  ELSE
    RAISE NOTICE '✓ Trigger successfully removed';
  END IF;
END $$;

