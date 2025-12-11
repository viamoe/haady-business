# Shopify Integration Setup Guide

## Quick Answer: No CLI Needed! ✅

You **do NOT need Shopify CLI** for this integration. We're using **OAuth-based integration**, which is perfect for external apps like Haady Business.

## What You Need

### 1. Shopify Partner Account
- Go to [partners.shopify.com](https://partners.shopify.com)
- Sign up for a free Partner account
- No credit card required

### 2. Create a Shopify App

1. **Go to Apps section** in Partner Dashboard
2. **Click "Create app"**
3. **Choose "Custom app"** (not "Public app" - that's for App Store)
4. **Fill in app details:**
   - App name: "Haady Business" (or your choice)
   - App URL: Your app's main URL (can be localhost for testing)
   - Allowed redirection URL(s): 
     - Development: `http://localhost:3002/callback`
     - Production: `https://yourdomain.com/callback`

### 3. Configure API Scopes

In your app settings, configure the scopes you need:

**Recommended scopes:**
- ✅ Read products
- ✅ Write products
- ✅ Read orders
- ✅ Write orders
- ✅ Read inventory
- ✅ Write inventory
- ✅ Read customers
- ✅ Read content
- ✅ Read themes
- ✅ Read script tags
- ✅ Write script tags
- ✅ Read fulfillments
- ✅ Write fulfillments
- ✅ Read shipping
- ✅ Read checkouts
- ✅ Read reports
- ✅ Read price rules
- ✅ Write price rules

### 4. Get Your Credentials

After creating the app, you'll see:
- **Client ID** (API key)
- **Client Secret** (API secret key)

### 5. Add to Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_SHOPIFY_REDIRECT_URI=http://localhost:3002/callback
```

### 6. Test the Integration

1. Start your Next.js app
2. Go to dashboard
3. Click "Add Store"
4. Select "Shopify"
5. Enter your shop domain (e.g., `mystore` or `mystore.myshopify.com`)
6. Complete OAuth flow

## When Would You Need Shopify CLI?

You would **only** need Shopify CLI if you were building:

- **Embedded Shopify Apps** - Apps that run inside Shopify admin
- **Shopify App Bridge Apps** - Apps that use Shopify's UI framework
- **Apps hosted on Shopify infrastructure**

Since Haady Business is an **external platform** connecting to Shopify stores, OAuth is the correct approach.

## Differences

| Feature | OAuth Integration (What We Use) | Shopify CLI Apps |
|--------|----------------------------------|------------------|
| **Type** | External app | Embedded app |
| **Location** | Runs on your servers | Runs in Shopify admin |
| **Setup** | Partner Dashboard + OAuth | CLI + App Bridge |
| **Use Case** | Multi-platform tools | Shopify-specific apps |
| **CLI Required?** | ❌ No | ✅ Yes |

## Troubleshooting

### "Invalid redirect URI"
- Make sure the redirect URI in your app settings matches exactly
- Check for trailing slashes, HTTP vs HTTPS
- For localhost, use `http://localhost:3002/callback` (not `https://`)

### "Invalid client credentials"
- Verify your Client ID and Client Secret are correct
- Make sure they're from the same app in Partner Dashboard

### "Access denied"
- Check that the scopes you're requesting are enabled in app settings
- Some scopes require approval

## Next Steps

1. ✅ Create Partner account
2. ✅ Create app in Partner Dashboard
3. ✅ Configure redirect URI
4. ✅ Set environment variables
5. ✅ Test OAuth flow
6. 🚀 Start syncing products and orders!

---

**Remember**: No CLI needed! Just Partner Dashboard + OAuth. 🎉

