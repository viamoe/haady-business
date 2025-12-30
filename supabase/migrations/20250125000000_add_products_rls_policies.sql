-- ====================================================================
-- Add RLS Policies for Products Table
-- Description: Allows authenticated users to manage products in their stores
-- Date: 2025-01-25
-- ====================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view products for their stores" ON public.products;
DROP POLICY IF EXISTS "Users can insert products for their stores" ON public.products;
DROP POLICY IF EXISTS "Users can update products for their stores" ON public.products;

-- Policy: Users can view products in their stores
CREATE POLICY "Users can view products for their stores"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = products.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert products into their stores
CREATE POLICY "Users can insert products for their stores"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = products.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update products in their stores
CREATE POLICY "Users can update products for their stores"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = products.store_id
        AND bp.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = products.store_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Note: DELETE policy already exists from previous migration
-- (20251215042000_fix_user_deletion_issues.sql)

