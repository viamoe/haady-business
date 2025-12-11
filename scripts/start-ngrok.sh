#!/bin/bash

# Ngrok startup script for Haady Business
# This script starts ngrok tunnel on port 3002

echo "🚀 Starting ngrok tunnel on port 3002..."
echo ""
echo "📝 Make sure your Next.js dev server is running on port 3002"
echo "📝 Copy the HTTPS URL from ngrok and update:"
echo "   1. .env.local: NEXT_PUBLIC_ZID_REDIRECT_URI"
echo "   2. Zid Partner Dashboard: Redirection URL and Callback URL"
echo ""

ngrok http 3002

