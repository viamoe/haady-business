-- ================================
-- Add currency_icon column to countries table
-- ================================
-- Description: Add currency_icon column to store currency icon/emoji for each country
-- Date: 2025-12-15

-- Add currency_icon column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'countries' 
    AND column_name = 'currency_icon'
  ) THEN
    ALTER TABLE public.countries 
    ADD COLUMN currency_icon TEXT;
    
    COMMENT ON COLUMN public.countries.currency_icon IS 'Currency icon/emoji symbol (e.g., 💵, 💷, 💶, 💴, ر.س)';
    
    RAISE NOTICE 'Added currency_icon column to countries table';
  ELSE
    RAISE NOTICE 'currency_icon column already exists in countries table';
  END IF;
END $$;

