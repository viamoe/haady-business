-- ====================================================================
-- Migration: Add Bundle Product System
-- Description: Adds bundle product type with multi-product composition
--              and auto-substitution when inventory is insufficient
-- Date: 2025-01-31
-- ====================================================================

-- Add 'bundle' to product_type_enum
ALTER TYPE product_type_enum ADD VALUE IF NOT EXISTS 'bundle';

-- ====================================================================
-- Bundle Items Table
-- Links products to bundles with quantity requirements
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT true,  -- If false, can be skipped entirely
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate product in same bundle
  UNIQUE(bundle_id, product_id),
  
  -- Prevent bundle containing itself
  CHECK (bundle_id != product_id)
);

-- ====================================================================
-- Bundle Substitutes Table
-- Defines fallback products when primary item is unavailable
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bundle_substitutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_item_id UUID NOT NULL REFERENCES public.bundle_items(id) ON DELETE CASCADE,
  substitute_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 1,  -- Lower number = higher priority
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate substitute for same bundle item
  UNIQUE(bundle_item_id, substitute_product_id)
);

-- ====================================================================
-- Bundle Fulfillment Log
-- Tracks which products were actually used when fulfilling a bundle order
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bundle_fulfillment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,  -- Reference to orders table when implemented
  bundle_id UUID NOT NULL REFERENCES public.products(id),
  bundle_item_id UUID NOT NULL REFERENCES public.bundle_items(id),
  original_product_id UUID NOT NULL REFERENCES public.products(id),
  fulfilled_product_id UUID NOT NULL REFERENCES public.products(id),
  was_substituted BOOLEAN NOT NULL DEFAULT false,
  substitution_reason TEXT,  -- 'out_of_stock', 'insufficient_quantity', etc.
  quantity_fulfilled INTEGER NOT NULL,
  fulfilled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- Indexes for Performance
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON public.bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_product_id ON public.bundle_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_substitutes_bundle_item_id ON public.bundle_substitutes(bundle_item_id);
CREATE INDEX IF NOT EXISTS idx_bundle_fulfillment_order_id ON public.bundle_fulfillment_log(order_id);
CREATE INDEX IF NOT EXISTS idx_bundle_fulfillment_bundle_id ON public.bundle_fulfillment_log(bundle_id);

-- ====================================================================
-- Comments for Documentation
-- ====================================================================
COMMENT ON TABLE public.bundle_items IS 'Products included in a bundle with their quantities';
COMMENT ON TABLE public.bundle_substitutes IS 'Fallback products when bundle item is unavailable';
COMMENT ON TABLE public.bundle_fulfillment_log IS 'Tracks actual products used when fulfilling bundle orders';

COMMENT ON COLUMN public.bundle_items.is_required IS 'If false, item can be skipped when unavailable and no substitutes exist';
COMMENT ON COLUMN public.bundle_items.sort_order IS 'Display order of items in the bundle';
COMMENT ON COLUMN public.bundle_substitutes.priority IS 'Substitution priority - lower number tried first';
COMMENT ON COLUMN public.bundle_fulfillment_log.substitution_reason IS 'Why substitution occurred: out_of_stock, insufficient_quantity, etc.';

-- ====================================================================
-- RLS Policies
-- ====================================================================
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_substitutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_fulfillment_log ENABLE ROW LEVEL SECURITY;

-- Bundle items: Allow access if user owns the bundle's store
CREATE POLICY "Users can manage bundle items for their store products"
  ON public.bundle_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON p.store_id = s.id
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE p.id = bundle_items.bundle_id
      AND bp.auth_user_id = auth.uid()
    )
  );

-- Bundle substitutes: Allow access if user owns the bundle's store
CREATE POLICY "Users can manage bundle substitutes for their store products"
  ON public.bundle_substitutes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bundle_items bi
      JOIN public.products p ON bi.bundle_id = p.id
      JOIN public.stores s ON p.store_id = s.id
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE bi.id = bundle_substitutes.bundle_item_id
      AND bp.auth_user_id = auth.uid()
    )
  );

-- Fulfillment log: Allow access if user owns the bundle's store
CREATE POLICY "Users can view fulfillment logs for their store bundles"
  ON public.bundle_fulfillment_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON p.store_id = s.id
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE p.id = bundle_fulfillment_log.bundle_id
      AND bp.auth_user_id = auth.uid()
    )
  );

-- ====================================================================
-- Function: Check Bundle Availability with Substitution
-- Returns which products can be fulfilled and any needed substitutions
-- ====================================================================
CREATE OR REPLACE FUNCTION public.check_bundle_availability(
  p_bundle_id UUID,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  bundle_item_id UUID,
  original_product_id UUID,
  original_product_name TEXT,
  fulfillable_product_id UUID,
  fulfillable_product_name TEXT,
  required_quantity INTEGER,
  available_quantity INTEGER,
  is_substituted BOOLEAN,
  is_available BOOLEAN,
  substitution_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH bundle_products AS (
    SELECT 
      bi.id as bi_id,
      bi.product_id,
      bi.quantity as required_qty,
      bi.is_required,
      p.name_en as product_name
    FROM public.bundle_items bi
    JOIN public.products p ON bi.product_id = p.id
    WHERE bi.bundle_id = p_bundle_id
    ORDER BY bi.sort_order
  ),
  inventory_check AS (
    SELECT 
      bp.bi_id,
      bp.product_id,
      bp.product_name,
      bp.required_qty,
      bp.is_required,
      COALESCE(SUM(
        CASE 
          WHEN p_branch_id IS NULL THEN i.available_quantity
          WHEN i.branch_id = p_branch_id THEN i.available_quantity
          ELSE 0
        END
      ), 0)::INTEGER as avail_qty
    FROM bundle_products bp
    LEFT JOIN public.inventory i ON bp.product_id = i.product_id
    GROUP BY bp.bi_id, bp.product_id, bp.product_name, bp.required_qty, bp.is_required
  )
  SELECT 
    ic.bi_id as bundle_item_id,
    ic.product_id as original_product_id,
    ic.product_name as original_product_name,
    CASE 
      WHEN ic.avail_qty >= ic.required_qty THEN ic.product_id
      ELSE (
        -- Find first available substitute
        SELECT bs.substitute_product_id
        FROM public.bundle_substitutes bs
        JOIN public.products sp ON bs.substitute_product_id = sp.id
        LEFT JOIN public.inventory si ON sp.id = si.product_id
          AND (p_branch_id IS NULL OR si.branch_id = p_branch_id)
        WHERE bs.bundle_item_id = ic.bi_id
        GROUP BY bs.substitute_product_id, bs.priority
        HAVING COALESCE(SUM(si.available_quantity), 0) >= ic.required_qty
        ORDER BY bs.priority
        LIMIT 1
      )
    END as fulfillable_product_id,
    CASE 
      WHEN ic.avail_qty >= ic.required_qty THEN ic.product_name
      ELSE (
        SELECT sp.name_en
        FROM public.bundle_substitutes bs
        JOIN public.products sp ON bs.substitute_product_id = sp.id
        LEFT JOIN public.inventory si ON sp.id = si.product_id
          AND (p_branch_id IS NULL OR si.branch_id = p_branch_id)
        WHERE bs.bundle_item_id = ic.bi_id
        GROUP BY bs.substitute_product_id, sp.name_en, bs.priority
        HAVING COALESCE(SUM(si.available_quantity), 0) >= ic.required_qty
        ORDER BY bs.priority
        LIMIT 1
      )
    END as fulfillable_product_name,
    ic.required_qty as required_quantity,
    ic.avail_qty as available_quantity,
    ic.avail_qty < ic.required_qty as is_substituted,
    CASE 
      WHEN ic.avail_qty >= ic.required_qty THEN true
      WHEN NOT ic.is_required THEN true  -- Optional items are always "available"
      ELSE EXISTS (
        SELECT 1 FROM public.bundle_substitutes bs
        JOIN public.products sp ON bs.substitute_product_id = sp.id
        LEFT JOIN public.inventory si ON sp.id = si.product_id
          AND (p_branch_id IS NULL OR si.branch_id = p_branch_id)
        WHERE bs.bundle_item_id = ic.bi_id
        GROUP BY bs.substitute_product_id
        HAVING COALESCE(SUM(si.available_quantity), 0) >= ic.required_qty
      )
    END as is_available,
    CASE 
      WHEN ic.avail_qty >= ic.required_qty THEN NULL
      WHEN ic.avail_qty = 0 THEN 'out_of_stock'
      ELSE 'insufficient_quantity'
    END as substitution_reason
  FROM inventory_check ic;
END;
$$;

COMMENT ON FUNCTION public.check_bundle_availability IS 'Checks if all bundle items are available, considering substitutes';

