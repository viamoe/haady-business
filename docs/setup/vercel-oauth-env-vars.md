# Vercel OAuth Environment Variables Setup

## Required Environment Variables

You need to add the following environment variables to Vercel for store connections to work:

### Shopify OAuth
```bash
NEXT_PUBLIC_SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
NEXT_PUBLIC_SHOPIFY_REDIRECT_URI=https://business.haady.app/callback
```

### Zid OAuth
```bash
NEXT_PUBLIC_ZID_CLIENT_ID=your_zid_client_id
ZID_CLIENT_SECRET=your_zid_client_secret
NEXT_PUBLIC_ZID_REDIRECT_URI=https://business.haady.app/callback
```

### Salla OAuth
```bash
NEXT_PUBLIC_SALLA_CLIENT_ID=your_salla_client_id
SALLA_CLIENT_SECRET=your_salla_client_secret
NEXT_PUBLIC_SALLA_REDIRECT_URI=https://business.haady.app/callback
```

## Quick Restore (Recommended)

Use the helper script to restore all OAuth variables interactively:

```bash
cd haady-business
./scripts/restore-oauth-env-quick.sh
```

This script will:
- Prompt you for all Client IDs and Secrets
- Automatically set redirect URIs to `https://business.haady.app/callback`
- Add variables to Production, Preview, and Development environments

## Adding via Vercel CLI (Manual)

Run these commands in the `haady-business` directory:

```bash
# Shopify
vercel env add NEXT_PUBLIC_SHOPIFY_CLIENT_ID production
vercel env add SHOPIFY_CLIENT_SECRET production
vercel env add NEXT_PUBLIC_SHOPIFY_REDIRECT_URI production

# Zid
vercel env add NEXT_PUBLIC_ZID_CLIENT_ID production
vercel env add ZID_CLIENT_SECRET production
vercel env add NEXT_PUBLIC_ZID_REDIRECT_URI production

# Salla
vercel env add NEXT_PUBLIC_SALLA_CLIENT_ID production
vercel env add SALLA_CLIENT_SECRET production
vercel env add NEXT_PUBLIC_SALLA_REDIRECT_URI production
```

**Note**: When prompted, paste the actual values. For redirect URIs, use: `https://business.haady.app/callback`

## Adding via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `haady-business` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name**: The variable name (e.g., `NEXT_PUBLIC_SHOPIFY_CLIENT_ID`)
   - **Value**: The actual credential value
   - **Environment**: Select **Production**, **Preview**, and **Development** (or just Production if you prefer)

## Adding to All Environments

To add to all environments (Production, Preview, Development) at once via CLI:

```bash
# For each variable, when prompted, select all environments:
# - Production
# - Preview  
# - Development
```

Or add them one by one for each environment:

```bash
# Example for Shopify Client ID
vercel env add NEXT_PUBLIC_SHOPIFY_CLIENT_ID production
vercel env add NEXT_PUBLIC_SHOPIFY_CLIENT_ID preview
vercel env add NEXT_PUBLIC_SHOPIFY_CLIENT_ID development
```

## Verify Variables Are Set

Check that variables are added:

```bash
vercel env ls
```

You should see all the OAuth variables listed.

## After Adding Variables

1. **Redeploy** your application (Vercel will automatically redeploy when you add env vars, or trigger manually)
2. **Verify** the variables are accessible in your app
3. **Test** store connection flow

## Getting OAuth Credentials

### Shopify
1. Go to [Shopify Partners](https://partners.shopify.com)
2. Select your app
3. Copy **Client ID** and **Client Secret**

### Zid
1. Go to [Zid Partner Dashboard](https://partner.zid.sa)
2. Select your app
3. Copy **Client ID** and **Client Secret**

### Salla
1. Go to [Salla Partners](https://salla.dev)
2. Select your app
3. Copy **Client ID** and **Client Secret**

## Important Notes

- **Redirect URIs**: Must match exactly in both Vercel env vars and OAuth app dashboard
- **Production URL**: `https://business.haady.app/callback`
- **Client Secrets**: Never commit these to git - only set in Vercel
- **NEXT_PUBLIC_ prefix**: Variables with this prefix are exposed to the browser
- **Without prefix**: Server-side only (more secure for secrets)

