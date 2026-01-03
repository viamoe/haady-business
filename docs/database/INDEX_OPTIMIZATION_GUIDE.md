# Database Index Optimization Guide

## Overview

This guide documents all database indexes created for maximum query performance.

## Migration File

**File:** `supabase/migrations/20250205000000_add_performance_indexes.sql`

## Indexes by Table

### Products Table

#### Single Column Indexes
- `idx_products_store_id` - Filter by store
- `idx_products_is_active` - Filter active products
- `idx_products_deleted_at` - Filter non-deleted products
- `idx_products_created_at` - Sort by creation date
- `idx_products_brand_id` - Join with brands
- `idx_products_status` - Filter by status
- `idx_products_sku` - Search by SKU

#### Text Search Indexes
- `idx_products_name_en_trgm` - Full-text search (English names)
- `idx_products_name_ar_trgm` - Full-text search (Arabic names)

#### Composite Indexes
- `idx_products_store_active_not_deleted` - **Most common query pattern**
  - Used for: `.in('store_id', storeIds).eq('is_active', true).is('deleted_at', null)`
- `idx_products_store_created_at` - Store products sorted by date

### Orders Table

#### Single Column Indexes
- `idx_orders_store_id` - Filter by store
- `idx_orders_created_at` - Date range queries
- `idx_orders_payment_status` - Filter paid orders
- `idx_orders_status` - Filter by order status

#### Composite Indexes
- `idx_orders_store_created_at` - Store orders by date
- `idx_orders_store_created_payment` - **Sales queries**
  - Used for: `.in('store_id', storeIds).gte('created_at', ...).eq('payment_status', 'paid')`

### Stores Table

#### Single Column Indexes
- `idx_stores_business_id` - Filter by business
- `idx_stores_is_active` - Filter active stores
- `idx_stores_platform` - Filter by platform

#### Composite Indexes
- `idx_stores_business_active` - **Common query pattern**
  - Used for: `.eq('business_id', businessProfile.id).eq('is_active', true)`

### Business Profile Table

#### Single Column Indexes
- `idx_business_profile_auth_user_id` - **Most common lookup**
  - Used for: `.eq('auth_user_id', user.id)`
- `idx_business_profile_store_id` - Store lookup

### Store Connections Table

#### Single Column Indexes
- `idx_store_connections_store_id` - Join with stores
- `idx_store_connections_status` - Filter by connection status

### Inventory Table

#### Single Column Indexes
- `idx_inventory_product_id` - Filter by product
- `idx_inventory_store_branch_id` - Filter by branch
- `idx_inventory_quantity` - Low stock queries

#### Composite Indexes
- `idx_inventory_product_branch` - Product inventory by branch

### Product Images Table

#### Single Column Indexes
- `idx_product_images_product_id` - Filter by product
- `idx_product_images_is_primary` - Find primary image

#### Composite Indexes
- `idx_product_images_product_primary` - Primary image lookup
- `idx_product_images_display_order` - Sort images

### Product Categories Table

#### Single Column Indexes
- `idx_product_categories_product_id` - Filter by product
- `idx_product_categories_category_id` - Filter by category

#### Composite Indexes
- `idx_product_categories_product_category` - Product-category lookup

### Categories Table

#### Single Column Indexes
- `idx_categories_parent_id` - Hierarchy queries
- `idx_categories_type` - Filter by type
- `idx_categories_is_active` - Filter active categories

#### Composite Indexes
- `idx_categories_type_parent` - Hierarchy by type

### Brands Table

#### Single Column Indexes
- `idx_brands_name` - Search/lookup by name
- `idx_brands_is_active` - Filter active brands

## Query Patterns Optimized

### Dashboard Page Queries

1. **Store Count**
   ```sql
   SELECT COUNT(*) FROM stores 
   WHERE business_id = ? AND is_active = true
   ```
   - Uses: `idx_stores_business_active`

2. **Product Count**
   ```sql
   SELECT COUNT(*) FROM products 
   WHERE store_id IN (?) AND is_active = true AND deleted_at IS NULL
   ```
   - Uses: `idx_products_store_active_not_deleted`

3. **Orders by Date Range**
   ```sql
   SELECT COUNT(*) FROM orders 
   WHERE store_id IN (?) AND created_at >= ?
   ```
   - Uses: `idx_orders_store_created_at`

4. **Sales (Paid Orders)**
   ```sql
   SELECT total_amount FROM orders 
   WHERE store_id IN (?) AND created_at >= ? AND payment_status = 'paid'
   ```
   - Uses: `idx_orders_store_created_payment`

### Products Page Queries

1. **Fetch Products**
   ```sql
   SELECT * FROM products 
   WHERE store_id IN (?) AND is_active = true AND deleted_at IS NULL 
   ORDER BY created_at DESC
   ```
   - Uses: `idx_products_store_active_not_deleted` + `idx_products_store_created_at`

2. **Search Products**
   ```sql
   SELECT * FROM products 
   WHERE store_id IN (?) AND (
     name_en ILIKE '%term%' OR 
     name_ar ILIKE '%term%' OR 
     sku ILIKE '%term%'
   )
   ```
   - Uses: `idx_products_name_en_trgm`, `idx_products_name_ar_trgm`, `idx_products_sku`

## Performance Impact

### Before Indexes
- Dashboard load: 1.5-2 seconds
- Product list: 500-800ms
- Search: 1-2 seconds

### After Indexes (Expected)
- Dashboard load: 200-400ms (75% faster)
- Product list: 100-200ms (80% faster)
- Search: 200-400ms (80% faster)

## Maintenance

### Monitor Index Usage
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Check Index Sizes
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Rebuild Indexes (if needed)
```sql
REINDEX INDEX CONCURRENTLY idx_products_store_active_not_deleted;
```

## Best Practices

1. **Partial Indexes** - Use `WHERE` clauses to create smaller, faster indexes
2. **Composite Indexes** - Match exact query patterns
3. **Column Order** - Most selective columns first
4. **Monitor Usage** - Remove unused indexes
5. **Regular ANALYZE** - Keep statistics up to date

## Extension Required

The migration enables `pg_trgm` extension for trigram text search:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This is needed for the GIN indexes on `name_en` and `name_ar` columns.

## Applying the Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard
# Copy the SQL from the migration file and run it
```

## Verification

After applying, verify indexes exist:
```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('products', 'orders', 'stores', 'business_profile')
ORDER BY tablename, indexname;
```

