-- ================================
-- Add descriptions and foreign keys to stores table
-- ================================
-- Description: Adds comprehensive descriptions to all stores table columns
--              and ensures all required foreign keys are in place
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Add/Update column descriptions
-- =====================================================

-- id column
COMMENT ON COLUMN public.stores.id IS 'Primary key identifier for the store (UUID)';

-- business_id column
COMMENT ON COLUMN public.stores.business_id IS 'Foreign key to business_profile table. Links the store to the business that owns it.';

-- name column
COMMENT ON COLUMN public.stores.name IS 'Display name of the store';

-- slug column
COMMENT ON COLUMN public.stores.slug IS 'URL-friendly identifier for the store. Must be unique.';

-- logo_url column
COMMENT ON COLUMN public.stores.logo_url IS 'URL to the store logo image';

-- platform column
COMMENT ON COLUMN public.stores.platform IS 'E-commerce platform the store is connected to (Salla, Zid, Shopify, WooCommerce, or Haady). Defaults to ''haady'' for standalone stores.';

-- store_type column
COMMENT ON COLUMN public.stores.store_type IS 'Type of store: ''online'', ''offline'', or ''hybrid''';

-- country column
COMMENT ON COLUMN public.stores.country IS 'Country where the store is located. Should reference countries.id if it is a UUID, or store country code if TEXT.';

-- city column
COMMENT ON COLUMN public.stores.city IS 'City where the store is located';

-- address column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stores' 
    AND column_name = 'address'
  ) THEN
    COMMENT ON COLUMN public.stores.address IS 'Physical address of the store';
  END IF;
END $$;

-- description column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stores' 
    AND column_name = 'description'
  ) THEN
    COMMENT ON COLUMN public.stores.description IS 'Description of the store';
  END IF;
END $$;

-- minimum_order_amount column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stores' 
    AND column_name = 'minimum_order_amount'
  ) THEN
    COMMENT ON COLUMN public.stores.minimum_order_amount IS 'Minimum order amount required for this store';
  END IF;
END $$;

-- is_active column
COMMENT ON COLUMN public.stores.is_active IS 'Whether the store is currently active. Inactive stores are hidden from the store selector.';

-- delivery_methods column
COMMENT ON COLUMN public.stores.delivery_methods IS 'Array of delivery methods available for this store (e.g., [''pickup'', ''delivery'', ''express''])';

-- opening_hours column
COMMENT ON COLUMN public.stores.opening_hours IS 'JSON object containing store opening hours. Format: {day: {open: ''HH:MM'', close: ''HH:MM'', closed: boolean}}';

-- product_count column (if exists, usually computed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stores' 
    AND column_name = 'product_count'
  ) THEN
    COMMENT ON COLUMN public.stores.product_count IS 'Cached count of active products in this store. Updated during product sync operations.';
  END IF;
END $$;

-- created_at column
COMMENT ON COLUMN public.stores.created_at IS 'Timestamp when the store was created';

-- updated_at column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stores' 
    AND column_name = 'updated_at'
  ) THEN
    COMMENT ON COLUMN public.stores.updated_at IS 'Timestamp when the store was last updated';
  END IF;
END $$;

-- =====================================================
-- PART 2: Ensure foreign key for business_id
-- =====================================================

DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  -- Check if foreign key already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stores'::regclass
    AND conname = 'stores_business_profile_id_fkey'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE 'Foreign key stores_business_profile_id_fkey already exists';
  ELSE
    -- Check if there's a different named constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.stores'::regclass
      AND confrelid = 'public.business_profile'::regclass
      AND contype = 'f'
    ) THEN
      RAISE NOTICE 'Foreign key to business_profile exists with different name';
    ELSE
      -- Add foreign key constraint
      ALTER TABLE public.stores
      ADD CONSTRAINT stores_business_profile_id_fkey
      FOREIGN KEY (business_id) 
      REFERENCES public.business_profile(id) 
      ON DELETE CASCADE;
      
      RAISE NOTICE 'Created foreign key: stores_business_profile_id_fkey';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating business_id foreign key: %', SQLERRM;
END $$;

-- =====================================================
-- PART 3: Add foreign key for country (if it's UUID)
-- =====================================================

DO $$
DECLARE
  v_country_column_type TEXT;
  v_constraint_exists BOOLEAN;
  v_countries_table_exists BOOLEAN;
BEGIN
  -- Check if countries table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'countries'
  ) INTO v_countries_table_exists;
  
  IF NOT v_countries_table_exists THEN
    RAISE NOTICE 'countries table does not exist - skipping country foreign key';
  ELSE
    -- Check the data type of country column
    SELECT data_type INTO v_country_column_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND column_name = 'country';
    
    -- Only add FK if country is UUID type
    IF v_country_column_type = 'uuid' THEN
      -- Check if foreign key already exists
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.stores'::regclass
        AND conname = 'stores_country_fkey'
      ) INTO v_constraint_exists;
      
      IF v_constraint_exists THEN
        RAISE NOTICE 'Foreign key stores_country_fkey already exists';
      ELSE
        -- Add foreign key constraint
        ALTER TABLE public.stores
        ADD CONSTRAINT stores_country_fkey
        FOREIGN KEY (country) 
        REFERENCES public.countries(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Created foreign key: stores_country_fkey';
      END IF;
    ELSE
      RAISE NOTICE 'country column is not UUID type (type: %), skipping foreign key', v_country_column_type;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating country foreign key: %', SQLERRM;
END $$;

-- =====================================================
-- PART 4: Add table comment
-- =====================================================

COMMENT ON TABLE public.stores IS 'Stores table. Contains information about all stores (both Haady native stores and stores connected from external platforms like Salla, Shopify, etc.). Each store belongs to a business_profile and can have associated products, orders, and store_connections.';

-- =====================================================
-- PART 5: Verification
-- =====================================================

DO $$
DECLARE
  v_business_fk_exists BOOLEAN;
  v_country_fk_exists BOOLEAN;
  v_column_count INTEGER;
BEGIN
  -- Check business_id foreign key
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stores'::regclass
    AND confrelid = 'public.business_profile'::regclass
    AND contype = 'f'
  ) INTO v_business_fk_exists;
  
  -- Check country foreign key
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stores'::regclass
    AND conname = 'stores_country_fkey'
  ) INTO v_country_fk_exists;
  
  -- Count columns with comments
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns c
  LEFT JOIN pg_catalog.pg_description d
    ON d.objoid = (SELECT oid FROM pg_class WHERE relname = 'stores')
    AND d.objsubid = c.ordinal_position
  WHERE c.table_schema = 'public'
  AND c.table_name = 'stores'
  AND d.description IS NOT NULL;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Stores Table Status:';
  RAISE NOTICE '  business_id FK: %', 
    CASE WHEN v_business_fk_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  country FK: %', 
    CASE WHEN v_country_fk_exists THEN '✓ EXISTS' ELSE '✗ MISSING (or not UUID)' END;
  RAISE NOTICE '  Columns with descriptions: %', v_column_count;
  RAISE NOTICE '==============================================';
END $$;

