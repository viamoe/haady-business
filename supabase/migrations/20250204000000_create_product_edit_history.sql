-- ====================================================================
-- Migration: Create Product Edit History System
-- Description: Creates table to track product edit history for audit trail
-- Date: 2025-02-04
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create product_edit_history table
CREATE TABLE IF NOT EXISTS public.product_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changes JSONB NOT NULL, -- Stores the changed fields and their old/new values
  edit_type TEXT NOT NULL DEFAULT 'update', -- 'update', 'draft_save', 'publish', etc.
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_edit_history_product_id ON public.product_edit_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_edit_history_edited_by ON public.product_edit_history(edited_by);
CREATE INDEX IF NOT EXISTS idx_product_edit_history_created_at ON public.product_edit_history(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.product_edit_history IS 'Tracks all edits made to products for audit trail and history';
COMMENT ON COLUMN public.product_edit_history.changes IS 'JSON object containing field names as keys and objects with old_value and new_value';
COMMENT ON COLUMN public.product_edit_history.edit_type IS 'Type of edit: update, draft_save, publish, etc.';

-- Enable RLS
ALTER TABLE public.product_edit_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only view edit history for products in their stores
CREATE POLICY "Users can view edit history for their products"
  ON public.product_edit_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      JOIN public.business_profile bp ON bp.id = s.business_id
      WHERE p.id = product_edit_history.product_id
        AND bp.auth_user_id = auth.uid()
    )
  );

-- Create RLS policy: System can insert edit history (via service role)
CREATE POLICY "Service role can insert edit history"
  ON public.product_edit_history
  FOR INSERT
  WITH CHECK (true);

