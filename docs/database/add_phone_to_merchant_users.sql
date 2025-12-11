-- Add phone column to merchant_users table if it doesn't exist
-- This column stores the user's phone number during merchant onboarding
-- The phone number is associated with the user, not the business

DO $$
BEGIN
  -- Check if column exists, if not, add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'merchant_users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.merchant_users 
    ADD COLUMN phone TEXT;
    
    RAISE NOTICE 'Added phone column to merchant_users table';
  ELSE
    RAISE NOTICE 'phone column already exists in merchant_users table';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.merchant_users.phone IS 'User phone number with country code (e.g., +966501234567)';

