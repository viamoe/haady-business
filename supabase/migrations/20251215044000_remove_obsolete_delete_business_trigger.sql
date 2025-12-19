-- ================================
-- Remove obsolete delete_business_on_owner_delete trigger
-- ================================
-- Description: The delete_business_on_owner_delete function and trigger are
--              no longer needed since businesses table was merged into business_profile.
--              CASCADE deletes now handle everything automatically.
-- Date: 2025-12-15

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_delete_business_on_owner_delete ON public.business_profile;

-- Drop the function
DROP FUNCTION IF EXISTS public.delete_business_on_owner_delete();

-- Add comment explaining why it was removed
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Removed obsolete delete_business_on_owner_delete';
  RAISE NOTICE 'Reason: businesses table merged into business_profile';
  RAISE NOTICE 'CASCADE deletes now handle all cleanup automatically';
  RAISE NOTICE '==============================================';
END $$;

