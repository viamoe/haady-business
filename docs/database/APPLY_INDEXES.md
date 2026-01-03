# How to Apply Performance Indexes

## Quick Start

### Option 1: Using Supabase CLI (Recommended)

```bash
cd haady-business
supabase db push
```

This will apply all pending migrations including the new indexes.

### Option 2: Manual Application via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250205000000_add_performance_indexes.sql`
4. Paste and run the SQL

### Option 3: Using Supabase CLI (Direct SQL)

```bash
supabase db execute --file supabase/migrations/20250205000000_add_performance_indexes.sql
```

## Verification

After applying, verify the indexes were created:

```sql
-- Check all indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('products', 'orders', 'stores', 'business_profile', 'inventory')
ORDER BY tablename, indexname;
```

## Expected Results

You should see approximately **30+ new indexes** created across these tables:
- `products` - ~10 indexes
- `orders` - ~6 indexes
- `stores` - ~4 indexes
- `business_profile` - ~2 indexes
- `inventory` - ~4 indexes
- `product_images` - ~4 indexes
- `product_categories` - ~3 indexes
- `categories` - ~4 indexes
- `brands` - ~2 indexes
- `store_connections` - ~2 indexes

## Performance Testing

### Before Indexes
```sql
EXPLAIN ANALYZE
SELECT COUNT(*) FROM products 
WHERE store_id IN ('...') 
  AND is_active = true 
  AND deleted_at IS NULL;
```

### After Indexes
Run the same query and compare:
- **Execution time** should be significantly faster
- **Index scan** should appear in the plan (not sequential scan)

## Troubleshooting

### Error: Extension pg_trgm does not exist

If you get this error, enable the extension first:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Error: Index already exists

If an index already exists, the migration uses `IF NOT EXISTS` so it will skip it safely.

### Check Index Usage

Monitor which indexes are being used:
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Rollback (if needed)

To remove all indexes created by this migration:

```sql
-- Products indexes
DROP INDEX IF EXISTS idx_products_store_id;
DROP INDEX IF EXISTS idx_products_is_active;
DROP INDEX IF EXISTS idx_products_deleted_at;
DROP INDEX IF EXISTS idx_products_created_at;
DROP INDEX IF EXISTS idx_products_brand_id;
DROP INDEX IF EXISTS idx_products_store_active_not_deleted;
DROP INDEX IF EXISTS idx_products_store_created_at;
DROP INDEX IF EXISTS idx_products_name_en_trgm;
DROP INDEX IF EXISTS idx_products_name_ar_trgm;
DROP INDEX IF EXISTS idx_products_sku;
DROP INDEX IF EXISTS idx_products_status;

-- Orders indexes
DROP INDEX IF EXISTS idx_orders_store_id;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_orders_payment_status;
DROP INDEX IF EXISTS idx_orders_store_created_at;
DROP INDEX IF EXISTS idx_orders_store_created_payment;
DROP INDEX IF EXISTS idx_orders_status;

-- Stores indexes
DROP INDEX IF EXISTS idx_stores_business_id;
DROP INDEX IF EXISTS idx_stores_is_active;
DROP INDEX IF EXISTS idx_stores_business_active;
DROP INDEX IF EXISTS idx_stores_platform;

-- Business profile indexes
DROP INDEX IF EXISTS idx_business_profile_auth_user_id;
DROP INDEX IF EXISTS idx_business_profile_store_id;

-- Store connections indexes
DROP INDEX IF EXISTS idx_store_connections_store_id;
DROP INDEX IF EXISTS idx_store_connections_status;

-- Inventory indexes
DROP INDEX IF EXISTS idx_inventory_product_id;
DROP INDEX IF EXISTS idx_inventory_store_branch_id;
DROP INDEX IF EXISTS idx_inventory_product_branch;
DROP INDEX IF EXISTS idx_inventory_quantity;

-- Product images indexes
DROP INDEX IF EXISTS idx_product_images_product_id;
DROP INDEX IF EXISTS idx_product_images_is_primary;
DROP INDEX IF EXISTS idx_product_images_product_primary;
DROP INDEX IF EXISTS idx_product_images_display_order;

-- Product categories indexes
DROP INDEX IF EXISTS idx_product_categories_product_id;
DROP INDEX IF EXISTS idx_product_categories_category_id;
DROP INDEX IF EXISTS idx_product_categories_product_category;

-- Categories indexes
DROP INDEX IF EXISTS idx_categories_parent_id;
DROP INDEX IF EXISTS idx_categories_type;
DROP INDEX IF EXISTS idx_categories_is_active;
DROP INDEX IF EXISTS idx_categories_type_parent;

-- Brands indexes
DROP INDEX IF EXISTS idx_brands_name;
DROP INDEX IF EXISTS idx_brands_is_active;
```

## Next Steps

After applying indexes:

1. **Monitor Performance** - Check query execution times
2. **Update Statistics** - Run `ANALYZE` regularly
3. **Review Index Usage** - Remove unused indexes if any
4. **Test Application** - Verify dashboard and product pages load faster

## Support

If you encounter any issues:
1. Check Supabase logs for errors
2. Verify extension `pg_trgm` is enabled
3. Ensure you have proper permissions
4. Review the migration file for syntax errors

