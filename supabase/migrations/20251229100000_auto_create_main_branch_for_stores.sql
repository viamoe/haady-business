-- ====================================================================
-- Migration: Auto-Create Main Branch for Stores
-- Description: Ensures every store has a main branch, creates trigger
--              for new stores, and migrates existing inventory
-- Date: 2025-12-29
-- ====================================================================

-- ============================================
-- 1. CREATE MAIN BRANCHES FOR EXISTING STORES
-- ============================================
-- Any store that doesn't have a main branch gets one created automatically

INSERT INTO public.store_branches (
  store_id,
  name,
  name_ar,
  code,
  address,
  city,
  is_main_branch,
  is_active,
  created_at
)
SELECT 
  s.id AS store_id,
  COALESCE(s.name, 'Main Branch') AS name,
  COALESCE(s.name_ar, 'الفرع الرئيسي') AS name_ar,
  'MAIN' AS code,
  s.address AS address,
  s.city AS city,
  true AS is_main_branch,
  true AS is_active,
  s.created_at
FROM public.stores s
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_branches sb 
  WHERE sb.store_id = s.id AND sb.is_main_branch = true
)
AND s.is_active = true;

-- ============================================
-- 2. MIGRATE INVENTORY WITHOUT BRANCH TO MAIN BRANCH
-- ============================================
-- Move any inventory records with NULL branch_id to the main branch

UPDATE public.inventory inv
SET branch_id = sb.id
FROM public.store_branches sb
WHERE inv.store_id = sb.store_id
  AND sb.is_main_branch = true
  AND inv.branch_id IS NULL;

-- ============================================
-- 3. CREATE TRIGGER FUNCTION FOR AUTO-CREATING MAIN BRANCH
-- ============================================

CREATE OR REPLACE FUNCTION create_main_branch_for_store()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a main branch for the newly created store
  INSERT INTO public.store_branches (
    store_id,
    name,
    name_ar,
    code,
    address,
    city,
    is_main_branch,
    is_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.name, 'Main Branch'),
    COALESCE(NEW.name_ar, 'الفرع الرئيسي'),
    'MAIN',
    NEW.address,
    NEW.city,
    true,
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create main branch when a store is created
DROP TRIGGER IF EXISTS trigger_create_main_branch ON public.stores;
CREATE TRIGGER trigger_create_main_branch
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION create_main_branch_for_store();

-- ============================================
-- 4. CREATE FUNCTION TO ENSURE MAIN BRANCH EXISTS
-- ============================================
-- Helper function to ensure a store has a main branch

CREATE OR REPLACE FUNCTION ensure_main_branch_exists(p_store_id UUID)
RETURNS UUID AS $$
DECLARE
  v_branch_id UUID;
  v_store RECORD;
BEGIN
  -- Check if main branch already exists
  SELECT id INTO v_branch_id
  FROM public.store_branches
  WHERE store_id = p_store_id AND is_main_branch = true
  LIMIT 1;
  
  -- If exists, return it
  IF v_branch_id IS NOT NULL THEN
    RETURN v_branch_id;
  END IF;
  
  -- Get store info
  SELECT * INTO v_store FROM public.stores WHERE id = p_store_id;
  
  IF v_store IS NULL THEN
    RAISE EXCEPTION 'Store not found: %', p_store_id;
  END IF;
  
  -- Create main branch
  INSERT INTO public.store_branches (
    store_id,
    name,
    name_ar,
    code,
    address,
    city,
    is_main_branch,
    is_active
  )
  VALUES (
    p_store_id,
    COALESCE(v_store.name, 'Main Branch'),
    COALESCE(v_store.name_ar, 'الفرع الرئيسي'),
    'MAIN',
    v_store.address,
    v_store.city,
    true,
    true
  )
  RETURNING id INTO v_branch_id;
  
  RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_main_branch_exists(UUID) TO authenticated;

-- ============================================
-- 5. PREVENT DELETION/DEACTIVATION OF MAIN BRANCH
-- ============================================

CREATE OR REPLACE FUNCTION prevent_main_branch_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of main branch
  IF TG_OP = 'DELETE' AND OLD.is_main_branch = true THEN
    RAISE EXCEPTION 'Cannot delete the main branch. Every store must have a main branch.';
  END IF;
  
  -- Prevent deactivating main branch
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_main_branch = true AND NEW.is_active = false THEN
      RAISE EXCEPTION 'Cannot deactivate the main branch. Every store must have an active main branch.';
    END IF;
    
    -- Prevent changing is_main_branch from true to false
    IF OLD.is_main_branch = true AND NEW.is_main_branch = false THEN
      RAISE EXCEPTION 'Cannot change main branch status. Create a new main branch first.';
    END IF;
    
    -- Prevent setting another branch as main if one already exists
    IF NEW.is_main_branch = true AND OLD.is_main_branch = false THEN
      IF EXISTS (
        SELECT 1 FROM public.store_branches 
        WHERE store_id = NEW.store_id 
        AND is_main_branch = true 
        AND id != NEW.id
      ) THEN
        -- Remove main status from existing main branch
        UPDATE public.store_branches
        SET is_main_branch = false
        WHERE store_id = NEW.store_id 
        AND is_main_branch = true 
        AND id != NEW.id;
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_main_branch_modification ON public.store_branches;
CREATE TRIGGER trigger_prevent_main_branch_modification
  BEFORE UPDATE OR DELETE ON public.store_branches
  FOR EACH ROW
  EXECUTE FUNCTION prevent_main_branch_modification();

-- ============================================
-- 6. CREATE INVENTORY FOR PRODUCT IN ALL BRANCHES
-- ============================================
-- When a product is created, create inventory records for all branches

CREATE OR REPLACE FUNCTION create_inventory_for_product()
RETURNS TRIGGER AS $$
DECLARE
  v_branch RECORD;
BEGIN
  -- Only create inventory if track_inventory is true (or not set, defaulting to true)
  IF NEW.track_inventory IS NULL OR NEW.track_inventory = true THEN
    -- Create inventory record for each active branch of this product's store
    FOR v_branch IN 
      SELECT id FROM public.store_branches 
      WHERE store_id = NEW.store_id AND is_active = true
    LOOP
      -- Insert inventory record if it doesn't exist
      INSERT INTO public.inventory (
        product_id,
        branch_id,
        store_id,
        quantity,
        low_stock_threshold
      )
      VALUES (
        NEW.id,
        v_branch.id,
        NEW.store_id,
        0,
        COALESCE(NEW.low_stock_threshold, 10)
      )
      ON CONFLICT (product_id, branch_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_inventory_for_product ON public.products;
CREATE TRIGGER trigger_create_inventory_for_product
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_for_product();

-- ============================================
-- 7. CREATE INVENTORY FOR NEW BRANCHES
-- ============================================
-- When a branch is created, create inventory for all products

CREATE OR REPLACE FUNCTION create_inventory_for_branch()
RETURNS TRIGGER AS $$
DECLARE
  v_product RECORD;
BEGIN
  -- Create inventory record for each active product in this store
  FOR v_product IN 
    SELECT id, low_stock_threshold FROM public.products 
    WHERE store_id = NEW.store_id 
    AND is_active = true
    AND (track_inventory IS NULL OR track_inventory = true)
  LOOP
    -- Insert inventory record if it doesn't exist
    INSERT INTO public.inventory (
      product_id,
      branch_id,
      store_id,
      quantity,
      low_stock_threshold
    )
    VALUES (
      v_product.id,
      NEW.id,
      NEW.store_id,
      0,
      COALESCE(v_product.low_stock_threshold, 10)
    )
    ON CONFLICT (product_id, branch_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_inventory_for_branch ON public.store_branches;
CREATE TRIGGER trigger_create_inventory_for_branch
  AFTER INSERT ON public.store_branches
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_for_branch();

-- ============================================
-- 8. UPDATE STORE INFO SYNC TO MAIN BRANCH
-- ============================================
-- Keep main branch info in sync with store info

CREATE OR REPLACE FUNCTION sync_store_info_to_main_branch()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the main branch with store info changes
  UPDATE public.store_branches
  SET 
    address = COALESCE(NEW.address, address),
    city = COALESCE(NEW.city, city),
    updated_at = NOW()
  WHERE store_id = NEW.id
    AND is_main_branch = true
    AND (
      OLD.address IS DISTINCT FROM NEW.address
      OR OLD.city IS DISTINCT FROM NEW.city
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_store_to_main_branch ON public.stores;
CREATE TRIGGER trigger_sync_store_to_main_branch
  AFTER UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION sync_store_info_to_main_branch();

-- ============================================
-- 9. GET MAIN BRANCH FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_main_branch(p_store_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.store_branches
  WHERE store_id = p_store_id AND is_main_branch = true
  LIMIT 1;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_main_branch(UUID) TO authenticated;

-- ============================================
-- 10. ADD UNIQUE INDEX FOR MAIN BRANCH PER STORE
-- ============================================
-- Ensure only one main branch per store

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_branches_main_branch_unique
  ON public.store_branches(store_id)
  WHERE is_main_branch = true;

-- ============================================
-- 11. CREATE INVENTORY FOR EXISTING PRODUCTS IN MAIN BRANCHES
-- ============================================
-- Make sure all existing products have inventory in main branch

INSERT INTO public.inventory (
  product_id,
  branch_id,
  store_id,
  quantity,
  low_stock_threshold
)
SELECT 
  p.id AS product_id,
  sb.id AS branch_id,
  p.store_id,
  0 AS quantity,
  COALESCE(p.low_stock_threshold, 10) AS low_stock_threshold
FROM public.products p
JOIN public.store_branches sb ON sb.store_id = p.store_id AND sb.is_main_branch = true
WHERE p.is_active = true
  AND (p.track_inventory IS NULL OR p.track_inventory = true)
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory i 
    WHERE i.product_id = p.id AND i.branch_id = sb.id
  )
ON CONFLICT (product_id, branch_id) DO NOTHING;

-- ============================================
-- DONE
-- ============================================

COMMENT ON FUNCTION create_main_branch_for_store() IS 'Automatically creates a main branch when a new store is created';
COMMENT ON FUNCTION prevent_main_branch_modification() IS 'Prevents deletion or deactivation of main branches';
COMMENT ON FUNCTION create_inventory_for_product() IS 'Creates inventory records in all branches when a product is created';
COMMENT ON FUNCTION create_inventory_for_branch() IS 'Creates inventory records for all products when a branch is created';
COMMENT ON FUNCTION sync_store_info_to_main_branch() IS 'Keeps main branch address in sync with store address';
COMMENT ON FUNCTION get_main_branch(UUID) IS 'Returns the main branch ID for a store';
COMMENT ON FUNCTION ensure_main_branch_exists(UUID) IS 'Ensures a store has a main branch, creating one if needed';

