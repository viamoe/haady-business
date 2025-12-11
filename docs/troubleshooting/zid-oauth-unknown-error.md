# Troubleshooting Zid OAuth "UNKNOWN" Error

## Error
```
https://web.zid.sa/market/app/5716?error_code=UNKNOWN
```

## Common Causes

### 1. Redirect URI Mismatch (Most Common)
The redirect URI in your OAuth request must **match exactly** with what's registered in Zid Partner Dashboard.

**Check:**
- ✅ Redirect URI in `.env.local`: `NEXT_PUBLIC_ZID_REDIRECT_URI`
- ✅ Redirect URI in Zid Partner Dashboard (Redirection URL field)
- ✅ They must match **exactly** (including protocol, domain, path)

**Example:**
```
✅ Correct: https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback
❌ Wrong:   https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback/
❌ Wrong:   http://afton-uncarnivorous-lorinda.ngrok-free.dev/callback
❌ Wrong:   https://afton-uncarnivorous-lorinda.ngrok-free.dev
```

### 2. Invalid Scopes
The scope names might not match what Zid expects.

**Check:**
- Open browser console and look for the logged OAuth URL
- Verify scope names match Zid's API documentation
- Zid might use different naming (e.g., `account.read` instead of `read_account`)

### 3. Client ID Issues
- Verify `NEXT_PUBLIC_ZID_CLIENT_ID` is set correctly
- Make sure the Client ID matches what's in Zid Partner Dashboard
- Check if the app is approved/published in Zid marketplace

### 4. App Not Approved
- If this is a new app, it might need to be approved by Zid first
- Check Zid Partner Dashboard for app status

## Debugging Steps

### Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for the logged OAuth URL
4. Copy the full URL and verify:
   - `client_id` matches your Client ID
   - `redirect_uri` matches your ngrok URL + `/callback`
   - `scope` contains valid scope names

### Step 2: Verify Zid Dashboard Settings
1. Go to Zid Partner Dashboard
2. Navigate to your app settings
3. Check:
   - **Redirection URL**: Must match `NEXT_PUBLIC_ZID_REDIRECT_URI` exactly
   - **Callback URL**: Must match `NEXT_PUBLIC_ZID_REDIRECT_URI` exactly
   - **Client ID**: Must match `NEXT_PUBLIC_ZID_CLIENT_ID`

### Step 3: Test Redirect URI
Visit this URL to test if your callback route is accessible:
```
https://afton-uncarnivorous-lorinda.ngrok-free.dev/api/test-callback
```

If this doesn't work, ngrok might not be running or the URL changed.

### Step 4: Check Scope Names
Zid might use different scope naming. Common formats:
- `read_account` vs `account.read`
- `read_products` vs `products.read`
- Space-separated vs comma-separated

Check Zid's API documentation for the exact scope names.

## Quick Fix Checklist

- [ ] Ngrok is running and URL is: `https://afton-uncarnivorous-lorinda.ngrok-free.dev`
- [ ] `.env.local` has: `NEXT_PUBLIC_ZID_REDIRECT_URI=https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback`
- [ ] Zid Dashboard Redirection URL: `https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback`
- [ ] Zid Dashboard Callback URL: `https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback`
- [ ] URLs match exactly (no trailing slashes, same protocol)
- [ ] Dev server restarted after updating `.env.local`
- [ ] Client ID matches in both places

## Still Not Working?

1. Check Zid Partner Dashboard for any error messages
2. Contact Zid support with:
   - Your app ID
   - The OAuth URL being generated (from console)
   - Screenshot of your redirect URI settings
3. Verify your app is approved/published in Zid marketplace

