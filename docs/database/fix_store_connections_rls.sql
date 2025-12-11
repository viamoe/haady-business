-- ================================
-- Fix Store Connections RLS Policies
-- ================================
-- Run this if you're getting permission errors when querying store_connections

-- First, check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'store_connections';

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can insert their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can update their own store connections" ON public.store_connections;
DROP POLICY IF EXISTS "Users can delete their own store connections" ON public.store_connections;

-- Ensure RLS is enabled
ALTER TABLE public.store_connections ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can view their own store connections"
  ON public.store_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own store connections"
  ON public.store_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store connections"
  ON public.store_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own store connections"
  ON public.store_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify policies were created
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'store_connections';

