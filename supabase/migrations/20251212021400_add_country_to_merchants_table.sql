-- ================================
-- Add country column to merchants table
-- ================================
-- Description: Add country column to store the business country selected in the setup form
-- Date: 2024-12-12

-- Add country column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchants' 
    AND column_name = 'country'
  ) THEN
    ALTER TABLE public.merchants 
    ADD COLUMN country TEXT;
    
    COMMENT ON COLUMN public.merchants.country IS 'Business country code (ISO2 format, e.g., AE, SA) selected during business setup';
    
    RAISE NOTICE 'Added country column to merchants table';
  ELSE
    RAISE NOTICE 'country column already exists in merchants table';
  END IF;
END $$;

