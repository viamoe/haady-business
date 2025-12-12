import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export default async function middleware(req: NextRequest) {
  let pathname = req.nextUrl.pathname;

  // Handle locale and country in URL (e.g., /ar-eg/dashboard)
  const urlMatch = pathname.match(/^\/([a-z]{2})-([a-z]{2})(\/.*)?$/i);
  let currentLocale: string | undefined;
  let currentCountryCode: string | undefined;
  let newPathname: string = pathname;
  let shouldRewrite = false;

  if (urlMatch) {
    currentLocale = urlMatch[1].toLowerCase();
    currentCountryCode = urlMatch[2].toUpperCase();
    newPathname = urlMatch[3] || '/'; // The rest of the path
    shouldRewrite = true;
    
    // Update pathname for route checks
    pathname = newPathname;
  }

  // Allow root landing page to pass through without any checks
  if (pathname === '/' || pathname === '') {
    if (shouldRewrite) {
      const url = req.nextUrl.clone();
      url.pathname = newPathname;
      const rewrittenResponse = NextResponse.rewrite(url);
      rewrittenResponse.cookies.set('locale', currentLocale!, { path: '/', maxAge: 31536000 });
      rewrittenResponse.cookies.set('country', currentCountryCode!, { path: '/', maxAge: 31536000 });
      return rewrittenResponse;
    }
    return NextResponse.next();
  }

  const isLoginPage = pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup');
  const isLoginCallback = pathname.startsWith('/auth/callback');
  const isDashboard = pathname.startsWith('/dashboard');
  const isSetupPage = pathname.startsWith('/setup');

  // Allow login callback to pass through without checking session
  if (isLoginCallback) {
    if (shouldRewrite) {
      const url = req.nextUrl.clone();
      url.pathname = newPathname;
      const rewrittenResponse = NextResponse.rewrite(url);
      rewrittenResponse.cookies.set('locale', currentLocale!, { path: '/', maxAge: 31536000 });
      rewrittenResponse.cookies.set('country', currentCountryCode!, { path: '/', maxAge: 31536000 });
      return rewrittenResponse;
    }
    return NextResponse.next();
  }

  // Protect setup route - require authenticated user
  if (isSetupPage) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return req.cookies.getAll().map(cookie => ({
                name: cookie.name,
                value: cookie.value,
              }));
            },
            setAll() {
              // No-op in middleware
            },
          },
        }
      );

      // Use getUser() instead of getSession() for security - verifies with Supabase Auth server
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Preserve locale-country prefix in redirect
        const redirectUrl = urlMatch 
          ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/auth/login`, req.url)
          : new URL('/auth/login', req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Check if user already has a merchant account with a merchant_id
      const { data: merchantUser } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', user.id)
        .single();

      // If user has merchant_id (completed setup), redirect to dashboard
      if (merchantUser?.merchant_id) {
        // Preserve locale-country prefix in redirect
        const redirectUrl = urlMatch 
          ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/dashboard`, req.url)
          : new URL('/dashboard', req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // User is authenticated but no merchant - allow access to setup
    } catch (error) {
      console.error('Middleware error:', error);
      // Preserve locale-country prefix in redirect
      const redirectUrl = urlMatch 
        ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/auth/login`, req.url)
        : new URL('/auth/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Protect dashboard route - require valid user and merchant account
  if (isDashboard) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return req.cookies.getAll().map(cookie => ({
                name: cookie.name,
                value: cookie.value,
              }));
            },
            setAll() {
              // No-op in middleware
            },
          },
        }
      );

      // Use getUser() instead of getSession() for security - verifies with Supabase Auth server
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Preserve locale-country prefix in redirect
        const redirectUrl = urlMatch 
          ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/auth/login`, req.url)
          : new URL('/auth/login', req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Check if user has a business account with a merchant_id
      const { data: merchantUser, error: dbError } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', user.id)
        .single();

      // If no business account or merchant_id is null, redirect to setup
      if (dbError || !merchantUser || !merchantUser.merchant_id) {
        // Preserve locale-country prefix in redirect
        const redirectUrl = urlMatch 
          ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/setup`, req.url)
          : new URL('/setup', req.url);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Middleware error:', error);
      // Preserve locale-country prefix in redirect
      const redirectUrl = urlMatch 
        ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/auth/login`, req.url)
        : new URL('/auth/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If authenticated user tries to access login page, redirect appropriately
  // BUT: Skip redirect if logout=true param is present (user was just logged out)
  if (isLoginPage && !isLoginCallback) {
    const logoutParam = req.nextUrl.searchParams.get('logout');

    // If logout param is present, allow access to login page without redirect
    if (logoutParam === 'true') {
      return NextResponse.next();
    }

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return req.cookies.getAll().map(cookie => ({
                name: cookie.name,
                value: cookie.value,
              }));
            },
            setAll() {
              // No-op in middleware
            },
          },
        }
      );

      // Use getUser() instead of getSession() for security - verifies with Supabase Auth server
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!authError && user) {
        // Check if user has a business account with a merchant_id
        const { data: merchantUser } = await supabase
          .from('merchant_users')
          .select('merchant_id')
          .eq('auth_user_id', user.id)
          .single();

        if (merchantUser?.merchant_id) {
          // Preserve locale-country prefix in redirect
          const redirectUrl = urlMatch 
            ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/dashboard`, req.url)
            : new URL('/dashboard', req.url);
          return NextResponse.redirect(redirectUrl);
        } else {
          // Preserve locale-country prefix in redirect
          const redirectUrl = urlMatch 
            ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/setup`, req.url)
            : new URL('/setup', req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch (error) {
      console.error('Middleware error:', error);
    }
  }

  // If we had a URL rewrite, create the rewritten response
  if (shouldRewrite) {
    const url = req.nextUrl.clone();
    url.pathname = newPathname;
    const rewrittenResponse = NextResponse.rewrite(url);
    rewrittenResponse.cookies.set('locale', currentLocale!, { path: '/', maxAge: 31536000 });
    rewrittenResponse.cookies.set('country', currentCountryCode!, { path: '/', maxAge: 31536000 });
    return rewrittenResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
