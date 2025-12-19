-- ================================
-- Add foreign key constraints to business_profile
-- ================================
-- Description: Adds foreign key constraints for business_type_id and business_country
--              to ensure referential integrity
-- Date: 2025-12-15

-- =====================================================
-- PART 1: Add foreign key for business_type_id
-- =====================================================

DO $$
DECLARE
  v_constraint_exists BOOLEAN;
  v_business_types_table_exists BOOLEAN;
BEGIN
  -- Check if business_types table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'business_types'
  ) INTO v_business_types_table_exists;
  
  IF NOT v_business_types_table_exists THEN
    RAISE NOTICE 'business_types table does not exist - skipping foreign key creation';
  ELSE
    -- Check if foreign key already exists
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.business_profile'::regclass
      AND conname = 'business_profile_business_type_id_fkey'
    ) INTO v_constraint_exists;
    
    IF v_constraint_exists THEN
      RAISE NOTICE 'Foreign key business_profile_business_type_id_fkey already exists';
    ELSE
      -- Drop existing constraint if it has a different name
      ALTER TABLE public.business_profile 
      DROP CONSTRAINT IF EXISTS business_profile_business_type_id_fkey;
      
      -- Add foreign key constraint
      ALTER TABLE public.business_profile
      ADD CONSTRAINT business_profile_business_type_id_fkey
      FOREIGN KEY (business_type_id) 
      REFERENCES public.business_types(id) 
      ON DELETE SET NULL;
      
      RAISE NOTICE 'Created foreign key: business_profile_business_type_id_fkey';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating business_type_id foreign key: %', SQLERRM;
END $$;

-- =====================================================
-- PART 2: Add foreign key for business_country
-- =====================================================

DO $$
DECLARE
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
    RAISE NOTICE 'countries table does not exist - skipping foreign key creation';
  ELSE
    -- Check if foreign key already exists
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.business_profile'::regclass
      AND conname = 'business_profile_business_country_fkey'
    ) INTO v_constraint_exists;
    
    IF v_constraint_exists THEN
      RAISE NOTICE 'Foreign key business_profile_business_country_fkey already exists';
    ELSE
      -- Drop existing constraint if it has a different name
      ALTER TABLE public.business_profile 
      DROP CONSTRAINT IF EXISTS business_profile_business_country_fkey;
      
      -- Add foreign key constraint
      ALTER TABLE public.business_profile
      ADD CONSTRAINT business_profile_business_country_fkey
      FOREIGN KEY (business_country) 
      REFERENCES public.countries(id) 
      ON DELETE SET NULL;
      
      RAISE NOTICE 'Created foreign key: business_profile_business_country_fkey';
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating business_country foreign key: %', SQLERRM;
END $$;

-- =====================================================
-- PART 3: Add comments
-- =====================================================

COMMENT ON CONSTRAINT business_profile_business_type_id_fkey ON public.business_profile IS 
'Foreign key to business_types table. References the type of business.';

COMMENT ON CONSTRAINT business_profile_business_country_fkey ON public.business_profile IS 
'Foreign key to countries table. References the country where the business is located.';

-- =====================================================
-- PART 4: Verification
-- =====================================================

DO $$
DECLARE
  v_type_fk_exists BOOLEAN;
  v_country_fk_exists BOOLEAN;
BEGIN
  -- Check business_type_id foreign key
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.business_profile'::regclass
    AND conname = 'business_profile_business_type_id_fkey'
  ) INTO v_type_fk_exists;
  
  -- Check business_country foreign key
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.business_profile'::regclass
    AND conname = 'business_profile_business_country_fkey'
  ) INTO v_country_fk_exists;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Foreign Key Status:';
  RAISE NOTICE '  business_type_id: %', 
    CASE WHEN v_type_fk_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  business_country: %', 
    CASE WHEN v_country_fk_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '==============================================';
END $$;

