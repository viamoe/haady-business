# Categories Table Migration Guide

## Overview
This guide documents the migration from multiple category tables (`categories_master`, `store_categories`, `categories`) to a single unified `categories` table with junction tables for relationships.

## Migration Date
December 2024

## Changes

### New Table Structure

#### 1. **categories** (Main Table)
Single source of truth for all categories used in stores and products.

```sql
categories
├── id (uuid, primary key)
├── name (text) - English name
├── name_ar (text) - Arabic name
├── slug (text, unique)
├── parent_id (uuid) - For category hierarchy
├── level (integer) - 0 = top-level, 1+ = subcategories
├── icon (text) - Icon name or emoji
├── description (text) - English description
├── description_ar (text) - Arabic description
├── is_active (boolean)
├── sort_order (integer)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

**Features:**
- Hierarchical structure (parent-child relationships)
- Multi-level support (unlimited depth)
- Localization (English + Arabic)
- Soft delete via `is_active` flag
- Custom sorting via `sort_order`

#### 2. **store_categories** (Junction Table)
Links stores to their categories (many-to-many relationship).

```sql
store_categories
├── id (uuid, primary key)
├── store_id (uuid) - FK to business_profiles
├── category_id (uuid) - FK to categories
├── is_primary (boolean) - Main category for the store
├── created_at (timestamptz)
└── UNIQUE(store_id, category_id)
```

**Features:**
- Stores can have multiple categories
- One primary category per store
- Prevents duplicate category assignments

#### 3. **product_categories** (Junction Table)
Links products to their categories (many-to-many relationship).

```sql
product_categories
├── id (uuid, primary key)
├── product_id (uuid) - FK to products
├── category_id (uuid) - FK to categories
├── created_at (timestamptz)
└── UNIQUE(product_id, category_id)
```

**Features:**
- Products can belong to multiple categories
- Enables cross-category filtering
- Supports subcategory assignment

### Helper Views

#### store_categories_view
Denormalized view for easy store category querying:
```sql
SELECT 
  store_id,
  category_id,
  is_primary,
  category_name,
  category_name_ar,
  category_slug,
  category_icon,
  category_level,
  category_parent_id,
  category_path -- "Electronics > Phones > Smartphones"
FROM store_categories_view
```

#### product_categories_view
Denormalized view for easy product category querying:
```sql
SELECT 
  product_id,
  category_id,
  category_name,
  category_name_ar,
  category_slug,
  category_icon,
  category_level,
  category_parent_id,
  category_path
FROM product_categories_view
```

### Helper Functions

#### get_category_path(category_id UUID)
Returns the full path of a category (e.g., "Electronics > Phones > Smartphones").

```sql
SELECT get_category_path('category-uuid-here');
-- Returns: "Electronics > Phones > Smartphones"
```

## Migration Steps

### 1. Run the Migration Script
```bash
# In your Supabase SQL Editor or via CLI
psql -h your-db-host -U your-user -d your-database -f migrate_to_single_categories_table.sql
```

### 2. Verify Migration
```sql
-- Check category counts
SELECT 
  'Total categories' as metric, 
  COUNT(*) as count 
FROM categories
UNION ALL
SELECT 'Active categories', COUNT(*) FROM categories WHERE is_active = true
UNION ALL
SELECT 'Top-level categories', COUNT(*) FROM categories WHERE parent_id IS NULL
UNION ALL
SELECT 'Store categories', COUNT(*) FROM store_categories
UNION ALL
SELECT 'Product categories', COUNT(*) FROM product_categories;

-- Check category hierarchy
SELECT 
  level,
  COUNT(*) as category_count
FROM categories
WHERE is_active = true
GROUP BY level
ORDER BY level;
```

### 3. Update Application Code

#### Frontend Changes
- ✅ Updated `BusinessSetupStep.tsx` to fetch from `categories` table
- ✅ Added Arabic localization support (`name_ar`)
- ✅ Updated category saving to use `store_categories` junction table

#### Database RPC Updates
The `create_business_onboarding` RPC function now:
- Accepts `selected_category_id` parameter
- Stores category in `store_categories` junction table
- Marks it as the primary category (`is_primary = true`)

### 4. Testing Checklist

#### Onboarding Flow
- [ ] Categories load correctly in dropdown
- [ ] Arabic names display when locale is Arabic
- [ ] Category icons display properly
- [ ] Selected category saves to `store_categories`
- [ ] Category marked as primary in junction table

#### Store Management
- [ ] Stores can have multiple categories
- [ ] Primary category displays prominently
- [ ] Category updates reflect immediately
- [ ] Category filtering works on store listings

#### Product Management
- [ ] Products can be assigned multiple categories
- [ ] Category filters work on product listings
- [ ] Subcategory assignment works
- [ ] Category breadcrumbs display correctly

## Benefits of New Structure

### 1. **Single Source of Truth**
- One table manages all categories
- Consistent categorization across stores and products
- Easier to maintain and update

### 2. **Flexibility**
- Unlimited category hierarchy depth
- Products can belong to multiple categories
- Stores can be in multiple categories
- Easy to add new levels or categories

### 3. **Better Performance**
- Indexed relationships
- Optimized queries via views
- Efficient category path generation

### 4. **Localization**
- Built-in Arabic support
- Easy to add more languages
- Consistent translation management

### 5. **Better User Experience**
- Browse products across all stores by category
- Find stores by category
- Multi-level category navigation
- Improved search and filtering

## Common Queries

### Get all top-level categories
```sql
SELECT * FROM categories 
WHERE is_active = true 
AND parent_id IS NULL
ORDER BY sort_order, name;
```

### Get subcategories of a parent
```sql
SELECT * FROM categories 
WHERE is_active = true 
AND parent_id = 'parent-category-id'
ORDER BY sort_order, name;
```

### Get all categories for a store
```sql
SELECT c.*
FROM categories c
JOIN store_categories sc ON c.id = sc.category_id
WHERE sc.store_id = 'store-id'
AND c.is_active = true;
```

### Get primary category for a store
```sql
SELECT c.*
FROM categories c
JOIN store_categories sc ON c.id = sc.category_id
WHERE sc.store_id = 'store-id'
AND sc.is_primary = true
AND c.is_active = true;
```

### Get all categories for a product
```sql
SELECT c.*
FROM categories c
JOIN product_categories pc ON c.id = pc.category_id
WHERE pc.product_id = 'product-id'
AND c.is_active = true;
```

### Get all products in a category (including subcategories)
```sql
WITH RECURSIVE category_tree AS (
  SELECT id FROM categories WHERE id = 'category-id'
  UNION ALL
  SELECT c.id FROM categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT DISTINCT p.*
FROM products p
JOIN product_categories pc ON p.id = pc.product_id
WHERE pc.category_id IN (SELECT id FROM category_tree);
```

## Rollback Plan

If you need to rollback the migration:

1. **Restore old tables** from backup
2. **Drop new tables**:
```sql
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS store_categories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP VIEW IF EXISTS store_categories_view CASCADE;
DROP VIEW IF EXISTS product_categories_view CASCADE;
DROP FUNCTION IF EXISTS get_category_path CASCADE;
```

3. **Update application code** to use old structure

## Support

For issues or questions:
1. Check verification queries above
2. Review migration logs
3. Contact development team

## Future Enhancements

### Planned Features
- [ ] Category images/banners
- [ ] SEO metadata per category
- [ ] Category-specific featured products
- [ ] Dynamic category pages
- [ ] Category popularity analytics
- [ ] Recommended categories based on business type

### Possible Extensions
- Additional language support (French, Spanish, etc.)
- Category attributes/properties
- Category-specific tax rules
- Category-based commission rates
- Seasonal category promotions

