-- ================================
-- Drop handle_new_user Trigger
-- ================================
-- Description: Remove the problematic trigger that's causing "Database error saving new user"
--              The callback route will handle user creation with admin client instead
-- Date: 2024-12-12

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

