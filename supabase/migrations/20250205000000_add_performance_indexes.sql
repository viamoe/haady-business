-- ====================================================================
-- Migration: Add Performance Indexes for Maximum Query Performance
-- Description: Creates comprehensive indexes for all frequently queried columns
--              to optimize dashboard, products, orders, and inventory queries
-- Date: 2025-02-05
-- ====================================================================

-- ====================================================================
-- PRODUCTS TABLE INDEXES
-- ====================================================================

-- Index for store_id (most common filter)
-- Used in: .in('store_id', storeIds)
CREATE INDEX IF NOT EXISTS idx_products_store_id 
ON public.products(store_id) 
WHERE store_id IS NOT NULL;

-- Index for is_active (frequently filtered)
-- Used in: .eq('is_active', true)
CREATE INDEX IF NOT EXISTS idx_products_is_active 
ON public.products(is_active) 
WHERE is_active = true;

-- Index for deleted_at (soft delete filter)
-- Used in: .is('deleted_at', null)
CREATE INDEX IF NOT EXISTS idx_products_deleted_at 
ON public.products(deleted_at) 
WHERE deleted_at IS NULL;

-- Index for created_at (sorting)
-- Used in: .order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_products_created_at 
ON public.products(created_at DESC);

-- Index for brand_id (foreign key, used in joins)
CREATE INDEX IF NOT EXISTS idx_products_brand_id 
ON public.products(brand_id) 
WHERE brand_id IS NOT NULL;

-- Composite index for common query pattern: store_id + is_active + deleted_at
-- Used in: .in('store_id', storeIds).eq('is_active', true).is('deleted_at', null)
CREATE INDEX IF NOT EXISTS idx_products_store_active_not_deleted 
ON public.products(store_id, is_active, deleted_at) 
WHERE is_active = true AND deleted_at IS NULL;

-- Composite index for store_id + created_at (for sorting by store)
-- Used in: .in('store_id', storeIds).order('created_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_products_store_created_at 
ON public.products(store_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Text search indexes (for name_en, name_ar, description_en, description_ar, sku)
-- Used in: .or('name_en.ilike.%term%,name_ar.ilike.%term%,sku.ilike.%term%')
-- Note: Using GIN with pg_trgm for efficient ILIKE queries
CREATE INDEX IF NOT EXISTS idx_products_name_en_trgm 
ON public.products USING gin(name_en gin_trgm_ops) 
WHERE name_en IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_name_ar_trgm 
ON public.products USING gin(name_ar gin_trgm_ops) 
WHERE name_ar IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_sku 
ON public.products(sku) 
WHERE sku IS NOT NULL;

-- Index for status (if used in filtering)
CREATE INDEX IF NOT EXISTS idx_products_status 
ON public.products(status) 
WHERE status IS NOT NULL;

-- ====================================================================
-- ORDERS TABLE INDEXES
-- ====================================================================

-- Index for store_id (most common filter)
-- Used in: .in('store_id', storeIds)
CREATE INDEX IF NOT EXISTS idx_orders_store_id 
ON public.orders(store_id) 
WHERE store_id IS NOT NULL;

-- Index for created_at (date range queries)
-- Used in: .gte('created_at', dateStart.toISOString())
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON public.orders(created_at DESC);

-- Index for payment_status (filtering paid orders)
-- Used in: .eq('payment_status', 'paid')
CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
ON public.orders(payment_status) 
WHERE payment_status = 'paid';

-- Composite index for store_id + created_at (common pattern)
-- Used in: .in('store_id', storeIds).gte('created_at', ...)
CREATE INDEX IF NOT EXISTS idx_orders_store_created_at 
ON public.orders(store_id, created_at DESC);

-- Composite index for store_id + created_at + payment_status (sales queries)
-- Used in: .in('store_id', storeIds).gte('created_at', ...).eq('payment_status', 'paid')
CREATE INDEX IF NOT EXISTS idx_orders_store_created_payment 
ON public.orders(store_id, created_at DESC, payment_status) 
WHERE payment_status = 'paid';

-- Index for order status (if used in filtering)
-- Note: Commented out as orders table may not have status column
-- CREATE INDEX IF NOT EXISTS idx_orders_status 
-- ON public.orders(status) 
-- WHERE status IS NOT NULL;

-- ====================================================================
-- STORES TABLE INDEXES
-- ====================================================================

-- Index for business_id (most common filter)
-- Used in: .eq('business_id', businessProfile.id)
CREATE INDEX IF NOT EXISTS idx_stores_business_id 
ON public.stores(business_id) 
WHERE business_id IS NOT NULL;

-- Index for is_active (frequently filtered)
-- Used in: .eq('is_active', true)
CREATE INDEX IF NOT EXISTS idx_stores_is_active 
ON public.stores(is_active) 
WHERE is_active = true;

-- Composite index for business_id + is_active (common pattern)
-- Used in: .eq('business_id', businessProfile.id).eq('is_active', true)
CREATE INDEX IF NOT EXISTS idx_stores_business_active 
ON public.stores(business_id, is_active) 
WHERE is_active = true;

-- Index for platform (if used in filtering)
CREATE INDEX IF NOT EXISTS idx_stores_platform 
ON public.stores(platform) 
WHERE platform IS NOT NULL;

-- ====================================================================
-- BUSINESS_PROFILE TABLE INDEXES
-- ====================================================================

-- Index for auth_user_id (most common filter)
-- Used in: .eq('auth_user_id', user.id)
CREATE INDEX IF NOT EXISTS idx_business_profile_auth_user_id 
ON public.business_profile(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- Index for store_id (lookup)
CREATE INDEX IF NOT EXISTS idx_business_profile_store_id 
ON public.business_profile(store_id) 
WHERE store_id IS NOT NULL;

-- ====================================================================
-- STORE_CONNECTIONS TABLE INDEXES
-- ====================================================================

-- Index for store_id (foreign key, used in joins)
CREATE INDEX IF NOT EXISTS idx_store_connections_store_id 
ON public.store_connections(store_id) 
WHERE store_id IS NOT NULL;

-- Index for connection status (if used in filtering)
CREATE INDEX IF NOT EXISTS idx_store_connections_status 
ON public.store_connections(connection_status) 
WHERE connection_status IS NOT NULL;

-- ====================================================================
-- INVENTORY TABLE INDEXES
-- ====================================================================

-- Index for product_id (foreign key, most common filter)
CREATE INDEX IF NOT EXISTS idx_inventory_product_id 
ON public.inventory(product_id) 
WHERE product_id IS NOT NULL;

-- Index for branch_id (foreign key)
-- Note: Already exists as idx_inventory_branch_id from inventory system migration
-- CREATE INDEX IF NOT EXISTS idx_inventory_branch_id 
-- ON public.inventory(branch_id) 
-- WHERE branch_id IS NOT NULL;

-- Composite index for product_id + branch_id (common lookup)
CREATE INDEX IF NOT EXISTS idx_inventory_product_branch 
ON public.inventory(product_id, branch_id);

-- Index for quantity (for low stock queries)
CREATE INDEX IF NOT EXISTS idx_inventory_quantity 
ON public.inventory(quantity) 
WHERE quantity IS NOT NULL;

-- ====================================================================
-- PRODUCT_IMAGES TABLE INDEXES
-- ====================================================================

-- Index for product_id (foreign key, most common filter)
CREATE INDEX IF NOT EXISTS idx_product_images_product_id 
ON public.product_images(product_id) 
WHERE product_id IS NOT NULL;

-- Index for is_primary (for finding primary image)
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary 
ON public.product_images(is_primary) 
WHERE is_primary = true;

-- Composite index for product_id + is_primary (common lookup)
CREATE INDEX IF NOT EXISTS idx_product_images_product_primary 
ON public.product_images(product_id, is_primary) 
WHERE is_primary = true;

-- Index for display_order (for sorting)
CREATE INDEX IF NOT EXISTS idx_product_images_display_order 
ON public.product_images(product_id, display_order);

-- ====================================================================
-- PRODUCT_CATEGORIES TABLE INDEXES
-- ====================================================================

-- Index for product_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id 
ON public.product_categories(product_id) 
WHERE product_id IS NOT NULL;

-- Index for category_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id 
ON public.product_categories(category_id) 
WHERE category_id IS NOT NULL;

-- Composite index for both (common lookup)
CREATE INDEX IF NOT EXISTS idx_product_categories_product_category 
ON public.product_categories(product_id, category_id);

-- ====================================================================
-- CATEGORIES TABLE INDEXES
-- ====================================================================

-- Index for parent_id (for hierarchy queries)
CREATE INDEX IF NOT EXISTS idx_categories_parent_id 
ON public.categories(parent_id) 
WHERE parent_id IS NOT NULL;

-- Index for type (if used in filtering)
-- Note: Categories table may not have type column, check schema first
-- CREATE INDEX IF NOT EXISTS idx_categories_type 
-- ON public.categories(type) 
-- WHERE type IS NOT NULL;

-- Index for is_active (if used in filtering)
CREATE INDEX IF NOT EXISTS idx_categories_is_active 
ON public.categories(is_active) 
WHERE is_active = true;

-- Composite index for type + parent_id (common hierarchy query)
-- Note: Commented out as type column may not exist
-- CREATE INDEX IF NOT EXISTS idx_categories_type_parent 
-- ON public.categories(type, parent_id) 
-- WHERE is_active = true;

-- ====================================================================
-- BRANDS TABLE INDEXES
-- ====================================================================

-- Index for name (for search/lookup)
CREATE INDEX IF NOT EXISTS idx_brands_name 
ON public.brands(name) 
WHERE name IS NOT NULL;

-- Index for is_active (if used in filtering)
CREATE INDEX IF NOT EXISTS idx_brands_is_active 
ON public.brands(is_active) 
WHERE is_active = true;

-- ====================================================================
-- COUNTRIES TABLE INDEXES
-- ====================================================================

-- Index for id (if used in joins, though it's already primary key)
-- Primary key already has index, but adding explicit index for clarity
-- Note: Primary keys automatically have indexes, so this is optional

-- ====================================================================
-- ENABLE pg_trgm EXTENSION FOR TEXT SEARCH
-- ====================================================================

-- Enable pg_trgm extension for trigram text search (if not already enabled)
-- This is needed for the GIN indexes on name_en and name_ar
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ====================================================================
-- ANALYZE TABLES AFTER INDEX CREATION
-- ====================================================================

-- Update statistics for query planner
ANALYZE public.products;
ANALYZE public.orders;
ANALYZE public.stores;
ANALYZE public.business_profile;
ANALYZE public.store_connections;
ANALYZE public.inventory;
ANALYZE public.product_images;
ANALYZE public.product_categories;
ANALYZE public.categories;
ANALYZE public.brands;

-- ====================================================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================================================

COMMENT ON INDEX idx_products_store_active_not_deleted IS 
'Composite index for common products query: store_id + is_active + deleted_at';

COMMENT ON INDEX idx_orders_store_created_payment IS 
'Composite index for sales queries: store_id + created_at + payment_status';

COMMENT ON INDEX idx_stores_business_active IS 
'Composite index for active stores by business: business_id + is_active';

