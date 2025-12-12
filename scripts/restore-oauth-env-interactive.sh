#!/bin/bash

# Interactive restore script - prompts for each variable individually
# This avoids issues with piping secrets to vercel env add

set -e

echo "🔐 Interactive OAuth Environment Variables Restore"
echo "=================================================="
echo ""
echo "This script will prompt you to add each variable one by one."
echo "You'll paste the value when vercel prompts for it."
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Default redirect URI
REDIRECT_URI="https://business.haady.app/callback"

# Function to add env var interactively
add_env_interactive() {
    local var_name=$1
    local description=$2
    local default_value=$3
    local env=$4
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 $description"
    echo "   Variable: $var_name"
    echo "   Environment: $env"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -n "$default_value" ]; then
        echo "Default value: $default_value"
        read -p "Press Enter to use default, or type a different value: " custom_value
        if [ -z "$custom_value" ]; then
            echo "Using default value: $default_value"
            printf '%s\n' "$default_value" | vercel env add "$var_name" "$env"
        else
            printf '%s\n' "$custom_value" | vercel env add "$var_name" "$env"
        fi
    else
        echo "When prompted by Vercel, paste your value and press Enter:"
        vercel env add "$var_name" "$env"
    fi
    
    echo "✅ Added $var_name to $env"
}

# Ask which environments
echo "Which environments do you want to add variables to?"
echo "1) Production only"
echo "2) Production + Preview + Development"
read -p "Select option [1]: " env_option
env_option=${env_option:-1}

if [ "$env_option" = "2" ]; then
    ENVIRONMENTS=("production" "preview" "development")
else
    ENVIRONMENTS=("production")
fi

# Shopify
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛍️  SHOPIFY OAuth Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for env in "${ENVIRONMENTS[@]}"; do
    add_env_interactive "NEXT_PUBLIC_SHOPIFY_CLIENT_ID" "Shopify Client ID (API Key)" "" "$env"
    add_env_interactive "SHOPIFY_CLIENT_SECRET" "Shopify Client Secret (API Secret Key)" "" "$env"
    add_env_interactive "NEXT_PUBLIC_SHOPIFY_REDIRECT_URI" "Shopify Redirect URI" "$REDIRECT_URI" "$env"
done

# Zid
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ZID OAuth Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for env in "${ENVIRONMENTS[@]}"; do
    add_env_interactive "NEXT_PUBLIC_ZID_CLIENT_ID" "Zid Client ID" "" "$env"
    add_env_interactive "ZID_CLIENT_SECRET" "Zid Client Secret" "" "$env"
    add_env_interactive "NEXT_PUBLIC_ZID_REDIRECT_URI" "Zid Redirect URI" "$REDIRECT_URI" "$env"
done

# Salla
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛒 SALLA OAuth Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for env in "${ENVIRONMENTS[@]}"; do
    add_env_interactive "NEXT_PUBLIC_SALLA_CLIENT_ID" "Salla Client ID" "" "$env"
    add_env_interactive "SALLA_CLIENT_SECRET" "Salla Client Secret" "" "$env"
    add_env_interactive "NEXT_PUBLIC_SALLA_REDIRECT_URI" "Salla Redirect URI" "$REDIRECT_URI" "$env"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done! Verifying environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
vercel env ls | grep -E "SHOPIFY|ZID|SALLA" || echo "Run 'vercel env ls' to see all variables"

echo ""
echo "🎉 All OAuth environment variables have been restored!"
echo ""
echo "Next steps:"
echo "1. Vercel will automatically redeploy your application"
echo "2. Test store connections to verify everything works"

