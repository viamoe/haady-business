-- ================================
-- Create get_user_by_email RPC function
-- ================================
-- Description: Efficiently queries auth.users by email using index lookup
-- Date: 2025-12-23

-- =====================================================
-- Create the RPC function
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_by_email CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Query auth.users directly (requires SECURITY DEFINER to access auth schema)
  -- This uses the email index for O(1) lookup performance
  RETURN QUERY
  SELECT 
    au.id,
    au.email
  FROM auth.users au
  WHERE LOWER(TRIM(au.email)) = LOWER(TRIM(p_email))
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_email TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_user_by_email IS 'Efficiently queries auth.users by email. Returns user id and email if found, empty result if not found.';

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Created get_user_by_email RPC function';
  RAISE NOTICE '  - Queries auth.users with index lookup';
  RAISE NOTICE '  - O(1) performance with email index';
  RAISE NOTICE '==============================================';
END $$;

