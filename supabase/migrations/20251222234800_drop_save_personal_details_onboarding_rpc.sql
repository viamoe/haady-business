-- ================================
-- Drop save_personal_details_onboarding RPC function
-- ================================
-- Description: Drops the save_personal_details_onboarding RPC function
-- Date: 2025-12-23

-- =====================================================
-- Drop the RPC function
-- =====================================================

DROP FUNCTION IF EXISTS public.save_personal_details_onboarding CASCADE;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Dropped save_personal_details_onboarding RPC function';
  RAISE NOTICE '==============================================';
END $$;

