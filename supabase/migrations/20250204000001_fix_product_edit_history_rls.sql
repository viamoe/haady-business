-- ====================================================================
-- Migration: Fix Product Edit History RLS Policy
-- Description: Allow authenticated users to insert their own edit history
-- Date: 2025-02-04
-- ====================================================================

-- Drop the old service role only policy
DROP POLICY IF EXISTS "Service role can insert edit history" ON public.product_edit_history;

-- Create a policy that allows authenticated users to insert history for their own products
CREATE POLICY "Users can insert edit history for their products"
  ON public.product_edit_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      JOIN public.business_profile bp ON bp.id = s.business_id
      WHERE p.id = product_edit_history.product_id
        AND bp.auth_user_id = auth.uid()
        AND product_edit_history.edited_by = auth.uid()
    )
  );

