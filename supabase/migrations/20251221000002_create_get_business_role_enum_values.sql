-- ================================
-- Create RPC function to get business_role_enum values
-- ================================
-- Description: Creates a function to query business_role_enum values from the database
-- Date: 2025-12-21

CREATE OR REPLACE FUNCTION public.get_business_role_enum_values()
RETURNS TABLE(value text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT enumlabel::text as value
  FROM pg_enum
  WHERE enumtypid = (
    SELECT oid
    FROM pg_type
    WHERE typname = 'business_role_enum'
  )
  ORDER BY enumsortorder;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_business_role_enum_values() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_role_enum_values() TO anon;

COMMENT ON FUNCTION public.get_business_role_enum_values IS 'Returns all values from the business_role_enum type for use in dropdowns and forms';

DO $$
BEGIN
  RAISE NOTICE 'Created get_business_role_enum_values RPC function';
END $$;

