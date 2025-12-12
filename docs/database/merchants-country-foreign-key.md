# Merchants Country Foreign Key

## Overview

The `merchants.country` column has been converted from a TEXT field (storing ISO2 country codes) to a UUID foreign key referencing the `countries` table. This ensures referential integrity and allows for proper joins with country data.

## Migration History

### Migration: `20251212120000_change_merchants_country_to_foreign_key.sql`

This migration:
1. Added a new `country_id` column as UUID foreign key
2. Migrated existing TEXT country codes to country_id by matching ISO2 codes
3. Dropped the old TEXT `country` column
4. Renamed `country_id` to `country` for cleaner API
5. Added index for better query performance

### Migration: `20251212120100_update_rpc_to_use_country_id.sql`

Updated the `create_merchant_onboarding` RPC function to:
- Accept ISO2 country codes (for backward compatibility)
- Look up country_id from `countries` or `countries_master` table
- Store UUID country_id instead of TEXT
- Fallback to Saudi Arabia (SA) if country not found

## Current Schema

```sql
-- merchants table
country UUID REFERENCES countries(id) ON DELETE SET NULL

-- countries table (or countries_master)
id UUID PRIMARY KEY
name TEXT
iso2 TEXT UNIQUE
iso3 TEXT
phone_code TEXT
flag_url TEXT
is_active BOOLEAN
```

## Benefits

1. **Referential Integrity**: Ensures country references are valid
2. **Data Consistency**: Country data is centralized in one table
3. **Better Queries**: Can join with country data easily
4. **Type Safety**: UUID type prevents invalid country codes

## Usage in Code

### RPC Function

The `create_merchant_onboarding` function accepts ISO2 codes and converts them:

```sql
-- Function accepts: preferred_country TEXT (e.g., 'SA')
-- Looks up: SELECT id FROM countries WHERE iso2 = 'SA'
-- Stores: merchants.country = <country_id_uuid>
```

### Application Code

The application continues to work with ISO2 codes:

```typescript
// SetupForm passes ISO2 code
preferred_country: 'SA' // ISO2 code

// RPC function converts to UUID
// Database stores UUID foreign key
```

## Querying Merchants with Country Data

```sql
-- Get merchant with country information
SELECT 
  m.*,
  c.name as country_name,
  c.iso2 as country_code,
  c.flag_url
FROM merchants m
LEFT JOIN countries c ON m.country = c.id
WHERE m.id = '...';
```

## Default Country

The default country is now **Saudi Arabia (SA)** instead of UAE (AE). This is reflected in:
- RPC function defaults
- Application code defaults
- Cookie defaults
- URL defaults

## Migration Notes

- Existing merchants with country codes were automatically migrated
- If a country code couldn't be matched, the country_id was set to NULL
- The foreign key constraint allows NULL values (ON DELETE SET NULL)

## Related Tables

- `countries` or `countries_master`: Source of country data
- `merchant_users.preferred_country`: Still stores ISO2 code (TEXT) for user preferences
- `merchants.country`: Now stores UUID foreign key

