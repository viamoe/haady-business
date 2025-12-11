-- Create merchant_user record automatically during signup
-- This trigger creates a minimal merchant_user record when a user signs up with app_type: 'merchant'

-- ================================
-- Step 1: Create Trigger Function
-- ================================

-- Drop existing function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.handle_new_merchant_user() CASCADE;

-- Create the function that runs on signup
CREATE OR REPLACE FUNCTION public.handle_new_merchant_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_app_type TEXT;
  v_preferred_country TEXT;
  v_preferred_language TEXT;
BEGIN
  -- Check if this is a merchant signup (app_type: 'merchant' in metadata)
  v_app_type := NEW.raw_user_meta_data->>'app_type';
  
  -- Only create merchant_user if app_type is 'merchant'
  IF v_app_type = 'merchant' THEN
    -- Check if merchant_user already exists (idempotency)
    IF NOT EXISTS (SELECT 1 FROM public.merchant_users WHERE auth_user_id = NEW.id) THEN
      -- Extract preferred_country and preferred_language from metadata
      -- These can be set during signup from URL/cookies
      v_preferred_country := COALESCE(
        NEW.raw_user_meta_data->>'preferred_country',
        'AE'  -- Default to UAE
      );
      
      v_preferred_language := COALESCE(
        NEW.raw_user_meta_data->>'preferred_language',
        'en'  -- Default to English
      );
      
      -- Create minimal merchant_user record
      INSERT INTO public.merchant_users (
        auth_user_id,
        merchant_id,  -- NULL initially, will be set during setup
        role,         -- Default to 'manager'
        preferred_country,
        preferred_language,
        is_primary_contact  -- First user is primary contact
      )
      VALUES (
        NEW.id,
        NULL,  -- merchant_id will be set during onboarding
        'manager',  -- Default role
        v_preferred_country,
        v_preferred_language,
        true  -- First user is primary contact
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Step 2: Create Trigger
-- ================================

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created_merchant ON auth.users;

-- Create the trigger that fires after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created_merchant
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_merchant_user();

-- ================================
-- Step 3: Add Comment for Documentation
-- ================================

COMMENT ON FUNCTION public.handle_new_merchant_user() IS 
'Automatically creates a minimal merchant_user record when a new user signs up with app_type: "merchant" in user metadata. The merchant_id is set to NULL initially and will be populated during the setup/onboarding process.';

