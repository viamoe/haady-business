# Supabase OAuth Configuration for Business App

## Problem
Supabase OAuth redirects to the Site URL instead of the `redirectTo` parameter, even when the redirect URL is in the allowed list.

## Solution

### 1. Update Site URL in Supabase Dashboard

**Important**: The Site URL in Supabase Dashboard must match your business app domain.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Set **Site URL** to:
   ```
   https://business.haady.app
   ```
   (or `http://localhost:3002` for local development)

### 2. Add Redirect URLs

In the same **URL Configuration** page, add these to **Redirect URLs**:

**Production:**
```
https://business.haady.app/auth/callback
```

**Development:**
```
http://localhost:3002/auth/callback
```

**Preview Deployments (Vercel):**
```
https://haady-business-git-develop-haady.vercel.app/auth/callback
```

**Important Notes:**
- The redirect URL must match **EXACTLY** (including protocol, domain, and path)
- No trailing slashes
- Must include the full path `/auth/callback`
- **For Preview Deployments**: You'll need to add each preview URL individually as Vercel creates them
  - Pattern: `https://haady-business-git-{branch}-{team}.vercel.app/auth/callback`
  - Or: `https://haady-business-{hash}.vercel.app/auth/callback`
  - Supabase doesn't support wildcards, so add each preview URL as needed

### 3. Verify Configuration

After updating:
1. Clear your browser cache and cookies
2. Try the OAuth flow again
3. Check the browser console for the logged redirect URL
4. Verify it matches what's in Supabase Dashboard

### 4. If Still Redirecting to Site URL

If Supabase still redirects to `haady.app` instead of `business.haady.app`:

**Option A: Separate Supabase Projects**
- Use a separate Supabase project for `business.haady.app`
- Set the Site URL to `https://business.haady.app`

**Option B: Cookie-Based Fallback (Already Implemented)**
- The app already has a cookie-based fallback mechanism
- When OAuth starts from `business.haady.app`, a cookie is set
- If Supabase redirects to `haady.app`, the `haady-app` callback reads the cookie and redirects back to `business.haady.app/auth/callback`
- This should work automatically, but verify the cookie is being set correctly

### 5. Testing

1. Open browser DevTools → Console
2. Click "Sign in with Google"
3. Check the console logs:
   ```
   🔵 OAuth Configuration:
     Base redirect URL: https://business.haady.app/auth/callback
     Full redirect URL: https://business.haady.app/auth/callback?app_type=merchant&...
   ```
4. After Google auth, check which URL you're redirected to
5. If redirected to `haady.app`, the cookie fallback should redirect you to `business.haady.app`

## Troubleshooting

### Issue: Still redirecting to haady.app

**Check:**
1. Site URL in Supabase is set to `https://business.haady.app`
2. Redirect URL `https://business.haady.app/auth/callback` is in the allowed list
3. The redirect URL in code matches exactly (check console logs)
4. Cookie `haady_oauth_origin` is being set (check Application → Cookies in DevTools)

### Issue: Cookie not working

**Check:**
1. Cookie domain is set to `.haady.app` (check in DevTools)
2. Cookie is set before OAuth redirect
3. `haady-app/app/auth/callback/route.ts` is reading the cookie correctly

### Issue: 404 on callback

**Check:**
1. The route `app/auth/callback/route.ts` exists
2. The URL path is exactly `/auth/callback` (not `/auth/callback/`)
3. Next.js routing is configured correctly

