-- ================================
-- Fix handle_new_user Trigger Function
-- ================================
-- Description: Remove country field from INSERT to avoid enum constraint issues
-- Date: 2024-12-12

-- Update the function to remove country field
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists (idempotency)
  -- This prevents duplicate inserts if trigger fires multiple times
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
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

-- Update comment
COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a public.users row when a new user signs up via OAuth (Google) or OTP. Extracts full_name, avatar_url, and preferred_language from user metadata. Country field is skipped to avoid enum constraint issues. This ensures the public.users record exists for all merchant users.';

