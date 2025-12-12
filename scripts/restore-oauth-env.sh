#!/bin/bash

# Script to restore OAuth environment variables in Vercel
# This script will prompt you to enter each value

set -e

echo "🔐 Vercel OAuth Environment Variables Restore Script"
echo "======================================================"
echo ""
echo "This script will help you restore OAuth credentials to Vercel."
echo "You'll need to provide the Client IDs and Secrets from:"
echo "  - Shopify Partners: https://partners.shopify.com"
echo "  - Zid Partner: https://partner.zid.sa"
echo "  - Salla Partners: https://salla.dev"
echo ""
read -p "Press Enter to continue..."

# Function to add environment variable
add_env_var() {
    local var_name=$1
    local description=$2
    local default_value=$3
    
    echo ""
    echo "📝 $description"
    if [ -n "$default_value" ]; then
        read -p "Enter value for $var_name [$default_value]: " value
        value=${value:-$default_value}
    else
        read -p "Enter value for $var_name: " value
    fi
    
    if [ -z "$value" ]; then
        echo "⚠️  Skipping $var_name (empty value)"
        return
    fi
    
    echo "Adding $var_name to Vercel..."
    echo "$value" | vercel env add "$var_name" production
    
    # Also add to preview and development
    read -p "Add to Preview and Development environments too? (y/n) [y]: " add_others
    add_others=${add_others:-y}
    
    if [ "$add_others" = "y" ] || [ "$add_others" = "Y" ]; then
        echo "$value" | vercel env add "$var_name" preview
        echo "$value" | vercel env add "$var_name" development
    fi
    
    echo "✅ Added $var_name"
}

# Shopify
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛍️  SHOPIFY OAuth Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
add_env_var "NEXT_PUBLIC_SHOPIFY_CLIENT_ID" "Shopify Client ID (API Key)"
add_env_var "SHOPIFY_CLIENT_SECRET" "Shopify Client Secret (API Secret Key)"
add_env_var "NEXT_PUBLIC_SHOPIFY_REDIRECT_URI" "Shopify Redirect URI" "https://business.haady.app/callback"

# Zid
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ZID OAuth Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
add_env_var "NEXT_PUBLIC_ZID_CLIENT_ID" "Zid Client ID"
add_env_var "ZID_CLIENT_SECRET" "Zid Client Secret"
add_env_var "NEXT_PUBLIC_ZID_REDIRECT_URI" "Zid Redirect URI" "https://business.haady.app/callback"

# Salla
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛒 SALLA OAuth Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
add_env_var "NEXT_PUBLIC_SALLA_CLIENT_ID" "Salla Client ID"
add_env_var "SALLA_CLIENT_SECRET" "Salla Client Secret"
add_env_var "NEXT_PUBLIC_SALLA_REDIRECT_URI" "Salla Redirect URI" "https://business.haady.app/callback"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done! Verifying environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
vercel env ls

echo ""
echo "🎉 All OAuth environment variables have been restored!"
echo ""
echo "Next steps:"
echo "1. Vercel will automatically redeploy your application"
echo "2. Test store connections to verify everything works"
echo "3. If you need to update any values, use: vercel env rm <VAR_NAME> then vercel env add <VAR_NAME>"

