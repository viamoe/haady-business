-- ================================
-- Check and Fix Store Name Fields
-- ================================
-- Run this to check if columns exist and add them if needed

-- 1. Check if columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'store_connections'
  AND column_name IN ('store_name', 'store_domain')
ORDER BY column_name;

-- 2. Add store_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'store_name'
  ) THEN
    ALTER TABLE public.store_connections ADD COLUMN store_name text;
    RAISE NOTICE 'Added store_name column';
  ELSE
    RAISE NOTICE 'store_name column already exists';
  END IF;
END $$;

-- 3. Add store_domain column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'store_connections' 
    AND column_name = 'store_domain'
  ) THEN
    ALTER TABLE public.store_connections ADD COLUMN store_domain text;
    RAISE NOTICE 'Added store_domain column';
  ELSE
    RAISE NOTICE 'store_domain column already exists';
  END IF;
END $$;

-- 4. Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'store_connections'
  AND column_name IN ('store_name', 'store_domain')
ORDER BY column_name;

