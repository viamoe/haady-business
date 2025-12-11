# Database CASCADE Relationships & Disconnect Behavior

## Current CASCADE Relationships

### ✅ CASCADE-Friendly Relationships

1. **`product_sources` → `products`**
   ```sql
   product_id uuid REFERENCES products(id) ON DELETE CASCADE
   ```
   - ✅ If a product is deleted → `product_sources` are automatically deleted

2. **`products` → `stores`**
   ```sql
   store_id uuid REFERENCES stores(id) ON DELETE CASCADE
   ```
   - ✅ If a store is deleted → all products are automatically deleted

3. **`stores` → `merchants`**
   ```sql
   merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE
   ```
   - ✅ If a merchant is deleted → all stores are automatically deleted

4. **`store_connections` → `auth.users`**
   ```sql
   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
   ```
   - ✅ If a user is deleted → all their `store_connections` are automatically deleted

### ⚠️ **IMPORTANT: No Direct Relationship**

**`store_connections` does NOT reference `stores` or `products`**

This means:
- ❌ **Disconnecting a store connection does NOT delete the store**
- ❌ **Disconnecting a store connection does NOT delete the products**
- ❌ **Disconnecting a store connection does NOT delete the product_sources**

## Current Disconnect Behavior

When you disconnect a store connection:

1. ✅ `store_connections` record is deleted
2. ❌ `stores` record **remains** in database
3. ❌ `products` records **remain** in database
4. ❌ `product_sources` records **remain** in database

## Why This Design?

This is **intentional** to preserve data:
- Products may be used in orders
- Store data may be needed for historical records
- Users might reconnect the same store later

## Potential Issues

### Orphaned Data
If you disconnect a store connection, you may have:
- Products without an active connection (can't sync)
- Stores that aren't connected to any platform
- Product sources pointing to disconnected platforms

## Solutions

### Option 1: Keep Current Behavior (Recommended)
- Preserve all data for historical purposes
- Allow reconnection without data loss
- Manually clean up if needed

### Option 2: Add Cleanup on Disconnect
Add logic to optionally delete products/store when disconnecting:

```sql
-- This would require updating the disconnect API route
-- to optionally delete related products and stores
```

### Option 3: Soft Delete
Mark products/stores as inactive instead of deleting:

```sql
-- Add is_active flag checks
-- Set is_active = false when disconnecting
```

## Recommended Approach

**Keep the current behavior** but add:

1. **Status tracking** - Mark products as "disconnected" or "orphaned"
2. **Cleanup script** - Provide a manual cleanup option for orphaned data
3. **Reconnection logic** - When reconnecting, reactivate existing products

## Cleanup Script (Optional)

If you want to clean up orphaned products after disconnecting:

```sql
-- Find products from disconnected stores
SELECT p.*
FROM products p
JOIN stores s ON p.store_id = s.id
LEFT JOIN store_connections sc ON s.id = sc.store_id
WHERE sc.id IS NULL;

-- Delete orphaned products (CAREFUL - this is destructive!)
-- DELETE FROM products
-- WHERE id IN (
--   SELECT p.id
--   FROM products p
--   JOIN stores s ON p.store_id = s.id
--   LEFT JOIN store_connections sc ON s.id = sc.store_id
--   WHERE sc.id IS NULL
-- );
```

## Summary

| Action | store_connections | stores | products | product_sources |
|--------|------------------|--------|----------|----------------|
| Disconnect connection | ✅ Deleted | ❌ Remains | ❌ Remains | ❌ Remains |
| Delete store | N/A | ✅ Deleted | ✅ CASCADE deleted | ✅ CASCADE deleted |
| Delete product | N/A | N/A | ✅ Deleted | ✅ CASCADE deleted |
| Delete user | ✅ CASCADE deleted | ❌ Remains | ❌ Remains | ❌ Remains |

**Answer to your question:**
- ✅ Product-related tables ARE CASCADE-friendly
- ❌ But disconnecting a store connection does NOT delete products or stores
- ✅ Products and stores remain in the database after disconnection

