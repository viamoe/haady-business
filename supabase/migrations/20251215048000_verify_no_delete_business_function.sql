-- ================================
-- Verify and completely remove delete_business_on_owner_delete
-- ================================
-- Description: Final verification that the function is gone and won't cause errors
-- Date: 2025-12-15

-- List all triggers on business_profile
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'All triggers on business_profile:';
  RAISE NOTICE '==============================================';
  
  FOR r IN
    SELECT 
      tgname as trigger_name,
      tgenabled as enabled,
      CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        ELSE 'AFTER'
      END as timing,
      CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'UNKNOWN'
      END as event,
      pg_get_triggerdef(oid) as definition
    FROM pg_trigger
    WHERE tgrelid = 'public.business_profile'::regclass
      AND tgisinternal = false
    ORDER BY tgname
  LOOP
    RAISE NOTICE 'Trigger: % | Event: % | Timing: %', r.trigger_name, r.event, r.timing;
    IF r.trigger_name = 'trigger_delete_business_on_owner_delete' THEN
      RAISE WARNING '⚠ PROBLEM: trigger_delete_business_on_owner_delete still exists!';
      RAISE NOTICE 'Definition: %', r.definition;
    END IF;
  END LOOP;
  
  RAISE NOTICE '==============================================';
END $$;

-- List all functions that might be problematic
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Functions containing "delete" and "business":';
  RAISE NOTICE '==============================================';
  
  FOR r IN
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (
        p.proname LIKE '%delete%' AND p.proname LIKE '%business%'
        OR p.proname LIKE '%business%' AND p.proname LIKE '%delete%'
      )
  LOOP
    RAISE NOTICE 'Function: %', r.function_name;
    IF r.function_name = 'delete_business_on_owner_delete' THEN
      RAISE WARNING '⚠ PROBLEM: delete_business_on_owner_delete still exists!';
    END IF;
  END LOOP;
  
  RAISE NOTICE '==============================================';
END $$;

-- Final force removal (in case it somehow still exists)
DO $$
BEGIN
  -- Drop trigger with all variations
  DROP TRIGGER IF EXISTS trigger_delete_business_on_owner_delete ON public.business_profile CASCADE;
  
  -- Drop function with all possible signatures
  DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete() CASCADE;
  
  -- Also try dropping without parentheses
  BEGIN
    DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete CASCADE;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RAISE NOTICE '✓ Final cleanup completed';
END $$;

