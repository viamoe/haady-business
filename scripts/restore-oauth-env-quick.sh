#!/bin/bash

# Quick restore script - adds all variables at once
# Usage: ./restore-oauth-env-quick.sh

set -e

echo "🚀 Quick OAuth Environment Variables Restore"
echo "============================================="
echo ""
echo "This will add all OAuth variables with default redirect URIs."
echo "You'll need to provide Client IDs and Secrets."
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Function to add env var with value
add_env() {
    local var_name=$1
    local value=$2
    local env=$3
    
    if [ -z "$value" ]; then
        echo "⚠️  Skipping $var_name (no value provided)"
        return
    fi
    
    echo "$value" | vercel env add "$var_name" "$env" 2>/dev/null || {
        echo "⚠️  $var_name might already exist for $env, skipping..."
    }
}

# Get values from user
echo "Enter OAuth credentials:"
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

# Add to Production
echo ""
echo "📦 Adding to Production environment..."
add_env "NEXT_PUBLIC_SHOPIFY_CLIENT_ID" "$SHOPIFY_CLIENT_ID" "production"
add_env "SHOPIFY_CLIENT_SECRET" "$SHOPIFY_CLIENT_SECRET" "production"
add_env "NEXT_PUBLIC_SHOPIFY_REDIRECT_URI" "$REDIRECT_URI" "production"

add_env "NEXT_PUBLIC_ZID_CLIENT_ID" "$ZID_CLIENT_ID" "production"
add_env "ZID_CLIENT_SECRET" "$ZID_CLIENT_SECRET" "production"
add_env "NEXT_PUBLIC_ZID_REDIRECT_URI" "$REDIRECT_URI" "production"

add_env "NEXT_PUBLIC_SALLA_CLIENT_ID" "$SALLA_CLIENT_ID" "production"
add_env "SALLA_CLIENT_SECRET" "$SALLA_CLIENT_SECRET" "production"
add_env "NEXT_PUBLIC_SALLA_REDIRECT_URI" "$REDIRECT_URI" "production"

# Ask about other environments
read -p "Add to Preview and Development too? (y/n) [y]: " add_others
add_others=${add_others:-y}

if [ "$add_others" = "y" ] || [ "$add_others" = "Y" ]; then
    echo "📦 Adding to Preview environment..."
    add_env "NEXT_PUBLIC_SHOPIFY_CLIENT_ID" "$SHOPIFY_CLIENT_ID" "preview"
    add_env "SHOPIFY_CLIENT_SECRET" "$SHOPIFY_CLIENT_SECRET" "preview"
    add_env "NEXT_PUBLIC_SHOPIFY_REDIRECT_URI" "$REDIRECT_URI" "preview"
    
    add_env "NEXT_PUBLIC_ZID_CLIENT_ID" "$ZID_CLIENT_ID" "preview"
    add_env "ZID_CLIENT_SECRET" "$ZID_CLIENT_SECRET" "preview"
    add_env "NEXT_PUBLIC_ZID_REDIRECT_URI" "$REDIRECT_URI" "preview"
    
    add_env "NEXT_PUBLIC_SALLA_CLIENT_ID" "$SALLA_CLIENT_ID" "preview"
    add_env "SALLA_CLIENT_SECRET" "$SALLA_CLIENT_SECRET" "preview"
    add_env "NEXT_PUBLIC_SALLA_REDIRECT_URI" "$REDIRECT_URI" "preview"
    
    echo "📦 Adding to Development environment..."
    add_env "NEXT_PUBLIC_SHOPIFY_CLIENT_ID" "$SHOPIFY_CLIENT_ID" "development"
    add_env "SHOPIFY_CLIENT_SECRET" "$SHOPIFY_CLIENT_SECRET" "development"
    add_env "NEXT_PUBLIC_SHOPIFY_REDIRECT_URI" "$REDIRECT_URI" "development"
    
    add_env "NEXT_PUBLIC_ZID_CLIENT_ID" "$ZID_CLIENT_ID" "development"
    add_env "ZID_CLIENT_SECRET" "$ZID_CLIENT_SECRET" "development"
    add_env "NEXT_PUBLIC_ZID_REDIRECT_URI" "$REDIRECT_URI" "development"
    
    add_env "NEXT_PUBLIC_SALLA_CLIENT_ID" "$SALLA_CLIENT_ID" "development"
    add_env "SALLA_CLIENT_SECRET" "$SALLA_CLIENT_SECRET" "development"
    add_env "NEXT_PUBLIC_SALLA_REDIRECT_URI" "$REDIRECT_URI" "development"
fi

echo ""
echo "✅ Done! Verifying..."
vercel env ls | grep -E "SHOPIFY|ZID|SALLA" || echo "Run 'vercel env ls' to see all variables"

echo ""
echo "🎉 OAuth environment variables restored!"

