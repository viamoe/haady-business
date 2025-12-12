#!/bin/bash

# Quick restore script - adds all variables at once
# Usage: ./restore-oauth-env-quick.sh

set -e

# Disable exit on error for the add_env function to handle errors gracefully
set +e

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
    
    # Use printf with newline and pipe to vercel env add
    # Add a small delay to ensure input is processed
    printf '%s\n' "$value" | timeout 30 vercel env add "$var_name" "$env" 2>&1
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ Added $var_name to $env"
    elif [ $exit_code -eq 124 ]; then
        echo "⚠️  Timeout adding $var_name to $env (might already exist or need manual input)"
    else
        # Check if it's because the variable already exists
        if vercel env ls 2>/dev/null | grep -q "^$var_name.*$env"; then
            echo "⚠️  $var_name already exists for $env, skipping..."
        else
            echo "❌ Failed to add $var_name for $env (exit code: $exit_code)"
            echo "   Try running manually: vercel env add $var_name $env"
        fi
    fi
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
echo "Adding Shopify Client ID..."
add_env "NEXT_PUBLIC_SHOPIFY_CLIENT_ID" "$SHOPIFY_CLIENT_ID" "production"
echo "Adding Shopify Client Secret..."
add_env "SHOPIFY_CLIENT_SECRET" "$SHOPIFY_CLIENT_SECRET" "production"
echo "Adding Shopify Redirect URI..."
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

