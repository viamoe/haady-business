# create_merchant_onboarding RPC Function

This document describes the required database function for atomic merchant and store creation during onboarding.

## Function Signature

```sql
CREATE OR REPLACE FUNCTION create_merchant_onboarding(
  business_name TEXT,
  store_name TEXT,
  store_slug TEXT,
  store_city TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
```

## Parameters

- `business_name` (TEXT): The name of the business/merchant
- `store_name` (TEXT): The name of the first store
- `store_slug` (TEXT): URL-friendly slug for the store (lowercase, numbers, hyphens only)
- `store_city` (TEXT): City where the store is located

## Return Value

Returns a JSON object with the following structure:

**Success:**
```json
{
  "success": true,
  "merchant_id": "uuid",
  "store_id": "uuid"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Function Logic

1. **Authentication Check**: Verify that the current user is authenticated using `auth.uid()`
2. **Duplicate Merchant Check**: Ensure the user doesn't already have a merchant account
3. **Slug Validation**: Check if the store slug is already taken
4. **Atomic Creation**: In a single transaction:
   - Create a new merchant record in the `merchants` table
   - Create a `merchant_users` record linking the user to the merchant
   - Create a new store record in the `stores` table

## Implementation Example

```sql
CREATE OR REPLACE FUNCTION create_merchant_onboarding(
  business_name TEXT,
  store_name TEXT,
  store_slug TEXT,
  store_city TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_merchant_id UUID;
  v_store_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if user already has a merchant
  SELECT merchant_id INTO v_merchant_id
  FROM merchant_users
  WHERE auth_user_id = v_user_id
  LIMIT 1;
  
  IF v_merchant_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a merchant account');
  END IF;
  
  -- Check if slug is already taken
  IF EXISTS (SELECT 1 FROM stores WHERE slug = store_slug) THEN
    RETURN json_build_object('success', false, 'error', 'Slug already taken');
  END IF;
  
  -- Create merchant (atomic transaction)
  INSERT INTO merchants (name, legal_name, status, kyc_status)
  VALUES (business_name, business_name, 'pending', 'pending')
  RETURNING id INTO v_merchant_id;
  
  -- Create merchant_user link
  INSERT INTO merchant_users (merchant_id, auth_user_id, role)
  VALUES (v_merchant_id, v_user_id, 'manager');
  
  -- Create store
  INSERT INTO stores (merchant_id, name, slug, city, status)
  VALUES (v_merchant_id, store_name, store_slug, store_city, 'active')
  RETURNING id INTO v_store_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'merchant_id', v_merchant_id,
    'store_id', v_store_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

## Security Considerations

- Function uses `SECURITY DEFINER` to run with elevated privileges
- All operations are atomic (within a single transaction)
- User authentication is verified before any operations
- Duplicate checks prevent data inconsistencies

## Error Handling

The function handles the following error cases:

1. **User not authenticated**: Returns error message
2. **User already has merchant**: Returns error message
3. **Slug already taken**: Returns error message
4. **Database errors**: Catches exceptions and returns error message

## Usage

This function is called from the onboarding form after user authentication:

```typescript
const { data, error } = await supabase.rpc('create_merchant_onboarding', {
  business_name: values.businessName,
  store_name: values.storeName,
  store_slug: values.storeSlug,
  store_city: values.city
});
```

## Related Tables

- `merchants`: Stores merchant/business information
- `merchant_users`: Links authenticated users to merchants
- `stores`: Stores individual store information

