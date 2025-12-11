-- Add user language and country preferences to merchant_users table
-- This allows users to save their preferred country and language

-- Add columns for user preferences
ALTER TABLE public.merchant_users
ADD COLUMN IF NOT EXISTS preferred_country TEXT,
ADD COLUMN IF NOT EXISTS preferred_language TEXT;

-- Add comments
COMMENT ON COLUMN public.merchant_users.preferred_country IS 'User preferred country code (ISO2 format, e.g., SA, AE, GB)';
COMMENT ON COLUMN public.merchant_users.preferred_language IS 'User preferred language code (e.g., en, ar)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchant_users_preferred_country 
ON public.merchant_users(preferred_country);

CREATE INDEX IF NOT EXISTS idx_merchant_users_preferred_language 
ON public.merchant_users(preferred_language);

