import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function validateRedirectUrl(url: string, origin: string): string {
  try {
    const urlObj = new URL(url, origin);
    // Only allow same-origin redirects
    if (urlObj.origin !== origin) {
      return '/dashboard';
    }
    // Only allow certain paths
    const allowedPaths = ['/dashboard', '/onboarding', '/get-started'];
    if (allowedPaths.some(path => urlObj.pathname.startsWith(path))) {
      return urlObj.pathname + urlObj.search;
    }
    return '/dashboard';
  } catch {
    return '/dashboard';
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const appType = requestUrl.searchParams.get('app_type');
  
  if (!code) {
    // No code, redirect to auth page
    return NextResponse.redirect(new URL('/login', requestUrl.origin));
  }

  const cookieStore = await cookies();
  
  // Store cookies to set on the final response
  const cookiesToSetOnResponse: Array<{ name: string; value: string; options: any }> = [];

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
        setAll(cookiesToSet) {
          // Store cookies to set them on the final response
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToSetOnResponse.push({ name, value, options });
          });
        },
      },
    }
  );

  // Exchange the code for a session
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    console.error('Error exchanging code for session:', error);
    // Redirect to login with error message
    const authUrl = new URL('/login', requestUrl.origin);
    authUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(authUrl);
  }
  
  if (!session || !session.user) {
    console.error('No session or user after code exchange');
    const authUrl = new URL('/login', requestUrl.origin);
    authUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(authUrl);
  }

  // Set app_type metadata if provided (for OAuth flows)
  if (appType === 'merchant' && session.user) {
    await supabase.auth.updateUser({
      data: {
        app_type: 'merchant',
      },
    });
  }

  // Check if user has a business account (merchant_user record)
  const { data: merchantUser, error: merchantError } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('auth_user_id', session.user.id)
    .single();

  // Determine redirect URL based on whether user has a business account
  let redirectUrl: URL;
  if (merchantUser && !merchantError) {
    // User has a business account, redirect to dashboard
    const next = validateRedirectUrl(nextParam || '/dashboard', requestUrl.origin);
    redirectUrl = new URL(next, requestUrl.origin);
  } else {
    // User doesn't have a business account yet, redirect to onboarding
    redirectUrl = new URL('/onboarding', requestUrl.origin);
  }

  // Create the final response with the correct redirect URL
  const response = NextResponse.redirect(redirectUrl);
  
  // Set all the session cookies on the response
  cookiesToSetOnResponse.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: options?.httpOnly ?? true,
      path: '/',
    });
  });

  return response;
}

