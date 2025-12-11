# Zid OAuth Verification Checklist

## From Your Console Logs

✅ **Client ID**: `5549`
✅ **Redirect URI**: `https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback`
✅ **State**: `b5fa06f1-53f1-46af-a353-7e5d86432a19:zid`

## Verification Steps

### 1. Zid Partner Dashboard - Redirect URI

Go to your Zid app settings and verify:

**Redirection URL must be EXACTLY:**
```
https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback
```

**Callback URL must be EXACTLY:**
```
https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback
```

⚠️ **Check for:**
- No trailing slash (`/callback` not `/callback/`)
- Exact match (copy-paste to avoid typos)
- HTTPS (not HTTP)
- Full path including `/callback`

### 2. Environment Variable

Check your `.env.local` file:
```env
NEXT_PUBLIC_ZID_REDIRECT_URI=https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback
```

### 3. Scope Names Issue

Zid might use different scope naming. The scopes you're using:
```
read_account read_products write_products read_product_inventory_stock write_product_inventory_stock read_orders write_orders read_abandoned_carts read_categories read_inventory write_inventory
```

**Possible alternatives Zid might expect:**
- `account.read` instead of `read_account`
- `products.read` instead of `read_products`
- Comma-separated instead of space-separated
- Different naming entirely

### 4. Test with Minimal Scopes

Try with just one scope first to see if it works:
- `read_account` only
- Or check Zid documentation for the exact scope format

## Quick Test

1. Copy the exact redirect URI from console: `https://afton-uncarnivorous-lorinda.ngrok-free.dev/callback`
2. Go to Zid Partner Dashboard
3. Paste it in both "Redirection URL" and "Callback URL" fields
4. Save
5. Try OAuth again

## If Still Not Working

The issue might be:
1. **⚠️ App Not Approved** - **Most Common Issue**: Zid apps must be reviewed and approved by the Zid team before they can be used in production. 
   - Check your app status in Zid Partner Dashboard
   - If status is "Pending Review" or "Draft", you need to submit for review
   - You can only test with your own Zid store until approved
   - See [Zid Integration Guide](../integrations/zid-integration.md#6-app-review-process) for details
2. **Scope format** - Zid might use different scope names (check their API docs)
3. **Missing parameter** - Zid might require additional OAuth parameters
4. **Redirect URI mismatch** - Double-check exact match (see steps above)

### App Review Status

To check if your app needs approval:
1. Go to [Zid Partner Dashboard](https://partner.zid.sa)
2. Check your app status:
   - ✅ **Published/Approved**: Ready for production use
   - ⏳ **Pending Review**: Waiting for Zid team approval
   - 📝 **Draft**: Not yet submitted for review
   - ❌ **Rejected**: Review feedback provided, needs fixes

If your app is not approved, you'll need to:
- Complete all required app information
- Submit for review in the Partner Dashboard
- Wait for Zid team approval (typically 3-7 business days)

Contact Zid support with:
- Your app ID: `5716`
- Client ID: `5549`
- The OAuth URL from console
- Screenshot of redirect URI settings
- App review status (if applicable)

