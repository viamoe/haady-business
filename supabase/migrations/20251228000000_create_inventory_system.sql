-- ====================================================================
-- Migration: Create Comprehensive Inventory Management System
-- Description: Adds store branches, inventory tracking, stock movements,
--              and location-based availability
-- Date: 2025-12-28
-- ====================================================================

-- ============================================
-- 1. STORE BRANCHES TABLE
-- ============================================
-- Allows stores to have multiple physical locations/branches

CREATE TABLE IF NOT EXISTS public.store_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  code VARCHAR(50), -- Branch code for internal reference (e.g., "BR001")
  address TEXT,
  address_ar TEXT,
  city VARCHAR(100),
  city_ar VARCHAR(100),
  country_id UUID REFERENCES public.countries(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_main_branch BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  opening_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_store_branches_store_id ON public.store_branches(store_id);
CREATE INDEX IF NOT EXISTS idx_store_branches_is_active ON public.store_branches(is_active);

-- Add comments
COMMENT ON TABLE public.store_branches IS 'Store branch locations for multi-location inventory management';
COMMENT ON COLUMN public.store_branches.is_main_branch IS 'Indicates if this is the primary/headquarters branch';
COMMENT ON COLUMN public.store_branches.opening_hours IS 'JSON object with day-specific opening hours';

-- ============================================
-- 2. INVENTORY TABLE
-- ============================================
-- Tracks stock quantity per product per branch

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.store_branches(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Stock levels
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0, -- Reserved for pending orders
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  
  -- Thresholds
  low_stock_threshold INTEGER DEFAULT 10,
  reorder_point INTEGER DEFAULT 5,
  max_stock_level INTEGER,
  
  -- Location within warehouse/branch
  warehouse_location VARCHAR(100), -- e.g., "Aisle 3, Shelf B"
  bin_number VARCHAR(50),
  
  -- Tracking
  last_stock_check TIMESTAMPTZ,
  last_restock_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique product per branch
  UNIQUE(product_id, branch_id)
);

-- Partial unique index for store-level inventory (when no branch)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_product_store_no_branch 
  ON public.inventory(product_id, store_id) 
  WHERE branch_id IS NULL;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON public.inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON public.inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(quantity) WHERE quantity <= low_stock_threshold;

-- Add comments
COMMENT ON TABLE public.inventory IS 'Product inventory levels per branch or store';
COMMENT ON COLUMN public.inventory.reserved_quantity IS 'Stock reserved for pending/processing orders';
COMMENT ON COLUMN public.inventory.available_quantity IS 'Computed: quantity minus reserved_quantity';
COMMENT ON COLUMN public.inventory.reorder_point IS 'Quantity at which to trigger reorder alert';

-- ============================================
-- 3. INVENTORY TRANSACTIONS TABLE
-- ============================================
-- Audit log for all stock movements

CREATE TYPE inventory_transaction_type AS ENUM (
  'purchase',        -- Stock received from supplier
  'sale',            -- Stock sold to customer
  'return',          -- Customer return
  'adjustment',      -- Manual adjustment (correction)
  'transfer_out',    -- Transferred to another branch
  'transfer_in',     -- Received from another branch
  'damage',          -- Damaged/expired stock
  'theft',           -- Lost/stolen stock
  'initial'          -- Initial stock count
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.store_branches(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type inventory_transaction_type NOT NULL,
  quantity_change INTEGER NOT NULL, -- Positive for additions, negative for removals
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  
  -- Reference info
  reference_type VARCHAR(50), -- 'order', 'purchase_order', 'transfer', etc.
  reference_id UUID,          -- ID of related order/transfer/etc.
  
  -- Transfer specific
  from_branch_id UUID REFERENCES public.store_branches(id),
  to_branch_id UUID REFERENCES public.store_branches(id),
  
  -- Metadata
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_inv_transactions_inventory_id ON public.inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_product_id ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_created_at ON public.inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_type ON public.inventory_transactions(transaction_type);

-- Add comments
COMMENT ON TABLE public.inventory_transactions IS 'Audit log of all inventory movements';
COMMENT ON COLUMN public.inventory_transactions.quantity_change IS 'Positive for stock in, negative for stock out';

-- ============================================
-- 4. DELIVERY ZONES TABLE
-- ============================================
-- Define areas where delivery is available

CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  
  -- Zone definition (can use different methods)
  zone_type VARCHAR(50) DEFAULT 'radius', -- 'radius', 'polygon', 'city', 'postal_codes'
  
  -- For radius-based zones
  center_latitude DECIMAL(10, 8),
  center_longitude DECIMAL(11, 8),
  radius_km DECIMAL(10, 2),
  
  -- For polygon-based zones (GeoJSON)
  polygon_geojson JSONB,
  
  -- For city/postal code based zones
  cities TEXT[], -- Array of city names
  postal_codes TEXT[], -- Array of postal codes
  
  -- Delivery settings
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  minimum_order_amount DECIMAL(10, 2),
  estimated_delivery_minutes INTEGER,
  
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- For overlapping zones, higher priority wins
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_delivery_zones_store_id ON public.delivery_zones(store_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_is_active ON public.delivery_zones(is_active);

-- Add comments
COMMENT ON TABLE public.delivery_zones IS 'Delivery coverage areas for stores';
COMMENT ON COLUMN public.delivery_zones.zone_type IS 'Method of zone definition: radius, polygon, city, or postal_codes';

-- ============================================
-- 5. BRANCH DELIVERY ZONES TABLE
-- ============================================
-- Links branches to the delivery zones they serve

CREATE TABLE IF NOT EXISTS public.branch_delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.store_branches(id) ON DELETE CASCADE,
  delivery_zone_id UUID NOT NULL REFERENCES public.delivery_zones(id) ON DELETE CASCADE,
  
  -- Branch-specific overrides
  delivery_fee_override DECIMAL(10, 2),
  estimated_delivery_minutes_override INTEGER,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(branch_id, delivery_zone_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_branch_delivery_zones_branch ON public.branch_delivery_zones(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_delivery_zones_zone ON public.branch_delivery_zones(delivery_zone_id);

-- Add comments
COMMENT ON TABLE public.branch_delivery_zones IS 'Maps which branches serve which delivery zones';

-- ============================================
-- 6. ADD INVENTORY FIELDS TO PRODUCTS TABLE
-- ============================================

-- Add inventory-related columns to products table if they don't exist
DO $$ 
BEGIN
  -- Track inventory at product level (for stores without branches)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'products' 
                 AND column_name = 'track_inventory') THEN
    ALTER TABLE public.products ADD COLUMN track_inventory BOOLEAN DEFAULT true;
  END IF;
  
  -- Allow overselling (backorders)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'products' 
                 AND column_name = 'allow_backorder') THEN
    ALTER TABLE public.products ADD COLUMN allow_backorder BOOLEAN DEFAULT false;
  END IF;
  
  -- Default low stock threshold
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'products' 
                 AND column_name = 'low_stock_threshold') THEN
    ALTER TABLE public.products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.products.track_inventory IS 'Whether to track inventory for this product';
COMMENT ON COLUMN public.products.allow_backorder IS 'Allow orders when stock is 0';
COMMENT ON COLUMN public.products.low_stock_threshold IS 'Default threshold for low stock alerts';

-- ============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE public.store_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_delivery_zones ENABLE ROW LEVEL SECURITY;

-- Store Branches Policies
CREATE POLICY "Users can view branches for their stores"
  ON public.store_branches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = store_branches.store_id AND bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage branches for their stores"
  ON public.store_branches FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = store_branches.store_id AND bp.auth_user_id = auth.uid()
    )
  );

-- Inventory Policies
CREATE POLICY "Users can view inventory for their stores"
  ON public.inventory FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = inventory.store_id AND bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage inventory for their stores"
  ON public.inventory FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = inventory.store_id AND bp.auth_user_id = auth.uid()
    )
  );

-- Inventory Transactions Policies
CREATE POLICY "Users can view transactions for their stores"
  ON public.inventory_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = inventory_transactions.store_id AND bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions for their stores"
  ON public.inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = inventory_transactions.store_id AND bp.auth_user_id = auth.uid()
    )
  );

-- Delivery Zones Policies
CREATE POLICY "Users can view delivery zones for their stores"
  ON public.delivery_zones FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = delivery_zones.store_id AND bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage delivery zones for their stores"
  ON public.delivery_zones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE s.id = delivery_zones.store_id AND bp.auth_user_id = auth.uid()
    )
  );

-- Branch Delivery Zones Policies
CREATE POLICY "Users can view branch zones for their stores"
  ON public.branch_delivery_zones FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_branches sb
      JOIN public.stores s ON sb.store_id = s.id
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE sb.id = branch_delivery_zones.branch_id AND bp.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage branch zones for their stores"
  ON public.branch_delivery_zones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_branches sb
      JOIN public.stores s ON sb.store_id = s.id
      JOIN public.business_profile bp ON s.business_id = bp.id
      WHERE sb.id = branch_delivery_zones.branch_id AND bp.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to get total available quantity across all branches
CREATE OR REPLACE FUNCTION get_product_total_available(p_product_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(available_quantity), 0)::INTEGER
  FROM public.inventory
  WHERE product_id = p_product_id;
$$ LANGUAGE sql STABLE;

-- Function to check if product is available in a specific zone
CREATE OR REPLACE FUNCTION is_product_available_in_zone(
  p_product_id UUID,
  p_zone_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.inventory i
    JOIN public.branch_delivery_zones bdz ON i.branch_id = bdz.branch_id
    WHERE i.product_id = p_product_id
      AND bdz.delivery_zone_id = p_zone_id
      AND bdz.is_active = true
      AND i.available_quantity > 0
  );
$$ LANGUAGE sql STABLE;

-- Function to adjust inventory with transaction logging
CREATE OR REPLACE FUNCTION adjust_inventory(
  p_product_id UUID,
  p_branch_id UUID,
  p_store_id UUID,
  p_quantity_change INTEGER,
  p_transaction_type inventory_transaction_type,
  p_notes TEXT DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_inventory_id UUID;
  v_quantity_before INTEGER;
  v_quantity_after INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Get or create inventory record
  SELECT id, quantity INTO v_inventory_id, v_quantity_before
  FROM public.inventory
  WHERE product_id = p_product_id 
    AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
    AND store_id = p_store_id;
  
  IF v_inventory_id IS NULL THEN
    -- Create new inventory record
    INSERT INTO public.inventory (product_id, branch_id, store_id, quantity)
    VALUES (p_product_id, p_branch_id, p_store_id, GREATEST(0, p_quantity_change))
    RETURNING id, 0, quantity INTO v_inventory_id, v_quantity_before, v_quantity_after;
  ELSE
    -- Update existing record
    v_quantity_after := GREATEST(0, v_quantity_before + p_quantity_change);
    
    UPDATE public.inventory
    SET quantity = v_quantity_after,
        updated_at = NOW()
    WHERE id = v_inventory_id;
  END IF;
  
  -- Create transaction record
  INSERT INTO public.inventory_transactions (
    inventory_id, product_id, branch_id, store_id,
    transaction_type, quantity_change, quantity_before, quantity_after,
    notes, reference_type, reference_id, performed_by
  )
  VALUES (
    v_inventory_id, p_product_id, p_branch_id, p_store_id,
    p_transaction_type, p_quantity_change, v_quantity_before, v_quantity_after,
    p_notes, p_reference_type, p_reference_id, auth.uid()
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer stock between branches
CREATE OR REPLACE FUNCTION transfer_inventory(
  p_product_id UUID,
  p_from_branch_id UUID,
  p_to_branch_id UUID,
  p_store_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(from_transaction_id UUID, to_transaction_id UUID) AS $$
DECLARE
  v_from_tx_id UUID;
  v_to_tx_id UUID;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be positive';
  END IF;
  
  -- Check source has enough stock
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory 
    WHERE product_id = p_product_id 
      AND branch_id = p_from_branch_id 
      AND available_quantity >= p_quantity
  ) THEN
    RAISE EXCEPTION 'Insufficient stock for transfer';
  END IF;
  
  -- Remove from source
  v_from_tx_id := adjust_inventory(
    p_product_id, p_from_branch_id, p_store_id,
    -p_quantity, 'transfer_out', p_notes
  );
  
  -- Update from transaction with transfer details
  UPDATE public.inventory_transactions
  SET from_branch_id = p_from_branch_id, to_branch_id = p_to_branch_id
  WHERE id = v_from_tx_id;
  
  -- Add to destination
  v_to_tx_id := adjust_inventory(
    p_product_id, p_to_branch_id, p_store_id,
    p_quantity, 'transfer_in', p_notes
  );
  
  -- Update to transaction with transfer details
  UPDATE public.inventory_transactions
  SET from_branch_id = p_from_branch_id, to_branch_id = p_to_branch_id
  WHERE id = v_to_tx_id;
  
  RETURN QUERY SELECT v_from_tx_id, v_to_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_product_total_available(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_product_available_in_zone(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_inventory(UUID, UUID, UUID, INTEGER, inventory_transaction_type, TEXT, VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_inventory(UUID, UUID, UUID, UUID, INTEGER, TEXT) TO authenticated;

-- ============================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_branches_updated_at
  BEFORE UPDATE ON public.store_branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

