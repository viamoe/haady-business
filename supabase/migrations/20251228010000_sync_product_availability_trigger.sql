-- ====================================================================
-- Migration: Sync Product Availability with Inventory
-- Description: Creates triggers to automatically update products.is_available
--              based on inventory levels
-- Date: 2025-12-28
-- ====================================================================

-- Function to sync product availability based on inventory
CREATE OR REPLACE FUNCTION sync_product_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_total_available INTEGER;
  v_allow_backorder BOOLEAN;
BEGIN
  -- Get total available quantity across all branches
  SELECT COALESCE(SUM(available_quantity), 0)
  INTO v_total_available
  FROM inventory
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);

  -- Check if product allows backorders
  SELECT COALESCE(allow_backorder, false)
  INTO v_allow_backorder
  FROM products
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  -- Update product availability
  -- Product is available if: has stock OR allows backorders
  UPDATE products
  SET is_available = (v_total_available > 0 OR v_allow_backorder),
      updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on inventory INSERT
CREATE TRIGGER sync_availability_on_inventory_insert
  AFTER INSERT ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_availability();

-- Trigger on inventory UPDATE
CREATE TRIGGER sync_availability_on_inventory_update
  AFTER UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_availability();

-- Trigger on inventory DELETE
CREATE TRIGGER sync_availability_on_inventory_delete
  AFTER DELETE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_availability();

-- Also sync when allow_backorder changes on products
CREATE OR REPLACE FUNCTION sync_availability_on_product_change()
RETURNS TRIGGER AS $$
DECLARE
  v_total_available INTEGER;
BEGIN
  -- Only run if allow_backorder changed
  IF OLD.allow_backorder IS DISTINCT FROM NEW.allow_backorder THEN
    SELECT COALESCE(SUM(available_quantity), 0)
    INTO v_total_available
    FROM inventory
    WHERE product_id = NEW.id;

    -- Update availability based on new backorder setting
    NEW.is_available := (v_total_available > 0 OR NEW.allow_backorder);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on products UPDATE (for allow_backorder changes)
CREATE TRIGGER sync_availability_on_backorder_change
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_availability_on_product_change();

-- ============================================
-- Initial sync: Update all existing products
-- ============================================
-- This will set is_available based on current inventory levels

DO $$
DECLARE
  r RECORD;
  v_total_available INTEGER;
BEGIN
  FOR r IN SELECT id, allow_backorder FROM products WHERE is_active = true
  LOOP
    SELECT COALESCE(SUM(available_quantity), 0)
    INTO v_total_available
    FROM inventory
    WHERE product_id = r.id;

    UPDATE products
    SET is_available = (v_total_available > 0 OR COALESCE(r.allow_backorder, false))
    WHERE id = r.id;
  END LOOP;
END $$;

-- Add comment
COMMENT ON FUNCTION sync_product_availability() IS 'Automatically syncs products.is_available with inventory levels';

