# Shopify Integration Guide

## Overview

Shopify integration has been implemented following the same pattern as Salla and Zid integrations. This allows users to connect their Shopify stores to Haady Business.

## Implementation Details

### 1. OAuth Flow

Shopify uses a shop-specific OAuth flow:
- **Authorization Endpoint**: `https://{shop}.myshopify.com/admin/oauth/authorize`
- **Token Endpoint**: `https://{shop}.myshopify.com/admin/oauth/access_token`
- **Store Info Endpoint**: `https://{shop}.myshopify.com/admin/api/2024-01/shop.json`

**Note**: The shop domain (e.g., `mystore`) is required and is collected from the user during OAuth initiation.

### 2. Required Environment Variables

Add these to your `.env.local` file:

```env
# Shopify OAuth Credentials
NEXT_PUBLIC_SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
NEXT_PUBLIC_SHOPIFY_REDIRECT_URI=http://localhost:3002/callback
```

For production, update `NEXT_PUBLIC_SHOPIFY_REDIRECT_URI` to your production callback URL.

### 3. OAuth Scopes

The following scopes are requested (comma-separated):

- `read_products` - Read product information
- `write_products` - Modify products
- `read_orders` - Read order information
- `write_orders` - Modify orders
- `read_inventory` - Read inventory levels
- `write_inventory` - Modify inventory levels
- `read_customers` - Read customer information
- `read_content` - Read store content
- `read_themes` - Read theme information
- `read_script_tags` - Read script tags
- `write_script_tags` - Modify script tags
- `read_fulfillments` - Read fulfillment information
- `write_fulfillments` - Modify fulfillments
- `read_shipping` - Read shipping settings
- `read_checkouts` - Read checkout information
- `read_reports` - Read reports
- `read_price_rules` - Read discount rules
- `write_price_rules` - Modify discount rules

**Note**: You can customize these scopes based on your app's needs. Request only the permissions you actually need.

### 4. Files Modified

#### `app/callback/route.ts`
- Updated to handle Shopify OAuth callbacks
- Extracts shop domain from state parameter (format: `userId:shopify:shopDomain`)
- Supports Shopify-specific API endpoints and response structures
- Handles Shopify token exchange (form-encoded, no `grant_type` parameter)

#### `app/dashboard/layout.tsx`
- Added `handleShopifyClick()` function for Shopify OAuth initiation
- Prompts user for shop domain (can be improved with a proper input modal)
- Updated `handlePlatformSelect()` to route Shopify clicks to the handler

#### `components/app-sidebar.tsx`
- Already includes Shopify in `getPlatformName()` function
- Shopify logo is already configured

### 5. How It Works

1. **User clicks "Shopify" in platform selector**
   - `handleShopifyClick()` is triggered
   - User is prompted to enter their Shopify store domain (e.g., `mystore` or `mystore.myshopify.com`)
   - Constructs OAuth URL with user ID, platform, and shop domain in state
   - Redirects to Shopify authorization page: `https://{shop}.myshopify.com/admin/oauth/authorize`

2. **User authorizes on Shopify**
   - Shopify redirects back to `/callback` with authorization code
   - State parameter includes user ID, platform, and shop: `userId:shopify:shopDomain`

3. **Callback processing**
   - Extracts platform and shop domain from state
   - Exchanges code for access token using Shopify token endpoint
   - Fetches store information from Shopify API
   - Saves connection to database with `platform='shopify'`

4. **Store connection saved**
   - Multiple Shopify stores per user are supported
   - Store name, domain, and external ID are saved
   - Access token is stored securely (Shopify doesn't provide refresh tokens for OAuth apps)

### 6. Shopify App Setup

To create a Shopify app:

1. **Go to Shopify Partner Dashboard**
   - Visit [partners.shopify.com](https://partners.shopify.com)
   - Create a partner account if you don't have one
   - Create a new app

2. **Configure OAuth Settings**
   - Set **App URL**: Your app's main URL
   - Set **Allowed redirection URL(s)**: Your callback URL
     - Development: `http://localhost:3002/callback`
     - Production: `https://yourdomain.com/callback`

3. **Configure API Scopes**
   - Select the scopes your app needs
   - The scopes listed above are recommended for full functionality

4. **Get Credentials**
   - Copy your **Client ID** (API key)
   - Copy your **Client Secret** (API secret key)
   - Add them to your `.env.local` file

### 7. Testing

To test Shopify integration:

1. Ensure environment variables are set
2. Create a Shopify app in Partner Dashboard
3. Get your Client ID and Client Secret
4. Set the redirect URI in Shopify app settings
5. Create a development store (or use an existing one)
6. Click "Add Store" in dashboard
7. Select "Shopify" platform
8. Enter your shop domain when prompted
9. Complete OAuth flow

### 8. API Response Structure

Shopify API returns store info in this structure:
```json
{
  "shop": {
    "id": 123456789,
    "name": "My Store",
    "domain": "mystore.myshopify.com",
    "myshopify_domain": "mystore.myshopify.com",
    "email": "store@example.com",
    "shop_owner": "Store Owner Name",
    ...
  }
}
```

The callback handler extracts:
- `storeExternalId`: `shop.id`
- `storeName`: `shop.name` or `shop.shop_owner`
- `storeDomain`: `shop.domain` or `shop.myshopify_domain`

### 9. Important Notes

#### Token Management
- Shopify OAuth apps don't provide refresh tokens
- Access tokens don't expire (unless revoked)
- Store tokens securely
- Implement token revocation handling

#### Shop Domain
- Users enter their shop domain (e.g., `mystore`)
- The system automatically appends `.myshopify.com` if needed
- Shop domain is stored in the state parameter for security

#### API Versioning
- Shopify uses API versioning (e.g., `2024-01`)
- Current implementation uses `2024-01`
- Update the API version in `storeInfoEndpoint` as needed
- Check [Shopify API docs](https://shopify.dev/docs/api) for latest version

#### Rate Limits
- Shopify has rate limits (typically 2 requests/second)
- Implement rate limiting and retry logic
- Use webhooks for real-time updates when possible

### 10. Next Steps

- [ ] Improve shop domain input (replace prompt with proper modal)
- [ ] Add Shopify product sync functionality
- [ ] Add Shopify order sync functionality
- [ ] Implement webhook handling for real-time updates
- [ ] Add token refresh/revocation handling
- [ ] Add rate limiting and retry logic
- [ ] Test with actual Shopify store
- [ ] Add error handling for Shopify-specific errors

### 11. Troubleshooting

#### "Invalid shop domain"
- Ensure user enters just the shop name (e.g., `mystore`, not `mystore.myshopify.com`)
- The system will automatically format it correctly

#### "Redirect URI mismatch"
- Ensure the redirect URI in Shopify app settings matches exactly
- Check for trailing slashes, HTTP vs HTTPS, etc.

#### "Invalid client credentials"
- Verify `NEXT_PUBLIC_SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` are set correctly
- Ensure credentials match the Shopify app in Partner Dashboard

#### "Access denied"
- Check that the requested scopes are approved in Shopify app settings
- Some scopes require approval from Shopify

### 12. Resources

- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [Shopify API Reference](https://shopify.dev/docs/api)
- [Shopify Partner Dashboard](https://partners.shopify.com)
- [Shopify App Development Guide](https://shopify.dev/docs/apps)

---

**Note**: Unlike Zid, Shopify doesn't require app review before you can test with your own stores. However, if you want to publish your app to the Shopify App Store, you'll need to go through their review process.

