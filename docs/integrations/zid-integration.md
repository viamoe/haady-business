# Zid Integration Guide

## Overview
Zid integration has been implemented following the same pattern as Salla integration. This allows users to connect their Zid stores to Haady Business.

## Implementation Details

### 1. OAuth Flow
- **Authorization Endpoint**: `https://oauth.zid.sa/oauth/authorize`
- **Token Endpoint**: `https://oauth.zid.sa/oauth/token`
- **Store Info Endpoint**: `https://api.zid.sa/managers/store/v1`

### 2. Required Environment Variables
Add these to your `.env.local` file:

```env
# Zid OAuth Credentials
NEXT_PUBLIC_ZID_CLIENT_ID=your_zid_client_id
ZID_CLIENT_SECRET=your_zid_client_secret
NEXT_PUBLIC_ZID_REDIRECT_URI=http://localhost:3002/callback
```

For production, update `NEXT_PUBLIC_ZID_REDIRECT_URI` to your production callback URL.

### 3. OAuth Scopes
The following scopes are requested:
- `read_products` - Read product information
- `write_products` - Modify products
- `read_orders` - Read order information
- `write_orders` - Modify orders
- `read_store` - Read store information
- `write_store` - Modify store settings

### 4. Files Modified

#### `app/callback/route.ts`
- Updated to handle both Salla and Zid OAuth callbacks
- Platform is detected from state parameter or query string
- Supports Zid-specific API endpoints and response structures

#### `app/dashboard/layout.tsx`
- Added `handleZidClick()` function for Zid OAuth initiation
- Updated `handlePlatformSelect()` to route Zid clicks to the handler

#### `components/app-sidebar.tsx`
- Already includes Zid in `getPlatformName()` function

### 5. How It Works

1. **User clicks "Zid" in platform selector**
   - `handleZidClick()` is triggered
   - Constructs OAuth URL with user ID and platform in state
   - Redirects to Zid authorization page

2. **User authorizes on Zid**
   - Zid redirects back to `/callback` with authorization code
   - State parameter includes user ID and platform: `userId:zid`

3. **Callback processing**
   - Extracts platform from state
   - Exchanges code for access token using Zid token endpoint
   - Fetches store information from Zid API
   - Saves connection to database with platform='zid'

4. **Store connection saved**
   - Multiple Zid stores per user are supported
   - Store name, domain, and external ID are saved
   - Access and refresh tokens are stored securely

### 6. App Review Process

⚠️ **Important**: Zid apps must be reviewed and approved by the Zid team before they can be published and used in production.

📖 **For detailed information, see**: [Zid App Review Process Guide](./zid-app-review.md)

#### Before Submission

1. **Complete App Setup**:
   - Register your app in [Zid Partner Dashboard](https://partner.zid.sa)
   - Fill out all required app information
   - Set up correct redirect URIs (both development and production)
   - Configure OAuth scopes

2. **Test Thoroughly**:
   - Test OAuth flow in development environment
   - Verify all API endpoints work correctly
   - Ensure error handling is robust
   - Test with actual Zid stores (if possible in sandbox mode)

3. **Prepare Documentation**:
   - App description and purpose
   - List of requested scopes and why they're needed
   - Privacy policy and terms of service
   - App screenshots or demo video

#### Submission Process

1. **Submit for Review**:
   - Go to Zid Partner Dashboard
   - Click "Submit for Review" or "Request Approval"
   - Provide all required information
   - Wait for Zid team review (typically 3-7 business days)

2. **During Review**:
   - Zid team will verify:
     - App functionality and security
     - OAuth implementation correctness
     - Scope requirements justification
     - Redirect URI configuration
     - App compliance with Zid policies

3. **After Approval**:
   - You'll receive notification from Zid
   - App status will change to "Published" or "Approved"
   - OAuth flow will work for all Zid merchants
   - You can start onboarding users

#### Common Rejection Reasons

- Missing or incorrect redirect URIs
- Requesting unnecessary scopes
- Security vulnerabilities
- Incomplete app information
- Non-compliance with Zid policies

#### Development vs Production

- **Development**: You can test with your own Zid store without approval
- **Production**: Requires Zid team approval before other merchants can use your app

### 7. Testing

To test Zid integration (before approval):

1. Ensure environment variables are set
2. Register your app in Zid Partner Dashboard
3. Get your Client ID and Client Secret
4. Set the redirect URI in Zid app settings
5. **Note**: You can only test with your own Zid store until approved
6. Click "Add Store" in dashboard
7. Select "Zid" platform
8. Complete OAuth flow

### 8. Next Steps

- [ ] Add Zid product sync functionality (similar to `lib/sync/salla-products.ts`)
- [ ] Add Zid order sync functionality
- [ ] Update refresh token logic for Zid
- [ ] Add Zid-specific error handling
- [ ] Test with actual Zid store

### 9. API Response Structure

Zid API may return store info in different structures:
- `{ result: { id, name, domain, ... } }`
- `{ data: { id, name, domain, ... } }`
- `{ id, name, domain, ... }`

The callback handler tries all three structures to extract store information.

### 10. Notes

- Zid requires `X-Request-ID` and `X-API-KEY` headers for some endpoints
- Store info endpoint may vary - verify with Zid documentation
- Token refresh flow may need Zid-specific implementation

