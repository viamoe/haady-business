import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getLocalizedUrlFromRequest } from '@/lib/localized-url';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state'); // Format: "userId:platform" or just "userId" for backward compatibility
  const error = requestUrl.searchParams.get('error');
  const platform = requestUrl.searchParams.get('platform') || (state?.includes(':') ? state.split(':')[1] : 'salla'); // Default to salla for backward compatibility
  
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
    const shopDomain = state.includes(':shopify:') ? state.split(':shopify:')[1] : null;
    console.log('🛍️ Shopify callback details:', {
      shopDomain: shopDomain || 'NOT FOUND IN STATE',
      stateFormat: state,
    });
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

  // Handle OAuth errors
  if (error) {
    console.error(`${platform} OAuth error:`, error);
    const dashboardUrl = getDashboardUrl();
    dashboardUrl.searchParams.set('error', `${platform}_connection_failed`);
    dashboardUrl.searchParams.set('message', error);
    return NextResponse.redirect(dashboardUrl);
  }

  // Validate required parameters
  if (!code) {
    console.error(`No authorization code received from ${platform}`);
    const dashboardUrl = getDashboardUrl();
    dashboardUrl.searchParams.set('error', `${platform}_connection_failed`);
    dashboardUrl.searchParams.set('message', 'No authorization code received');
    return NextResponse.redirect(dashboardUrl);
  }

  if (!state) {
    console.error(`No state parameter received from ${platform}`);
    const dashboardUrl = getDashboardUrl();
    dashboardUrl.searchParams.set('error', `${platform}_connection_failed`);
    dashboardUrl.searchParams.set('message', 'Invalid request state');
    return NextResponse.redirect(dashboardUrl);
  }

  // Create Supabase client to verify the user
  // Store cookies to set on response
  const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSetParam) {
          // Store cookies to set on the response
          cookiesToSetParam.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    }
  );

  // Verify the user exists and matches the state
  // This will also refresh the session if needed
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ User not authenticated in OAuth callback:', {
      error: authError?.message,
      errorCode: authError?.status,
      hasCookies: cookieStore.getAll().length > 0,
      cookieNames: cookieStore.getAll().map(c => c.name),
      allCookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
      state: state,
      platform: platform,
      url: requestUrl.toString(),
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
    loginUrl.searchParams.set('message', 'Please sign in to connect a store. Your session may have expired during the OAuth flow.');
    
    // Create response with cookies if any were set
    const response = NextResponse.redirect(loginUrl);
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...options,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
      });
    });
    return response;
  }

  // Extract user ID from state (format: "userId" or "userId:platform")
  const userIdFromState = state.includes(':') ? state.split(':')[0] : state;
  
  // Verify state matches user ID (security check)
  if (userIdFromState !== user.id) {
    console.error('State mismatch. Expected:', user.id, 'Got:', userIdFromState);
    const dashboardUrl = getDashboardUrl();
    dashboardUrl.searchParams.set('error', `${platform}_connection_failed`);
    dashboardUrl.searchParams.set('message', 'Invalid request state');
    return NextResponse.redirect(dashboardUrl);
  }

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
      // Extract shop domain from state (format: "userId:shopify:shopDomain")
      const shopDomain = state.includes(':shopify:') ? state.split(':shopify:')[1] : null;
      
      if (!shopDomain) {
        console.error('Shop domain not found in state');
        const dashboardUrl = getDashboardUrl();
        dashboardUrl.searchParams.set('error', 'shopify_connection_failed');
        dashboardUrl.searchParams.set('message', 'Shop domain missing');
        return NextResponse.redirect(dashboardUrl);
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
      
      const dashboardUrl = getDashboardUrl();
      dashboardUrl.searchParams.set('error', `${platform}_connection_failed`);
      dashboardUrl.searchParams.set('message', encodeURIComponent(errorMessage));
      return NextResponse.redirect(dashboardUrl);
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
      const dashboardUrl = getDashboardUrl();
      dashboardUrl.searchParams.set('error', `${platform}_connection_failed`);
      dashboardUrl.searchParams.set('message', 'Invalid token response');
      return NextResponse.redirect(dashboardUrl);
    }

    // Get store information from platform API
    const storeResponse = await fetch(storeInfoEndpoint, {
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

    let storeInfo = null;
    let storeName = null;
    let storeDomain = null;
    let storeExternalId = null;

    if (storeResponse.ok) {
      storeInfo = await storeResponse.json();
      console.log(`📦 ${platform} Store Info Response:`, JSON.stringify(storeInfo, null, 2));
      
      if (platform === 'zid') {
        // Zid API structure
        if (storeInfo?.result) {
          storeExternalId = storeInfo.result.id?.toString() || storeInfo.result.store_id?.toString() || null;
          storeName = storeInfo.result.name || storeInfo.result.store_name || null;
          storeDomain = storeInfo.result.domain || storeInfo.result.store_domain || null;
        } else if (storeInfo?.data) {
          storeExternalId = storeInfo.data.id?.toString() || storeInfo.data.store_id?.toString() || null;
          storeName = storeInfo.data.name || storeInfo.data.store_name || null;
          storeDomain = storeInfo.data.domain || storeInfo.data.store_domain || null;
        } else if (storeInfo?.name) {
          storeExternalId = storeInfo.id?.toString() || storeInfo.store_id?.toString() || null;
          storeName = storeInfo.name || storeInfo.store_name || null;
          storeDomain = storeInfo.domain || storeInfo.store_domain || null;
        }
      } else if (platform === 'shopify') {
        // Shopify API structure: { shop: { id, name, domain, email, ... } }
        if (storeInfo?.shop) {
          storeExternalId = storeInfo.shop.id?.toString() || null;
          storeName = storeInfo.shop.name || storeInfo.shop.shop_owner || null;
          storeDomain = storeInfo.shop.domain || storeInfo.shop.myshopify_domain || null;
        } else if (storeInfo?.name) {
          // Fallback if structure is different
          storeExternalId = storeInfo.id?.toString() || null;
          storeName = storeInfo.name || null;
          storeDomain = storeInfo.domain || storeInfo.myshopify_domain || null;
        }
      } else {
        // Salla API structure (default)
        if (storeInfo?.data) {
          storeExternalId = storeInfo.data.id?.toString() || storeInfo.data.store_id?.toString() || null;
          storeName = storeInfo.data.name || storeInfo.data.store_name || null;
          storeDomain = storeInfo.data.domain || storeInfo.data.store_domain || null;
        } else if (storeInfo?.name) {
          storeExternalId = storeInfo.id?.toString() || storeInfo.store_id?.toString() || null;
          storeName = storeInfo.name || storeInfo.store_name || null;
          storeDomain = storeInfo.domain || storeInfo.store_domain || null;
        }
      }
      
      console.log('✅ Extracted store info:', { storeExternalId, storeName, storeDomain });
    } else {
      const errorText = await storeResponse.text();
      console.warn(`⚠️ Failed to fetch store information (${platform}):`, storeResponse.status, errorText);
      console.warn('Continuing with connection without store name...');
    }

    // Store the connection in the database
    // Note: Shopify doesn't provide refresh_token, so we use empty string for Shopify
    const connectionData = {
      user_id: user.id,
      platform: platform,
      store_external_id: storeExternalId,
      store_name: storeName,
      store_domain: storeDomain,
      access_token: access_token,
      refresh_token: refresh_token || (platform === 'shopify' ? '' : null), // Shopify doesn't provide refresh tokens
    }
    
    console.log('💾 Saving connection data:', JSON.stringify(connectionData, null, 2));
    
    // Check if connection already exists for this specific store
    // We check by store_external_id to allow multiple stores from the same platform
    let existingConnection = null;
    
    if (storeExternalId) {
      const { data } = await supabase
        .from('store_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('store_external_id', storeExternalId)
        .maybeSingle()
      
      existingConnection = data;
    }

    let savedConnection;
    let dbError;

    if (existingConnection) {
      // Update existing connection for this specific store
      console.log('🔄 Updating existing connection for store:', storeExternalId, existingConnection.id);
      const { data, error } = await supabase
        .from('store_connections')
        .update({
          store_external_id: storeExternalId,
          store_name: storeName,
          store_domain: storeDomain,
          access_token: access_token,
          refresh_token: refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id)
        .select()
      
      savedConnection = data;
      dbError = error;
    } else {
      // Insert new connection (allows multiple stores from same platform)
      console.log('➕ Creating new connection for store:', storeExternalId || 'unknown');
      const { data, error } = await supabase
        .from('store_connections')
        .insert(connectionData)
        .select()
      
      savedConnection = data;
      dbError = error;
    }

    if (dbError) {
      console.error('❌ Error saving store connection:', dbError);
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      console.error('Error details:', dbError.details);
      console.error('Error hint:', dbError.hint);
      console.error('Full error:', JSON.stringify(dbError, null, 2));
      console.error('Data we tried to save:', JSON.stringify(connectionData, null, 2));
      
      // Handle refresh_token constraint for Shopify (which doesn't provide refresh tokens)
      if (dbError.message?.includes('refresh_token') && platform === 'shopify') {
        console.warn('⚠️ Shopify doesn\'t provide refresh_token, trying with empty string...');
        const shopifyData = {
          ...connectionData,
          refresh_token: '', // Use empty string for Shopify
        };
        
        if (existingConnection) {
          const { data: shopifyUpdateData, error: shopifyError } = await supabase
            .from('store_connections')
            .update(shopifyData)
            .eq('id', existingConnection.id)
            .select()
          
          if (shopifyError) {
            console.error('❌ Shopify update with empty refresh_token also failed:', shopifyError);
            dbError = shopifyError; // Keep the error
          } else {
            console.log('✅ Shopify connection saved with empty refresh_token');
            savedConnection = shopifyUpdateData;
            dbError = null; // Clear error so we continue
          }
        } else {
          const { data: shopifyDataResult, error: shopifyError } = await supabase
            .from('store_connections')
            .insert(shopifyData)
            .select()
          
          if (shopifyError) {
            console.error('❌ Shopify insert with empty refresh_token also failed:', shopifyError);
            dbError = shopifyError; // Keep the error
          } else {
            console.log('✅ Shopify connection saved with empty refresh_token');
            savedConnection = shopifyDataResult;
            dbError = null; // Clear error so we continue
          }
        }
      }
      
      // If columns don't exist, try without them
      if (dbError && (dbError.message?.includes('store_name') || dbError.message?.includes('store_domain'))) {
        console.warn('⚠️ store_name or store_domain columns may not exist, trying without them...');
        const fallbackData = {
          user_id: user.id,
          platform: platform,
          store_external_id: storeExternalId,
          access_token: access_token,
          refresh_token: refresh_token || (platform === 'shopify' ? '' : null), // Shopify doesn't provide refresh tokens
        }
        
        if (existingConnection) {
          const { error: fallbackError } = await supabase
            .from('store_connections')
            .update(fallbackData)
            .eq('id', existingConnection.id)
          
          if (fallbackError) {
            console.error('❌ Fallback update also failed:', fallbackError);
          } else {
            console.log('✅ Connection saved without store_name/store_domain');
          }
        } else {
          const { error: fallbackError } = await supabase
            .from('store_connections')
            .insert(fallbackData)
          
          if (fallbackError) {
            console.error('❌ Fallback insert also failed:', fallbackError);
          } else {
            console.log('✅ Connection saved without store_name/store_domain');
          }
        }
      }
    } else {
      console.log('✅ Store connection saved successfully!', savedConnection);
      if (storeName) {
        console.log('✅ Store name saved:', storeName);
      } else {
        console.warn('⚠️ Store name was not available in API response');
      }
    }

    // Redirect to dashboard with success message
    const dashboardUrl = getDashboardUrl();
    dashboardUrl.searchParams.set('success', `${platform}_connected`);
    
    // Include store name in success message if available
    if (platform === 'zid' && storeInfo?.result?.name) {
      dashboardUrl.searchParams.set('store', storeInfo.result.name);
    } else if (platform === 'shopify' && storeInfo?.shop?.name) {
      dashboardUrl.searchParams.set('store', storeInfo.shop.name);
    } else if (storeInfo?.data?.name) {
      dashboardUrl.searchParams.set('store', storeInfo.data.name);
    } else if (storeName) {
      dashboardUrl.searchParams.set('store', storeName);
    }
    
    console.log('✅ Redirecting to dashboard:', dashboardUrl.toString());
    return NextResponse.redirect(dashboardUrl);

  } catch (error: any) {
    console.error(`Error processing ${platform} callback:`, error);
    const dashboardUrl = getDashboardUrl();
    dashboardUrl.searchParams.set('error', `${platform}_connection_failed`);
    dashboardUrl.searchParams.set('message', error.message || 'Unknown error occurred');
    return NextResponse.redirect(dashboardUrl);
  }
}

