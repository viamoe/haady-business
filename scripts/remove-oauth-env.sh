#!/bin/bash

# Quick script to remove all OAuth environment variables
# Usage: ./remove-oauth-env.sh

set -e

echo "🗑️  Remove OAuth Environment Variables"
echo "======================================"
echo ""
echo "This will remove all OAuth variables from all environments."
echo ""
read -p "Are you sure? (y/n) [n]: " confirm
confirm=${confirm:-n}

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# List of OAuth variables
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

echo ""
echo "Removing OAuth variables..."

for var in "${OAUTH_VARS[@]}"; do
    for env in "${ENVIRONMENTS[@]}"; do
        echo -n "Removing $var from $env... "
        if vercel env rm "$var" "$env" --yes 2>/dev/null; then
            echo "✅ Removed"
        else
            echo "ℹ️  Not found"
        fi
    done
done

echo ""
echo "✅ Done! All OAuth variables removed."

