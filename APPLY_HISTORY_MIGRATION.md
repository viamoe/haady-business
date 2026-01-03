# Fix Product Edit History - URGENT

## The Problem
Edit history is not showing because the database migrations haven't been run.

## Quick Fix (2 minutes)

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run Migration 1
Copy and paste this SQL, then click **Run**:

```sql
-- Create product_edit_history table
CREATE TABLE IF NOT EXISTS public.product_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changes JSONB NOT NULL,
  edit_type TEXT NOT NULL DEFAULT 'update',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_edit_history_product_id ON public.product_edit_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_edit_history_edited_by ON public.product_edit_history(edited_by);
CREATE INDEX IF NOT EXISTS idx_product_edit_history_created_at ON public.product_edit_history(created_at DESC);

ALTER TABLE public.product_edit_history ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Service role can insert edit history" ON public.product_edit_history;

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
```

### Step 3: Verify
1. Update a product
2. Check the browser console for: `✅ Edit history saved successfully`
3. Open Edit History dialog - it should show the changes!

## Verify It Works

Run this command to check:
```bash
cd haady-business
node scripts/check-edit-history.mjs
```

## What This Does
- Creates the `product_edit_history` table
- Sets up indexes for fast queries
- Allows users to view history for their products
- Allows users to insert history when they edit products

## After Running
1. Edit a product and save
2. Check server console logs - you should see: `📝 Saving edit history with changes:`
3. Open Edit History - you should see your changes!

