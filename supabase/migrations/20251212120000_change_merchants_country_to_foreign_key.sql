-- ================================
-- Change merchants.country from TEXT to Foreign Key
-- ================================
-- Description: Convert merchants.country from TEXT (ISO2 code) to UUID foreign key
--              referencing countries_master.id for proper referential integrity
-- Date: 2024-12-12

-- Step 1: Determine which countries table exists (countries_master or countries)
DO $$
DECLARE
  v_countries_table TEXT;
  v_countries_pk_column TEXT;
BEGIN
  -- Check if countries_master exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'countries_master'
  ) THEN
    v_countries_table := 'countries_master';
    v_countries_pk_column := 'id';
  -- Check if countries exists
  ELSIF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'countries'
  ) THEN
    v_countries_table := 'countries';
    v_countries_pk_column := 'id';
  ELSE
    RAISE EXCEPTION 'Neither countries_master nor countries table exists';
  END IF;
  
  -- Store the table name in a temporary table for use in subsequent steps
  CREATE TEMP TABLE IF NOT EXISTS migration_config (
    countries_table TEXT,
    countries_pk_column TEXT
  );
  
  DELETE FROM migration_config;
  INSERT INTO migration_config VALUES (v_countries_table, v_countries_pk_column);
  
  RAISE NOTICE 'Using countries table: %', v_countries_table;
END $$;

-- Step 2: Add new country_id column as UUID with dynamic reference
DO $$
DECLARE
  v_countries_table TEXT;
BEGIN
  SELECT countries_table INTO v_countries_table FROM migration_config;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchants' 
    AND column_name = 'country_id'
  ) THEN
    EXECUTE format('ALTER TABLE public.merchants ADD COLUMN country_id UUID REFERENCES public.%I(id) ON DELETE SET NULL', v_countries_table);
    
    RAISE NOTICE 'Added country_id column to merchants table';
  ELSE
    RAISE NOTICE 'country_id column already exists in merchants table';
  END IF;
END $$;

-- Step 3: Migrate existing data from TEXT country codes to country_id
-- Match existing country TEXT values (ISO2 codes) to countries table
DO $$
DECLARE
  v_countries_table TEXT;
BEGIN
  SELECT countries_table INTO v_countries_table FROM migration_config;
  
  EXECUTE format('
    UPDATE public.merchants m
    SET country_id = cm.id
    FROM public.%I cm
    WHERE m.country = cm.iso2
      AND m.country_id IS NULL
      AND m.country IS NOT NULL
  ', v_countries_table);
  
  RAISE NOTICE 'Migrated existing country data to country_id';
END $$;

-- Step 4: Drop the old TEXT country column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchants' 
    AND column_name = 'country'
  ) THEN
    ALTER TABLE public.merchants 
    DROP COLUMN country;
    
    RAISE NOTICE 'Dropped old country TEXT column from merchants table';
  ELSE
    RAISE NOTICE 'country TEXT column does not exist in merchants table';
  END IF;
END $$;

-- Step 5: Rename country_id to country for cleaner API
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchants' 
    AND column_name = 'country_id'
  ) THEN
    ALTER TABLE public.merchants 
    RENAME COLUMN country_id TO country;
    
    RAISE NOTICE 'Renamed country_id to country in merchants table';
  ELSE
    RAISE NOTICE 'country_id column does not exist, skipping rename';
  END IF;
END $$;

-- Step 6: Add comment to the new country column
DO $$
DECLARE
  v_countries_table TEXT;
BEGIN
  SELECT countries_table INTO v_countries_table FROM migration_config;
  EXECUTE format('COMMENT ON COLUMN public.merchants.country IS ''Foreign key reference to public.%I.id - Business country selected during business setup''', v_countries_table);
END $$;

-- Step 7: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_merchants_country ON public.merchants(country);

-- Clean up temporary table
DROP TABLE IF EXISTS migration_config;

