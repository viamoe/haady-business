# Redirect URI Mismatch Error

## Error Message
```
The 'redirect_uri' parameter does not match any of the OAuth 2.0 Client's pre-registered redirect urls.
```

## Problem
The redirect URI sent in the OAuth request doesn't match what's registered in the OAuth provider's dashboard.

## Solution

### Step 1: Check What Redirect URI Is Being Sent

**For Production:**
1. Open browser console (F12)
2. Click "Add Store" and select a platform
3. Look for console logs showing the redirect URI
4. It should show: `https://business.haady.app/callback`

**For Localhost:**
1. Check your `.env.local` file in `haady-business` directory
2. Make sure you have:
   ```env
   NEXT_PUBLIC_SHOPIFY_REDIRECT_URI=http://localhost:3002/callback
   NEXT_PUBLIC_ZID_REDIRECT_URI=http://localhost:3002/callback
   NEXT_PUBLIC_SALLA_REDIRECT_URI=http://localhost:3002/callback
   ```
3. Restart your dev server after changing `.env.local`

### Step 2: Register Redirect URIs in OAuth Provider Dashboards

You need to add **BOTH** redirect URIs to each OAuth provider:

#### Shopify
1. Go to [Shopify Partners](https://partners.shopify.com)
2. Select your app
3. Go to **App setup** → **Allowed redirection URL(s)**
4. Add **both** of these URLs (one per line):
   ```
   https://business.haady.app/callback
   http://localhost:3002/callback
   ```
5. Click **Save**

#### Zid
⚠️ **Important**: Zid requires HTTPS, so for localhost you need ngrok.

**For Production:**
1. Go to [Zid Partner Dashboard](https://partner.zid.sa)
2. Select your app
3. Add redirect URI: `https://business.haady.app/callback`

**For Localhost (requires ngrok):**
1. Start ngrok: `ngrok http 3002`
2. Copy your ngrok HTTPS URL (e.g., `https://xxxx-xx-xx-xx-xx.ngrok-free.app`)
3. In Zid Partner Dashboard, add: `https://xxxx-xx-xx-xx-xx.ngrok-free.app/callback`
4. In `.env.local`, set:
   ```env
   NEXT_PUBLIC_ZID_REDIRECT_URI=https://xxxx-xx-xx-xx-xx.ngrok-free.app/callback
   ```

#### Salla
1. Go to [Salla Partners](https://salla.dev)
2. Select your app
3. Add **both** redirect URIs:
   - `https://business.haady.app/callback`
   - `http://localhost:3002/callback`

### Step 3: Verify Environment Variables

**In Vercel (Production):**
- `NEXT_PUBLIC_SHOPIFY_REDIRECT_URI` = `https://business.haady.app/callback`
- `NEXT_PUBLIC_ZID_REDIRECT_URI` = `https://business.haady.app/callback`
- `NEXT_PUBLIC_SALLA_REDIRECT_URI` = `https://business.haady.app/callback`

**In `.env.local` (Localhost):**
- `NEXT_PUBLIC_SHOPIFY_REDIRECT_URI` = `http://localhost:3002/callback`
- `NEXT_PUBLIC_ZID_REDIRECT_URI` = `https://your-ngrok-url.ngrok-free.app/callback` (or use ngrok)
- `NEXT_PUBLIC_SALLA_REDIRECT_URI` = `http://localhost:3002/callback`

### Step 4: Common Issues

#### Issue 1: Trailing Slash
❌ Wrong: `https://business.haady.app/callback/`
✅ Correct: `https://business.haady.app/callback`

#### Issue 2: Wrong Protocol
❌ Wrong: `http://business.haady.app/callback` (production should be HTTPS)
✅ Correct: `https://business.haady.app/callback`

#### Issue 3: Wrong Port
❌ Wrong: `http://localhost:3000/callback`
✅ Correct: `http://localhost:3002/callback` (check your dev server port)

#### Issue 4: Missing in OAuth Dashboard
The redirect URI must be **exactly** the same in:
- Your environment variable
- The OAuth provider's dashboard
- The URL being sent in the OAuth request

### Step 5: Debug Checklist

- [ ] Check browser console for the redirect URI being sent
- [ ] Verify redirect URI in `.env.local` (localhost) or Vercel (production)
- [ ] Confirm redirect URI is registered in OAuth provider dashboard
- [ ] Ensure no trailing slashes
- [ ] Check protocol (http vs https)
- [ ] Verify port number (localhost)
- [ ] Restart dev server after changing `.env.local`
- [ ] Clear browser cache and cookies

### Step 6: Test

1. **Production**: Try connecting a store on `https://business.haady.app`
2. **Localhost**: Try connecting a store on `http://localhost:3002`
3. Check browser console for any redirect URI logs
4. If error persists, compare the exact redirect URI in console with what's in the OAuth dashboard

## Still Not Working?

1. Check the browser console logs - they show the exact redirect URI being sent
2. Compare it character-by-character with what's in the OAuth provider dashboard
3. Make sure there are no extra spaces, special characters, or encoding issues
4. Some OAuth providers are case-sensitive - ensure exact match

