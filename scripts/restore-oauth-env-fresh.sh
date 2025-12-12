#!/bin/bash

# Fresh restore script - removes existing OAuth vars and adds them fresh
# Usage: ./restore-oauth-env-fresh.sh

set -e

echo "🔄 Fresh OAuth Environment Variables Restore"
echo "=============================================="
echo ""
echo "This script will:"
echo "1. Remove existing OAuth environment variables (if they exist)"
echo "2. Add them fresh with new values"
echo ""
read -p "Continue? (y/n) [y]: " confirm
confirm=${confirm:-y}

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# List of OAuth variables to remove/add
OAUTH_VARS=(
    "NEXT_PUBLIC_SHOPIFY_CLIENT_ID"
    "SHOPIFY_CLIENT_SECRET"
    "NEXT_PUBLIC_SHOPIFY_REDIRECT_URI"
    "NEXT_PUBLIC_ZID_CLIENT_ID"
    "ZID_CLIENT_SECRET"
    "NEXT_PUBLIC_ZID_REDIRECT_URI"
    "NEXT_PUBLIC_SALLA_CLIENT_ID"
    "SALLA_CLIENT_SECRET"
    "NEXT_PUBLIC_SALLA_REDIRECT_URI"
)

ENVIRONMENTS=("production" "preview" "development")

# Step 1: Remove existing variables
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗑️  Removing existing OAuth variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for var in "${OAUTH_VARS[@]}"; do
    for env in "${ENVIRONMENTS[@]}"; do
        echo -n "Removing $var from $env... "
        if vercel env rm "$var" "$env" --yes 2>/dev/null; then
            echo "✅ Removed"
        else
            echo "ℹ️  Not found (already removed or never existed)"
        fi
    done
done

echo ""
echo "✅ Cleanup complete!"
echo ""

# Step 2: Get new values from user
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Enter OAuth credentials:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Shopify Client ID: " SHOPIFY_CLIENT_ID
read -sp "Shopify Client Secret: " SHOPIFY_CLIENT_SECRET
echo ""
read -p "Zid Client ID: " ZID_CLIENT_ID
read -sp "Zid Client Secret: " ZID_CLIENT_SECRET
echo ""
read -p "Salla Client ID: " SALLA_CLIENT_ID
read -sp "Salla Client Secret: " SALLA_CLIENT_SECRET
echo ""

# Default redirect URI
REDIRECT_URI="https://business.haady.app/callback"

# Step 3: Add variables
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "➕ Adding OAuth variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to add env var
add_env() {
    local var_name=$1
    local value=$2
    local env=$3
    
    if [ -z "$value" ]; then
        echo "⚠️  Skipping $var_name (no value provided)"
        return
    fi
    
    echo -n "Adding $var_name to $env... "
    if printf '%s\n' "$value" | timeout 30 vercel env add "$var_name" "$env" >/dev/null 2>&1; then
        echo "✅ Added"
    else
        echo "❌ Failed (might need manual intervention)"
    fi
}

# Ask which environments
echo ""
echo "Which environments do you want to add variables to?"
echo "1) Production only"
echo "2) Production + Preview + Development"
read -p "Select option [2]: " env_option
env_option=${env_option:-2}

if [ "$env_option" = "1" ]; then
    ENVIRONMENTS=("production")
else
    ENVIRONMENTS=("production" "preview" "development")
fi

# Add Shopify variables
echo ""
echo "🛍️  Adding Shopify variables..."
for env in "${ENVIRONMENTS[@]}"; do
    add_env "NEXT_PUBLIC_SHOPIFY_CLIENT_ID" "$SHOPIFY_CLIENT_ID" "$env"
    add_env "SHOPIFY_CLIENT_SECRET" "$SHOPIFY_CLIENT_SECRET" "$env"
    add_env "NEXT_PUBLIC_SHOPIFY_REDIRECT_URI" "$REDIRECT_URI" "$env"
done

# Add Zid variables
echo ""
echo "📦 Adding Zid variables..."
for env in "${ENVIRONMENTS[@]}"; do
    add_env "NEXT_PUBLIC_ZID_CLIENT_ID" "$ZID_CLIENT_ID" "$env"
    add_env "ZID_CLIENT_SECRET" "$ZID_CLIENT_SECRET" "$env"
    add_env "NEXT_PUBLIC_ZID_REDIRECT_URI" "$REDIRECT_URI" "$env"
done

# Add Salla variables
echo ""
echo "🛒 Adding Salla variables..."
for env in "${ENVIRONMENTS[@]}"; do
    add_env "NEXT_PUBLIC_SALLA_CLIENT_ID" "$SALLA_CLIENT_ID" "$env"
    add_env "SALLA_CLIENT_SECRET" "$SALLA_CLIENT_SECRET" "$env"
    add_env "NEXT_PUBLIC_SALLA_REDIRECT_URI" "$REDIRECT_URI" "$env"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done! Verifying environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
vercel env ls | grep -E "SHOPIFY|ZID|SALLA" || echo "Run 'vercel env ls' to see all variables"

echo ""
echo "🎉 OAuth environment variables restored!"
echo ""
echo "Next steps:"
echo "1. Vercel will automatically redeploy your application"
echo "2. Test store connections to verify everything works"

