import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getLocalizedUrlFromRequest } from '@/lib/localized-url';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state'); // Format: "userId:platform" or "userId:platform:onboarding" or "userId:shopify:shopDomain:onboarding"
  const error = requestUrl.searchParams.get('error');
  
  // Parse state to extract platform and onboarding flag
  let platform = requestUrl.searchParams.get('platform') || 'salla';
  let isOnboarding = false;
  let shopDomain: string | null = null;
  
  if (state) {
    const stateParts = state.split(':');
    if (stateParts.length >= 2) {
      platform = stateParts[1];
    }
    // Check if onboarding flag is present (last part or second-to-last for Shopify)
    if (stateParts[stateParts.length - 1] === 'onboarding') {
      isOnboarding = true;
      // For Shopify, shop domain is before onboarding flag
      if (platform === 'shopify' && stateParts.length >= 4) {
        shopDomain = stateParts[2];
      }
    } else if (platform === 'shopify' && stateParts.length >= 3) {
      // Shopify without onboarding: userId:shopify:shopDomain
      shopDomain = stateParts[2];
    }
  }
  
  // Log incoming request for debugging
  console.log('🔵 Callback received:', {
    url: requestUrl.toString(),
    code: code ? 'present' : 'missing',
    state: state ? 'present' : 'missing',
    error: error || 'none',
    platform: platform,
    allParams: Object.fromEntries(requestUrl.searchParams.entries())
  });
  
  // Log platform-specific details
  if (platform === 'shopify' && state) {
    console.log('🛍️ Shopify callback details:', {
      shopDomain: shopDomain || 'NOT FOUND IN STATE',
      stateFormat: state,
      isOnboarding: isOnboarding,
    });
  }
  
  // Log onboarding context
  if (isOnboarding) {
    console.log('🎓 Onboarding OAuth flow detected for platform:', platform);
  }

  const cookieStore = await cookies();
  
  // Helper to get localized dashboard URL
  const getDashboardUrl = (searchParams?: URLSearchParams) => {
    const localizedPath = getLocalizedUrlFromRequest('/dashboard', {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name);
          return cookie ? { value: cookie.value } : undefined;
        }
      }
    });
    const url = new URL(localizedPath, requestUrl.origin);
    if (searchParams) {
      searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }
    return url;
  };

  // Helper to get redirect URL (onboarding or dashboard)
  const getRedirectUrl = (isOnboarding: boolean, path: string = '/dashboard') => {
    if (isOnboarding) {
      return new URL(`/onboarding?step=connect${path !== '/dashboard' ? '&' + path : ''}`, requestUrl.origin);
    }
    return getDashboardUrl();
  };

  // Handle OAuth errors
  if (error) {
    console.error(`${platform} OAuth error:`, error);
    const redirectUrl = getRedirectUrl(isOnboarding);
    redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
    redirectUrl.searchParams.set('message', error);
    return NextResponse.redirect(redirectUrl);
  }

  // Validate required parameters
  if (!code) {
    console.error(`No authorization code received from ${platform}`);
    const redirectUrl = getRedirectUrl(isOnboarding);
    redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
    redirectUrl.searchParams.set('message', 'No authorization code received');
    return NextResponse.redirect(redirectUrl);
  }

  if (!state) {
    console.error(`No state parameter received from ${platform}`);
    const redirectUrl = getRedirectUrl(isOnboarding);
    redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
    redirectUrl.searchParams.set('message', 'Invalid request state');
    return NextResponse.redirect(redirectUrl);
  }

  // Extract user ID from state FIRST (format: "userId:platform" or "userId:platform:shopDomain")
  const userIdFromState = state.includes(':') ? state.split(':')[0] : state;
  
  // Validate user ID format (should be a UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userIdFromState)) {
    console.error('❌ Invalid user ID format in state:', userIdFromState);
    const redirectUrl = getRedirectUrl(isOnboarding);
    redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
    redirectUrl.searchParams.set('message', 'Invalid request state format');
    return NextResponse.redirect(redirectUrl);
  }
  
  // Use admin client to verify the user exists (bypasses session requirements)
  // This is needed because the OAuth redirect from external platforms may not have session cookies
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  
  // Verify the user exists in the database
  const { data: userRecord, error: userError } = await adminClient
    .from('business_profile')
    .select('id, auth_user_id, store_id')
    .eq('auth_user_id', userIdFromState)
    .maybeSingle();
  
  if (userError || !userRecord) {
    console.error('❌ User not found in business_profile:', {
      userIdFromState,
      error: userError?.message,
      platform,
    });
    
    const loginPath = getLocalizedUrlFromRequest('/auth/login', {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name);
          return cookie ? { value: cookie.value } : undefined;
        }
      }
    });
    const loginUrl = new URL(loginPath, requestUrl.origin);
    loginUrl.searchParams.set('error', 'auth_required');
    loginUrl.searchParams.set('message', 'User account not found. Please sign in again.');
    return NextResponse.redirect(loginUrl);
  }
  
  console.log('✅ User verified from state:', {
    userIdFromState,
    businessProfileId: userRecord.id,
    businessId: userRecord.id,
  });
  
  // Create a regular Supabase client for database operations (RLS will use service role)
  const supabase = adminClient;

  // User is verified from state - use the user ID from state for all operations
  const user = { id: userIdFromState };

  try {
    // Platform-specific OAuth configuration
    let clientId: string | undefined;
    let clientSecret: string | undefined;
    let redirectUri: string;
    let tokenEndpoint: string;
    let storeInfoEndpoint: string;

    if (platform === 'zid') {
      clientId = process.env.NEXT_PUBLIC_ZID_CLIENT_ID;
      clientSecret = process.env.ZID_CLIENT_SECRET;
      redirectUri = process.env.NEXT_PUBLIC_ZID_REDIRECT_URI || 'http://localhost:3002/callback';
      tokenEndpoint = 'https://oauth.zid.sa/oauth/token';
      storeInfoEndpoint = 'https://api.zid.sa/managers/store/v1';
    } else if (platform === 'shopify') {
      // Shop domain already extracted from state parsing above
      if (!shopDomain) {
        console.error('Shop domain not found in state');
        const redirectUrl = getRedirectUrl(isOnboarding);
        redirectUrl.searchParams.set('error', 'shopify_connection_failed');
        redirectUrl.searchParams.set('message', 'Shop domain missing');
        return NextResponse.redirect(redirectUrl);
      }

      clientId = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID;
      clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
      redirectUri = process.env.NEXT_PUBLIC_SHOPIFY_REDIRECT_URI || 'http://localhost:3002/callback';
      
      // Shopify token endpoint is shop-specific
      const cleanShop = shopDomain.replace(/\.myshopify\.com$/, '');
      tokenEndpoint = `https://${cleanShop}.myshopify.com/admin/oauth/access_token`;
      storeInfoEndpoint = `https://${cleanShop}.myshopify.com/admin/api/2024-01/shop.json`;
    } else {
      // Default to Salla
      clientId = process.env.NEXT_PUBLIC_SALLA_CLIENT_ID;
      clientSecret = process.env.SALLA_CLIENT_SECRET;
      redirectUri = process.env.NEXT_PUBLIC_SALLA_REDIRECT_URI || 'http://localhost:3002/callback';
      tokenEndpoint = 'https://accounts.salla.sa/oauth2/token';
      // Salla store info - use the store/info endpoint (requires settings.read scope)
      storeInfoEndpoint = 'https://api.salla.dev/admin/v2/store/info';
    }

    if (!clientId || !clientSecret) {
      console.error(`Missing ${platform} OAuth credentials`);
      console.error(`Environment check:`, {
        platform,
        clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
        clientSecret: clientSecret ? '***' + clientSecret.slice(-4) : 'MISSING',
        redirectUri,
        envVars: {
          shopify: {
            clientId: process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID ? 'SET' : 'MISSING',
            secret: process.env.SHOPIFY_CLIENT_SECRET ? 'SET' : 'MISSING',
          },
          zid: {
            clientId: process.env.NEXT_PUBLIC_ZID_CLIENT_ID ? 'SET' : 'MISSING',
            secret: process.env.ZID_CLIENT_SECRET ? 'SET' : 'MISSING',
          },
          salla: {
            clientId: process.env.NEXT_PUBLIC_SALLA_CLIENT_ID ? 'SET' : 'MISSING',
            secret: process.env.SALLA_CLIENT_SECRET ? 'SET' : 'MISSING',
          },
        }
      });
      const dashboardUrl = getDashboardUrl();
      dashboardUrl.searchParams.set('error', `${platform}_connection_failed`);
      dashboardUrl.searchParams.set('message', encodeURIComponent(`OAuth credentials not configured. Please set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET in your .env.local file. See docs/troubleshooting/localhost-oauth-setup.md`));
      return NextResponse.redirect(dashboardUrl);
    }

    // Exchange code for access token
    // All platforms use form-encoded for token exchange
    const tokenBody = platform === 'shopify'
      ? new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
        })
      : new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
        });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`❌ Failed to exchange code for token (${platform}):`);
      console.error(`   Status: ${tokenResponse.status}`);
      console.error(`   Response: ${errorText}`);
      console.error(`   Token Endpoint: ${tokenEndpoint}`);
      console.error(`   Client ID: ${clientId ? clientId.substring(0, 8) + '...' : 'MISSING'}`);
      console.error(`   Client Secret: ${clientSecret ? '***' + clientSecret.slice(-4) : 'MISSING'}`);
      console.error(`   Redirect URI: ${redirectUri}`);
      
      // Parse error message for better user feedback
      let errorMessage = `Failed to authenticate with ${platform}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error_description) {
          errorMessage = errorData.error_description;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If not JSON, use the text as-is if it's helpful
        if (errorText.includes('unknown client') || errorText.includes('does not exist')) {
          errorMessage = `OAuth app not configured. Please set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET environment variables and ensure the OAuth app exists in ${platform}.`;
        } else if (errorText.includes('redirect_uri')) {
          errorMessage = `Redirect URI mismatch. Please ensure the redirect URI in your ${platform} OAuth app matches: ${redirectUri}`;
        } else {
          errorMessage = errorText.substring(0, 200); // Limit length
        }
      }
      
      const redirectUrl = getRedirectUrl(isOnboarding);
      redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
      redirectUrl.searchParams.set('message', encodeURIComponent(errorMessage));
      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenResponse.json();
    
    // Log token response for debugging (especially for Shopify)
    if (platform === 'shopify') {
      console.log('🛍️ Shopify token response:', JSON.stringify(tokenData, null, 2));
    }
    
    // Shopify uses 'access_token', others might use different field names
    const access_token = tokenData.access_token || tokenData.accessToken;
    const refresh_token = tokenData.refresh_token || tokenData.refreshToken;
    const expires_in = tokenData.expires_in || tokenData.expiresIn;
    const token_type = tokenData.token_type || tokenData.tokenType || 'Bearer';
    
    // Shopify also provides 'scope' which we can store
    const scope = tokenData.scope;
    
    // Log extracted tokens
    if (platform === 'shopify') {
      console.log('🛍️ Extracted tokens:', {
        access_token: access_token ? 'present' : 'missing',
        refresh_token: refresh_token ? 'present' : 'missing',
        expires_in,
        scope,
      });
    }

    if (!access_token) {
      console.error(`No access token in response (${platform}):`, tokenData);
      const redirectUrl = getRedirectUrl(isOnboarding);
      redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
      redirectUrl.searchParams.set('message', 'Invalid token response');
      return NextResponse.redirect(redirectUrl);
    }

    // Get store information from platform API
    // Note: This is optional - connection will work even if store info fetch fails
    console.log(`🔍 Fetching store info from: ${storeInfoEndpoint}`);
    let storeResponse: Response | null = null;
    try {
      storeResponse = await fetch(storeInfoEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `${token_type || 'Bearer'} ${access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(platform === 'zid' ? {
            'X-Request-ID': randomUUID(),
            'X-API-KEY': clientId,
          } : {}),
          ...(platform === 'shopify' ? {
            'X-Shopify-Access-Token': access_token,
          } : {}),
        },
      });
      console.log(`📡 Store info response status: ${storeResponse.status}`);
    } catch (fetchError) {
      console.warn(`⚠️ Network error fetching store info (${platform}):`, fetchError);
      // Continue without store info - connection will still be saved
    }

    let storeInfo = null;
    let storeName = null;
    let storeDomain = null;
    let storeExternalId = null;
    let storeEmail = null;

    if (storeResponse && storeResponse.ok) {
      storeInfo = await storeResponse.json();
      console.log(`📦 ${platform} Store Info Response:`, JSON.stringify(storeInfo, null, 2));
      
      if (platform === 'zid') {
        // Zid API structure
        if (storeInfo?.result) {
          storeExternalId = storeInfo.result.id?.toString() || storeInfo.result.store_id?.toString() || null;
          storeName = storeInfo.result.name || storeInfo.result.store_name || null;
          storeDomain = storeInfo.result.domain || storeInfo.result.store_domain || null;
          storeEmail = storeInfo.result.email || storeInfo.result.owner_email || null;
        } else if (storeInfo?.data) {
          storeExternalId = storeInfo.data.id?.toString() || storeInfo.data.store_id?.toString() || null;
          storeName = storeInfo.data.name || storeInfo.data.store_name || null;
          storeDomain = storeInfo.data.domain || storeInfo.data.store_domain || null;
          storeEmail = storeInfo.data.email || storeInfo.data.owner_email || null;
        } else if (storeInfo?.name) {
          storeExternalId = storeInfo.id?.toString() || storeInfo.store_id?.toString() || null;
          storeName = storeInfo.name || storeInfo.store_name || null;
          storeDomain = storeInfo.domain || storeInfo.store_domain || null;
          storeEmail = storeInfo.email || storeInfo.owner_email || null;
        }
      } else if (platform === 'shopify') {
        // Shopify API structure: { shop: { id, name, domain, email, ... } }
        if (storeInfo?.shop) {
          storeExternalId = storeInfo.shop.id?.toString() || null;
          storeName = storeInfo.shop.name || storeInfo.shop.shop_owner || null;
          storeDomain = storeInfo.shop.domain || storeInfo.shop.myshopify_domain || null;
          storeEmail = storeInfo.shop.email || storeInfo.shop.customer_email || null;
        } else if (storeInfo?.name) {
          // Fallback if structure is different
          storeExternalId = storeInfo.id?.toString() || null;
          storeName = storeInfo.name || null;
          storeDomain = storeInfo.domain || storeInfo.myshopify_domain || null;
          storeEmail = storeInfo.email || null;
        }
      } else {
        // Salla store/info endpoint response
        // Response format: { status: 200, success: true, data: { id, name, domain, email, avatar, ... } }
        console.log('🔍 Parsing Salla store/info response:', JSON.stringify(storeInfo, null, 2));
        
        const sallaData = storeInfo?.data || storeInfo;
        
        if (sallaData) {
          storeExternalId = sallaData.id?.toString() || sallaData.merchant_id?.toString() || null;
          storeName = sallaData.name || sallaData.store_name || null;
          // Domain - Salla provides it as "domain" field
          const rawDomain = sallaData.domain || sallaData.store_domain || null;
          storeDomain = rawDomain ? (rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}.salla.sa`) : null;
          // Email
          storeEmail = sallaData.email || sallaData.owner_email || null;
          
          console.log('✅ Parsed Salla store data:', { storeExternalId, storeName, storeDomain, storeEmail });
        }
      }
      
      console.log('✅ Extracted store info:', { storeExternalId, storeName, storeDomain, storeEmail });
    } else if (storeResponse) {
      const errorText = await storeResponse.text();
      console.warn(`⚠️ Failed to fetch store information (${platform}):`, storeResponse.status, errorText);
      console.warn('Continuing with connection without store name...');
    } else {
      console.warn(`⚠️ Could not fetch store information (${platform}) - network error or missing response`);
      console.warn('Continuing with connection without store name...');
    }

    // Get business profile first
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id, store_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!businessProfile) {
      console.error('❌ Business profile not found for user:', user.id);
      const redirectUrl = getRedirectUrl(isOnboarding);
      redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
      redirectUrl.searchParams.set('message', 'Business profile not found. Please complete onboarding step 1 first.');
      return NextResponse.redirect(redirectUrl);
    }

    // ============================================
    // ONBOARDING FLOW: Use RPC functions
    // ============================================
    if (isOnboarding) {
      console.log('🎓 Using onboarding RPC to save connection...');
      
      // Calculate token expiry if expires_in is provided
      let tokenExpiresAt: string | null = null;
      if (expires_in) {
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
        tokenExpiresAt = expiresAt.toISOString();
      }

      // First check if user has a store (required for step 3)
      const { data: businessProfileCheck } = await supabase
        .from('business_profile')
        .select('id, store_id, onboarding_step')
        .eq('auth_user_id', user.id)
        .single();
      
      console.log('🔍 Business profile check:', {
        userId: user.id,
        businessProfileId: businessProfileCheck?.id,
        storeId: businessProfileCheck?.store_id,
        onboardingStep: businessProfileCheck?.onboarding_step,
      });

      if (!businessProfileCheck?.store_id) {
        console.error('❌ User has no store - need to complete step 2 first');
        const redirectUrl = new URL('/onboarding/business-setup', requestUrl.origin);
        redirectUrl.searchParams.set('error', 'store_required');
        redirectUrl.searchParams.set('message', 'Please complete store setup first');
        return NextResponse.redirect(redirectUrl);
      }

      // Call onboarding RPC with user_id (since we're using service role client)
      console.log('📤 Calling save_store_connection_onboarding RPC with:', {
        platform,
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        tokenExpiresAt,
        storeExternalId,
        storeDomain,
        storeName,
        storeEmail,
        userId: user.id,
      });

      const { data: rpcData, error: rpcError } = await supabase.rpc('save_store_connection_onboarding', {
        p_platform: platform,
        p_access_token: access_token,
        p_refresh_token: refresh_token || null,
        p_token_expires_at: tokenExpiresAt,
        p_external_store_id: storeExternalId,
        p_store_url: storeDomain || null,
        p_webhook_secret: null,
        p_user_id: user.id, // Pass user ID for server-side auth
        p_external_store_name: storeName || null, // External platform store name
        p_email: storeEmail || null, // External platform store email
      });

      console.log('📥 RPC response:', { rpcData, rpcError });

      if (rpcError) {
        console.error('❌ Error calling save_store_connection_onboarding:', rpcError);
        const redirectUrl = getRedirectUrl(isOnboarding);
        redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
        redirectUrl.searchParams.set('message', rpcError.message || 'Failed to save connection');
        return NextResponse.redirect(redirectUrl);
      }

      if (!rpcData?.success) {
        console.error('❌ RPC returned error:', rpcData?.error);
        const redirectUrl = getRedirectUrl(isOnboarding);
        redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
        redirectUrl.searchParams.set('message', rpcData?.error || 'Failed to save connection');
        return NextResponse.redirect(redirectUrl);
      }

      console.log('✅ Connection saved via onboarding RPC:', rpcData);

      // Note: onboarding_step is already set to 'summary' by save_store_connection_onboarding RPC
      // No need to call complete_onboarding here - user will complete on summary step

      // Redirect to onboarding summary step with success
      if (isOnboarding) {
        // Get localized URL for summary step
        const summaryPath = getLocalizedUrlFromRequest('/onboarding/summary', {
          cookies: {
            get: (name: string) => {
              const cookie = cookieStore.get(name);
              return cookie ? { value: cookie.value } : undefined;
            }
          }
        });
        const redirectUrl = new URL(summaryPath, requestUrl.origin);
        redirectUrl.searchParams.set('success', `${platform}_connected`);
        if (storeName) {
          redirectUrl.searchParams.set('store', storeName);
        }
        console.log('🔄 Redirecting to summary:', redirectUrl.toString());
        return NextResponse.redirect(redirectUrl);
      } else {
        // Regular flow - redirect to dashboard
        const redirectUrl = getDashboardUrl();
        redirectUrl.searchParams.set('success', `${platform}_connected`);
        if (storeName) {
          redirectUrl.searchParams.set('store', storeName);
        }
        return NextResponse.redirect(redirectUrl);
      }
    }

    // ============================================
    // REGULAR FLOW: Create/update store and connection
    // ============================================

    // Create or update store FIRST (stores is now the source of truth)
    const storeNameToUse = storeName || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Store`
    const slug = storeNameToUse
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Map platform string to enum value (normalize to lowercase)
    const platformEnum = platform.toLowerCase() as 'salla' | 'zid' | 'shopify' | 'woocommerce' | 'haady'

    // Check if store already exists for this external store ID
    let existingStore = null;
    if (storeExternalId) {
      // Find store by checking if a connection with this external_id exists and has a store
      const { data: existingConnection } = await supabase
        .from('store_connections')
        .select('store_id')
        .eq('store_external_id', storeExternalId)
        .maybeSingle()
      
      if (existingConnection?.store_id) {
        const { data: store } = await supabase
          .from('stores')
          .select('id, platform')
          .eq('id', existingConnection.store_id)
          .eq('business_id', businessProfile.id)
          .maybeSingle()
        
        existingStore = store;
      }
    }

    // Use admin client to create/update store
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    let storeId: string;
    if (existingStore) {
      // Update existing store
      console.log('🔄 Updating existing store:', existingStore.id);
      const { error: updateError } = await adminClient
        .from('stores')
        .update({
          name: storeNameToUse,
          is_active: true,
        })
        .eq('id', existingStore.id)
      
      if (updateError) {
        console.error('❌ Error updating store:', updateError);
      } else {
        console.log('✅ Store updated:', existingStore.id);
      }
      storeId = existingStore.id;
    } else {
      // Create new store
      console.log('➕ Creating new store:', storeNameToUse);
      const { data: newStore, error: storeError } = await adminClient
        .from('stores')
        .insert({
          business_id: businessProfile.id,
          name: storeNameToUse,
          slug: `${slug}-${Date.now()}`,
          store_type: 'online',
          is_active: true,
          platform: platformEnum,
        })
        .select('id')
        .single()

      if (storeError) {
        console.error('❌ Error creating store:', storeError);
        const redirectUrl = getRedirectUrl(isOnboarding);
        redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
        redirectUrl.searchParams.set('message', 'Failed to create store');
        return NextResponse.redirect(redirectUrl);
      }
      
      storeId = newStore.id;
      console.log('✅ Store created:', storeId);
    }

    // Now create or update store_connection (only OAuth data, linked via store_id)
    const connectionData = {
      store_id: storeId, // Link to the store we just created/updated
      store_external_id: storeExternalId,
      store_domain: storeDomain,
      access_token: access_token,
      refresh_token: refresh_token || (platform === 'shopify' ? '' : null), // Shopify doesn't provide refresh tokens
      connection_status: 'connected',
      sync_status: 'idle',
    }
    
    console.log('💾 Saving connection data:', JSON.stringify(connectionData, null, 2));
    
    // Check if connection already exists for this store
    const { data: existingConnection } = await adminClient
      .from('store_connections')
      .select('id')
      .eq('store_id', storeId)
      .maybeSingle()

    let savedConnection;
    let dbError;

    if (existingConnection) {
      // Update existing connection
      console.log('🔄 Updating existing connection:', existingConnection.id);
      const { data, error } = await adminClient
        .from('store_connections')
        .update({
          store_external_id: storeExternalId,
          store_domain: storeDomain,
          access_token: access_token,
          refresh_token: refresh_token || (platform === 'shopify' ? '' : null),
          connection_status: 'connected',
          sync_status: 'idle',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id)
        .select()
      
      savedConnection = data;
      dbError = error;
    } else {
      // Insert new connection
      console.log('➕ Creating new connection for store:', storeId);
      const { data, error } = await adminClient
        .from('store_connections')
        .insert(connectionData)
        .select()
      
      savedConnection = data;
      dbError = error;
    }

    if (dbError) {
      console.error('❌ Error saving store connection:', dbError);
      // Store is already created, so we continue but log the error
      console.warn('⚠️ Store created but connection failed. Store ID:', storeId);
    } else {
      console.log('✅ Store connection saved successfully!', savedConnection);
    }

    // Redirect with success message
    const redirectUrl = getRedirectUrl(isOnboarding);
    redirectUrl.searchParams.set('success', `${platform}_connected`);
    
    // Include store name in success message if available
    if (platform === 'zid' && storeInfo?.result?.name) {
      redirectUrl.searchParams.set('store', storeInfo.result.name);
    } else if (platform === 'shopify' && storeInfo?.shop?.name) {
      redirectUrl.searchParams.set('store', storeInfo.shop.name);
    } else if (storeInfo?.data?.name) {
      redirectUrl.searchParams.set('store', storeInfo.data.name);
    } else if (storeName) {
      redirectUrl.searchParams.set('store', storeName);
    }
    
    console.log('✅ Redirecting:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error(`Error processing ${platform} callback:`, error);
    const redirectUrl = getRedirectUrl(isOnboarding);
    redirectUrl.searchParams.set('error', `${platform}_connection_failed`);
    redirectUrl.searchParams.set('message', error.message || 'Unknown error occurred');
    return NextResponse.redirect(redirectUrl);
  }
}

