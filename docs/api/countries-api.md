# Countries API Documentation

## Overview

The Countries API provides a public endpoint to fetch country data from the database. This endpoint is accessible without authentication and includes CORS headers for cross-origin requests.

## Endpoint

```
GET /api/countries
```

## Authentication

**No authentication required** - This is a public endpoint.

## Response Format

```json
{
  "countries": [
    {
      "id": "uuid",
      "name": "Saudi Arabia",
      "iso2": "SA",
      "iso3": "SAU",
      "phone_code": "966",
      "flag_url": "https://flagcdn.com/w320/sa.png"
    }
  ]
}
```

## Query Parameters

None - Returns all active countries.

## Filtering

The API automatically filters countries by `is_active = true`. Only active countries are returned.

## Response Headers

The API includes CORS headers for cross-origin access:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Database Tables

The API tries to fetch from:
1. `countries_master` table (primary)
2. `countries` table (fallback)

## Usage Examples

### JavaScript/TypeScript

```typescript
const response = await fetch('/api/countries');
const data = await response.json();
const countries = data.countries;
```

### cURL

```bash
curl https://business.haady.app/api/countries
```

### External Application

```javascript
// Can be called from any domain due to CORS
fetch('https://business.haady.app/api/countries')
  .then(res => res.json())
  .then(data => console.log(data.countries));
```

## Country Data Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, used as foreign key in merchants table |
| `name` | TEXT | Country name in English |
| `iso2` | TEXT | ISO 3166-1 alpha-2 code (e.g., "SA", "AE") |
| `iso3` | TEXT | ISO 3166-1 alpha-3 code (e.g., "SAU", "ARE") |
| `phone_code` | TEXT | International phone code (e.g., "966", "971") |
| `flag_url` | TEXT | URL to country flag image |

## Flag URLs

Country flags are stored in the `flag_url` column and can be:
- FlagCDN URLs: `https://flagcdn.com/w320/sa.png`
- Supabase Storage URLs: `https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/flags/...`

The Next.js image configuration includes `flagcdn.com` as an allowed domain.

## Error Handling

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "details": "Error message"
}
```

### No Countries Found

Returns empty array:
```json
{
  "countries": []
}
```

## CORS Preflight

The endpoint handles OPTIONS requests for CORS preflight:

```
OPTIONS /api/countries
```

## Use Cases

1. **Country Dropdowns**: Populate country selectors in forms
2. **Language Selectors**: Display countries with their flags
3. **Setup Forms**: Select business country during onboarding
4. **External Integrations**: Allow third-party apps to fetch country data

## Performance

- Results are ordered by `name` (ascending)
- Only active countries are returned
- No pagination (typically < 200 countries)

## Related Documentation

- [Cookie System](./cookies-system.md) - How country preferences are stored
- [Merchants Country Foreign Key](./database/merchants-country-foreign-key.md) - How countries are linked to merchants

