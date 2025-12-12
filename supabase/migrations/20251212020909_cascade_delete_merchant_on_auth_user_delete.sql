-- Cascade delete merchant when auth user is deleted
-- This ensures that when an auth user is deleted, their associated merchant is also deleted

-- Option 1: Change merchants.owner_id to CASCADE delete
-- This will delete the merchant when the owner merchant_user is deleted
DO $$
BEGIN
  -- Drop existing constraint
  ALTER TABLE public.merchants 
  DROP CONSTRAINT IF EXISTS merchants_owner_id_fkey;
  
  -- Recreate with CASCADE delete
  ALTER TABLE public.merchants 
  ADD CONSTRAINT merchants_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.merchant_users(id) ON DELETE CASCADE;
  
  RAISE NOTICE 'Updated merchants.owner_id constraint to CASCADE delete';
END $$;

-- Option 2: Add a trigger to delete merchant when owner merchant_user is deleted
-- This provides more control and can check if the merchant_user is the owner
CREATE OR REPLACE FUNCTION public.delete_merchant_on_owner_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the merchant if the deleted merchant_user was the owner
  DELETE FROM public.merchants
  WHERE owner_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_delete_merchant_on_owner_delete ON public.merchant_users;

-- Create trigger
CREATE TRIGGER trigger_delete_merchant_on_owner_delete
AFTER DELETE ON public.merchant_users
FOR EACH ROW
EXECUTE FUNCTION public.delete_merchant_on_owner_delete();

-- Add comment
COMMENT ON FUNCTION public.delete_merchant_on_owner_delete IS 'Deletes the merchant when the owner merchant_user is deleted';

