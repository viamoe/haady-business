-- ================================
-- Auto-Create Public Users Trigger Migration
-- ================================
-- Description: Automatically creates a public.users row when a new user signs up
--              via OAuth (Google) or OTP, ensuring the record exists for merchant users.
-- Date: 2024-12-12

-- ================================
-- Step 1: Create Trigger Function
-- ================================

-- Drop existing function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the function that runs on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists (idempotency)
  -- This prevents duplicate inserts if trigger fires multiple times
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Insert new user record with data from auth.users
    -- Extract full_name and avatar_url from user metadata (Google OAuth provides these)
    -- All other fields use database defaults:
    -- preferred_language default 'en', points default 0, level default 1,
    -- xp default 0, streak_days default 0, gift_privacy default 'public',
    -- is_active default true, is_blocked default false,
    -- onboarding_step default 1, is_onboarded default false,
    -- profile_completion default 0, created_at default now(),
    -- updated_at default now(), username is NULL
    -- Insert new user record with data from auth.users
    -- Only include safe fields - let database defaults handle the rest
    -- Note: country field is skipped as it may be an enum type with constraints
    INSERT INTO public.users (
      id, 
      full_name, 
      avatar_url,
      preferred_language
    )
    VALUES (
      NEW.id, 
      COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name', 
        NULL
      ), 
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url', 
        NEW.raw_user_meta_data->>'picture', 
        NULL
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'preferred_language',
        'en'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Step 2: Create Trigger
-- ================================

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that fires after a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ================================
-- Step 3: Add Comment for Documentation
-- ================================

COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a public.users row when a new user signs up via OAuth (Google) or OTP. Extracts full_name, avatar_url, and preferred_language from user metadata. Country field is skipped to avoid enum constraint issues. This ensures the public.users record exists for all merchant users.';

-- Note: Cannot add comment to trigger in auth schema (permission restricted)
-- Trigger: on_auth_user_created fires after INSERT on auth.users

