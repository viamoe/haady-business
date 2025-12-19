-- ================================
-- Complete the merchant_users to business_users rename
-- ================================
-- Description: Complete remaining steps after partial migration
-- Date: 2025-12-15

-- Re-create RLS policies with correct names (if table exists)
DO $$
BEGIN
  -- Only proceed if business_users table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'business_users'
  ) THEN
    -- Enable RLS
    ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
    
    -- Drop any existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Users can view own business_user" ON public.business_users;
    DROP POLICY IF EXISTS "Users can update own business_user" ON public.business_users;
    DROP POLICY IF EXISTS "Users can insert own business_user" ON public.business_users;
    DROP POLICY IF EXISTS "business_users_view_self" ON public.business_users;
    DROP POLICY IF EXISTS "business_users_update_self" ON public.business_users;
    DROP POLICY IF EXISTS "business_users_insert_self" ON public.business_users;
    
    -- Create new policies
    CREATE POLICY "Users can view own business_user"
    ON public.business_users
    FOR SELECT
    USING (auth.uid() = auth_user_id);
    
    CREATE POLICY "Users can update own business_user"
    ON public.business_users
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);
    
    CREATE POLICY "Users can insert own business_user"
    ON public.business_users
    FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);
    
    RAISE NOTICE 'Successfully created RLS policies for business_users';
  ELSE
    RAISE NOTICE 'business_users table does not exist, skipping policy creation';
  END IF;
END $$;

-- Add table comment
COMMENT ON TABLE public.business_users IS 'Links auth users to merchants. Each business user can manage multiple stores within their merchant account.';

