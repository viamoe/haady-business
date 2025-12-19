-- ================================
-- Complete cleanup: Remaining merchant references
-- ================================
-- Description: Clean up any remaining merchant references found in the database
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Rename merchant_agreements table to business_agreements
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchant_agreements') THEN
    ALTER TABLE public.merchant_agreements RENAME TO business_agreements;
    RAISE NOTICE 'Renamed table merchant_agreements to business_agreements';
  ELSE
    RAISE NOTICE 'Table merchant_agreements already renamed or does not exist';
  END IF;
END $$;

-- Rename merchant_id column in business_agreements to business_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'business_agreements' AND column_name = 'merchant_id') THEN
    ALTER TABLE public.business_agreements RENAME COLUMN merchant_id TO business_id;
    RAISE NOTICE 'Renamed column business_agreements.merchant_id to business_id';
  ELSE
    RAISE NOTICE 'Column business_agreements.merchant_id already renamed or does not exist';
  END IF;
END $$;

-- =====================================================
-- PART 2: Find and drop all remaining merchant functions
-- =====================================================

-- List and drop any remaining functions with 'merchant' in their name
DO $$
DECLARE
  v_func_name TEXT;
  v_func_args TEXT;
BEGIN
  FOR v_func_name, v_func_args IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname LIKE '%merchant%'
  LOOP
    BEGIN
      IF v_func_args IS NOT NULL AND v_func_args != '' THEN
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', v_func_name, v_func_args);
      ELSE
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I CASCADE', v_func_name);
      END IF;
      RAISE NOTICE 'Dropped function: %(%)', v_func_name, v_func_args;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop function %(%) : %', v_func_name, v_func_args, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- PART 3: Find and rename any remaining columns
-- =====================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_column_name TEXT;
  v_new_column TEXT;
BEGIN
  FOR v_table_name, v_column_name IN
    SELECT table_name, column_name
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%merchant%'
  LOOP
    v_new_column := REPLACE(v_column_name, 'merchant', 'business');
    BEGIN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', v_table_name, v_column_name, v_new_column);
      RAISE NOTICE 'Renamed column %.% to %', v_table_name, v_column_name, v_new_column;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename column %.% : %', v_table_name, v_column_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- PART 4: Find and rename any remaining tables
-- =====================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_new_table TEXT;
BEGIN
  FOR v_table_name IN
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%merchant%'
  LOOP
    v_new_table := REPLACE(v_table_name, 'merchant', 'business');
    BEGIN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', v_table_name, v_new_table);
      RAISE NOTICE 'Renamed table % to %', v_table_name, v_new_table;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename table % : %', v_table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- PART 5: Find and rename any remaining constraints
-- =====================================================

DO $$
DECLARE
  v_constraint_name TEXT;
  v_table_name TEXT;
  v_new_name TEXT;
BEGIN
  FOR v_constraint_name, v_table_name IN
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public' 
    AND tc.constraint_name LIKE '%merchant%'
  LOOP
    v_new_name := REPLACE(v_constraint_name, 'merchant', 'business');
    BEGIN
      EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', v_table_name, v_constraint_name, v_new_name);
      RAISE NOTICE 'Renamed constraint % to %', v_constraint_name, v_new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename constraint %: %', v_constraint_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- PART 6: Find and rename any remaining indexes
-- =====================================================

DO $$
DECLARE
  v_index_name TEXT;
  v_new_name TEXT;
BEGIN
  FOR v_index_name IN
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE '%merchant%'
  LOOP
    v_new_name := REPLACE(v_index_name, 'merchant', 'business');
    BEGIN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', v_index_name, v_new_name);
      RAISE NOTICE 'Renamed index % to %', v_index_name, v_new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not rename index %: %', v_index_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- PART 7: Final verification
-- =====================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check for any remaining 'merchant' references in table names
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Still found % tables with "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No tables with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in column names
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND column_name LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Still found % columns with "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No columns with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in function names
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Still found % functions with "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No functions with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in constraint names
  SELECT COUNT(*) INTO v_count
  FROM information_schema.table_constraints 
  WHERE constraint_schema = 'public' 
  AND constraint_name LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Still found % constraints with "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No constraints with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in index names
  SELECT COUNT(*) INTO v_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND indexname LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Still found % indexes with "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No indexes with "merchant" in name';
  END IF;
  
  -- Check for any remaining 'merchant' references in enum names
  SELECT COUNT(*) INTO v_count
  FROM pg_type 
  WHERE typtype = 'e' 
  AND typname LIKE '%merchant%';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Still found % enums with "merchant" in their name', v_count;
  ELSE
    RAISE NOTICE '✓ No enums with "merchant" in name';
  END IF;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Complete merchant to business cleanup done!';
  RAISE NOTICE '==============================================';
END $$;

