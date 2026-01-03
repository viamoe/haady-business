-- Create exec_sql function to allow SQL execution via RPC
-- This function is needed for programmatic migrations
CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

COMMENT ON FUNCTION public.exec_sql IS 'Execute raw SQL queries. Used for programmatic migrations. Requires SECURITY DEFINER to bypass RLS.';

