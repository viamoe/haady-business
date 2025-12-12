# Manual OAuth Environment Variables Setup

Run these commands one by one in the `haady-business` directory.

## Shopify OAuth Variables

### Production Environment
```bash
vercel env add NEXT_PUBLIC_SHOPIFY_CLIENT_ID production
# When prompted, paste your Shopify Client ID and press Enter

vercel env add SHOPIFY_CLIENT_SECRET production
# When prompted, paste your Shopify Client Secret and press Enter

vercel env add NEXT_PUBLIC_SHOPIFY_REDIRECT_URI production
# When prompted, type: https://business.haady.app/callback and press Enter
```

### Preview Environment
```bash
vercel env add NEXT_PUBLIC_SHOPIFY_CLIENT_ID preview
# When prompted, paste your Shopify Client ID and press Enter

vercel env add SHOPIFY_CLIENT_SECRET preview
# When prompted, paste your Shopify Client Secret and press Enter

vercel env add NEXT_PUBLIC_SHOPIFY_REDIRECT_URI preview
# When prompted, type: https://business.haady.app/callback and press Enter
```

### Development Environment
```bash
vercel env add NEXT_PUBLIC_SHOPIFY_CLIENT_ID development
# When prompted, paste your Shopify Client ID and press Enter

vercel env add SHOPIFY_CLIENT_SECRET development
# When prompted, paste your Shopify Client Secret and press Enter

vercel env add NEXT_PUBLIC_SHOPIFY_REDIRECT_URI development
# When prompted, type: https://business.haady.app/callback and press Enter
```

## Zid OAuth Variables

### Production Environment
```bash
vercel env add NEXT_PUBLIC_ZID_CLIENT_ID production
# When prompted, paste your Zid Client ID and press Enter

vercel env add ZID_CLIENT_SECRET production
# When prompted, paste your Zid Client Secret and press Enter

vercel env add NEXT_PUBLIC_ZID_REDIRECT_URI production
# When prompted, type: https://business.haady.app/callback and press Enter
```

### Preview Environment
```bash
vercel env add NEXT_PUBLIC_ZID_CLIENT_ID preview
# When prompted, paste your Zid Client ID and press Enter

vercel env add ZID_CLIENT_SECRET preview
# When prompted, paste your Zid Client Secret and press Enter

vercel env add NEXT_PUBLIC_ZID_REDIRECT_URI preview
# When prompted, type: https://business.haady.app/callback and press Enter
```

### Development Environment
```bash
vercel env add NEXT_PUBLIC_ZID_CLIENT_ID development
# When prompted, paste your Zid Client ID and press Enter

vercel env add ZID_CLIENT_SECRET development
# When prompted, paste your Zid Client Secret and press Enter

vercel env add NEXT_PUBLIC_ZID_REDIRECT_URI development
# When prompted, type: https://business.haady.app/callback and press Enter
```

## Salla OAuth Variables

### Production Environment
```bash
vercel env add NEXT_PUBLIC_SALLA_CLIENT_ID production
# When prompted, paste your Salla Client ID and press Enter

vercel env add SALLA_CLIENT_SECRET production
# When prompted, paste your Salla Client Secret and press Enter

vercel env add NEXT_PUBLIC_SALLA_REDIRECT_URI production
# When prompted, type: https://business.haady.app/callback and press Enter
```

### Preview Environment
```bash
vercel env add NEXT_PUBLIC_SALLA_CLIENT_ID preview
# When prompted, paste your Salla Client ID and press Enter

vercel env add SALLA_CLIENT_SECRET preview
# When prompted, paste your Salla Client Secret and press Enter

vercel env add NEXT_PUBLIC_SALLA_REDIRECT_URI preview
# When prompted, type: https://business.haady.app/callback and press Enter
```

### Development Environment
```bash
vercel env add NEXT_PUBLIC_SALLA_CLIENT_ID development
# When prompted, paste your Salla Client ID and press Enter

vercel env add SALLA_CLIENT_SECRET development
# When prompted, paste your Salla Client Secret and press Enter

vercel env add NEXT_PUBLIC_SALLA_REDIRECT_URI development
# When prompted, type: https://business.haady.app/callback and press Enter
```

## Quick Copy-Paste Commands (Production Only)

If you only want to add to Production environment:

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

## Verify Variables

After adding all variables, verify they're set:

```bash
vercel env ls
```

You should see all the OAuth variables listed.

## Notes

- **Redirect URI**: Always use `https://business.haady.app/callback` for production/preview
- **Client Secrets**: These are sensitive - never commit them to git
- **If variable exists**: Use `vercel env rm <VAR_NAME> <ENV> --yes` to remove first, then add again

