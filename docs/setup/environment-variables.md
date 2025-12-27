# Environment Variables Setup

Copy these environment variables to your `.env.local` file in the `haady-business` directory.

## Required Environment Variables

```env
# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ===========================================
# SALLA OAUTH CONFIGURATION
# ===========================================
# Get these from: https://salla.partners/
# 1. Create a new app in Salla Partner Dashboard
# 2. Set Redirect URI to: http://localhost:3002/callback (dev) or https://yourdomain.com/callback (prod)

NEXT_PUBLIC_SALLA_CLIENT_ID=
SALLA_CLIENT_SECRET=
NEXT_PUBLIC_SALLA_REDIRECT_URI=http://localhost:3002/callback

# ===========================================
# ZID OAUTH CONFIGURATION
# ===========================================
# Get these from: https://web.zid.sa/market/developer
# 1. Create a new app in Zid Developer Portal
# 2. Set Redirect URI to: http://localhost:3002/callback (dev) or https://yourdomain.com/callback (prod)

NEXT_PUBLIC_ZID_CLIENT_ID=
ZID_CLIENT_SECRET=
NEXT_PUBLIC_ZID_REDIRECT_URI=http://localhost:3002/callback

# ===========================================
# SHOPIFY OAUTH CONFIGURATION
# ===========================================
# Get these from: https://partners.shopify.com/
# 1. Create a new app in Shopify Partner Dashboard
# 2. Set Redirect URI to: http://localhost:3002/callback (dev) or https://yourdomain.com/callback (prod)

NEXT_PUBLIC_SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
NEXT_PUBLIC_SHOPIFY_REDIRECT_URI=http://localhost:3002/callback

# ===========================================
# SITE CONFIGURATION
# ===========================================
# Used for redirects and absolute URLs

NEXT_PUBLIC_SITE_URL=http://localhost:3002
```

## Where to Get Credentials

### Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy the Project URL and anon/public key
5. Copy the service_role key (keep this secret!)

### Salla
1. Go to [Salla Partners](https://salla.partners/)
2. Create a new app
3. Set the OAuth Redirect URI to your callback URL
4. Copy the Client ID and Client Secret

### Zid
1. Go to [Zid Developer Portal](https://web.zid.sa/market/developer)
2. Create a new app
3. Set the OAuth Redirect URI to your callback URL
4. Copy the Client ID and Client Secret

### Shopify
1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create a new app
3. Set the OAuth Redirect URI to your callback URL
4. Copy the API Key (Client ID) and API Secret Key (Client Secret)

## Production vs Development

For **development**, use:
- `http://localhost:3002/callback` as redirect URIs
- `http://localhost:3002` as site URL

For **production**, replace with your actual domain:
- `https://yourdomain.com/callback` as redirect URIs
- `https://yourdomain.com` as site URL

