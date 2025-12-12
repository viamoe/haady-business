# Localhost OAuth Setup Guide

## Error: "Client authentication failed - The requested OAuth 2.0 Client does not exist"

This error means the OAuth client credentials are missing or not configured correctly for localhost.

## Quick Fix Checklist

### 1. Check Environment Variables

Create or update `.env.local` in the root of `haady-business`:

```env
# Shopify (if using Shopify)
NEXT_PUBLIC_SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
NEXT_PUBLIC_SHOPIFY_REDIRECT_URI=http://localhost:3002/callback

# Zid (if using Zid)
NEXT_PUBLIC_ZID_CLIENT_ID=your_zid_client_id
ZID_CLIENT_SECRET=your_zid_client_secret
NEXT_PUBLIC_ZID_REDIRECT_URI=http://localhost:3002/callback
# Note: Zid requires HTTPS, so use ngrok (see below)

# Salla (if using Salla)
NEXT_PUBLIC_SALLA_CLIENT_ID=your_salla_client_id
SALLA_CLIENT_SECRET=your_salla_client_secret
NEXT_PUBLIC_SALLA_REDIRECT_URI=http://localhost:3002/callback
```

### 2. Verify Your Dev Server Port

The default redirect URI is `http://localhost:3002/callback`. If your dev server runs on a different port, update the redirect URI accordingly.

Check your dev server port:
```bash
# Usually shown when you run: npm run dev
# Or check package.json scripts
```

### 3. Configure OAuth App in Platform Dashboard

#### For Shopify:
1. Go to [Shopify Partners](https://partners.shopify.com)
2. Select your app
3. In **App setup** → **Allowed redirection URL(s)**, add:
   ```
   http://localhost:3002/callback
   ```
4. Copy **Client ID** and **Client Secret** to `.env.local`

#### For Zid:
⚠️ **Important**: Zid requires HTTPS, so you need ngrok for localhost.

1. **Set up ngrok** (see ngrok setup guide)
2. Get your ngrok HTTPS URL (e.g., `https://xxxx-xx-xx-xx-xx.ngrok-free.app`)
3. In [Zid Partner Dashboard](https://partner.zid.sa):
   - **Redirection URL**: `https://xxxx-xx-xx-xx-xx.ngrok-free.app/callback`
   - **Callback URL**: `https://xxxx-xx-xx-xx-xx.ngrok-free.app/callback`
4. In `.env.local`, use the ngrok URL:
   ```env
   NEXT_PUBLIC_ZID_REDIRECT_URI=https://xxxx-xx-xx-xx-xx.ngrok-free.app/callback
   ```

#### For Salla:
1. Go to [Salla Partners](https://salla.dev)
2. Select your app
3. Add redirect URI: `http://localhost:3002/callback`
4. Copy **Client ID** and **Client Secret** to `.env.local`

### 4. Restart Dev Server

After updating `.env.local`:
```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

### 5. Verify Environment Variables Are Loaded

Add a temporary log to check (remove after debugging):

```typescript
// In app/callback/route.ts, around line 172
console.log('OAuth Config Check:', {
  platform,
  hasClientId: !!clientId,
  hasClientSecret: !!clientSecret,
  redirectUri,
  clientIdPreview: clientId ? clientId.substring(0, 8) + '...' : 'MISSING'
});
```

## Common Issues

### Issue 1: Environment Variables Not Loading
- **Solution**: Make sure `.env.local` is in the root directory (same level as `package.json`)
- **Solution**: Restart the dev server after changing `.env.local`
- **Solution**: Check for typos in variable names (must match exactly)

### Issue 2: Redirect URI Mismatch
- **Error**: "redirect_uri_mismatch" or "invalid redirect URI"
- **Solution**: The redirect URI in `.env.local` must match **exactly** with what's in the OAuth app dashboard
- **Check**: No trailing slashes, correct protocol (http vs https), correct port

### Issue 3: Zid Requires HTTPS
- **Error**: Zid rejects HTTP redirect URIs
- **Solution**: Use ngrok to get an HTTPS URL for localhost
- **See**: `docs/setup/ngrok-setup.md`

### Issue 4: OAuth App Not Created
- **Error**: "Client does not exist"
- **Solution**: You must create an OAuth app in the platform's developer dashboard first
- **Solution**: Make sure you're using the correct Client ID from the dashboard

### Issue 5: Wrong Platform Selected
- **Check**: Which platform are you trying to connect? (Shopify, Zid, or Salla)
- **Solution**: Make sure the correct environment variables are set for that platform

## Testing Steps

1. ✅ Verify `.env.local` exists and has correct variables
2. ✅ Verify OAuth app exists in platform dashboard
3. ✅ Verify redirect URI matches exactly in both places
4. ✅ Restart dev server
5. ✅ Try connecting a store again
6. ✅ Check browser console and server logs for detailed error messages

## Need Help?

If still not working:
1. Check the browser console for the exact error message
2. Check server logs for OAuth configuration details
3. Verify which platform you're trying to connect
4. Make sure the OAuth app is approved/published (for Zid, apps need approval)

