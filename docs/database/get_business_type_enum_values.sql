-- Create RPC function to get business_type_enum values
-- Run this in Supabase SQL Editor to enable enum querying

CREATE OR REPLACE FUNCTION get_business_type_enum_values()
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
    WHERE typname = 'business_type_enum'
  )
  ORDER BY enumsortorder;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_business_type_enum_values() TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_type_enum_values() TO anon;

