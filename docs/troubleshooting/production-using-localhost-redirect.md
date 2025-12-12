# Production Using Localhost Redirect URI

## Problem
When testing on production (`https://business.haady.app`), the console shows:
```
Redirect URI: http://localhost:3002/callback
```

This means the production environment variable is not set or not being read.

## Solution

### Step 1: Verify Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `haady-business` project
3. Go to **Settings** → **Environment Variables**
4. Check that these are set for **Production** environment:
   - `NEXT_PUBLIC_SHOPIFY_REDIRECT_URI` = `https://business.haady.app/callback`
   - `NEXT_PUBLIC_ZID_REDIRECT_URI` = `https://business.haady.app/callback`
   - `NEXT_PUBLIC_SALLA_REDIRECT_URI` = `https://business.haady.app/callback`

### Step 2: If Missing, Add Them

In Vercel Dashboard → Environment Variables:

1. Click **Add New**
2. **Key**: `NEXT_PUBLIC_SHOPIFY_REDIRECT_URI`
3. **Value**: `https://business.haady.app/callback`
4. **Environment**: Select **Production** (and Preview/Development if needed)
5. Click **Save**

Repeat for:
- `NEXT_PUBLIC_ZID_REDIRECT_URI`
- `NEXT_PUBLIC_SALLA_REDIRECT_URI`

### Step 3: Redeploy

After adding/updating environment variables:

1. Vercel will automatically trigger a redeploy
2. Or manually trigger: **Deployments** → **Redeploy** latest deployment
3. Wait for deployment to complete

### Step 4: Verify

1. Clear browser cache
2. Go to `https://business.haady.app/dashboard`
3. Try connecting a store
4. Check browser console (F12)
5. The Redirect URI should now show: `https://business.haady.app/callback`

### Step 5: Register in OAuth Provider

Make sure `https://business.haady.app/callback` is registered in:

- **Shopify Partners**: App setup → Allowed redirection URL(s)
- **Zid Partner Dashboard**: Redirect URI settings
- **Salla Partners**: Redirect URI settings

## Why This Happens

`NEXT_PUBLIC_*` environment variables are embedded at build time. If they're not set when the app is built, the code falls back to the default `http://localhost:3002/callback`.

After adding the variables in Vercel, you must redeploy for them to take effect.

