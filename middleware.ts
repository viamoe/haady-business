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

  // Check for locale override in query params (from language switcher)
  const localeOverride = req.nextUrl.searchParams.get('_locale');
  const existingLocaleCookie = req.cookies.get('locale')?.value;

  if (urlMatch) {
    currentLocale = urlMatch[1].toLowerCase();
    currentCountryCode = urlMatch[2].toUpperCase();
    newPathname = urlMatch[3] || '/'; // The rest of the path
    shouldRewrite = true;
    
    // Update pathname for route checks
    pathname = newPathname;
  }

  // If locale override is provided in query params, use it instead of URL pattern
  // This allows the language switcher to work even with URL-based locale routing
  if (localeOverride && (localeOverride === 'en' || localeOverride === 'ar')) {
    currentLocale = localeOverride;
    
    // If we have a URL pattern and the locale changed, redirect to the new URL
    if (urlMatch && urlMatch[1].toLowerCase() !== localeOverride) {
      const newUrl = req.nextUrl.clone();
      newUrl.pathname = `/${localeOverride}-${urlMatch[2].toLowerCase()}${urlMatch[3] || ''}`;
      newUrl.searchParams.delete('_locale');
      newUrl.searchParams.delete('_t');
      const redirectResponse = NextResponse.redirect(newUrl);
      redirectResponse.cookies.set('locale', localeOverride, { path: '/', maxAge: 31536000 });
      return redirectResponse;
    }
  } else if (existingLocaleCookie && (existingLocaleCookie === 'en' || existingLocaleCookie === 'ar')) {
    // If no override but cookie exists, use cookie value (but still respect URL pattern for country)
    // Only override locale if it's different from URL pattern
    if (!urlMatch || currentLocale !== existingLocaleCookie) {
      currentLocale = existingLocaleCookie;
      
      // If we have a URL pattern and the locale in URL doesn't match cookie, redirect
      if (urlMatch && urlMatch[1].toLowerCase() !== existingLocaleCookie) {
        const newUrl = req.nextUrl.clone();
        newUrl.pathname = `/${existingLocaleCookie}-${urlMatch[2].toLowerCase()}${urlMatch[3] || ''}`;
        const redirectResponse = NextResponse.redirect(newUrl);
        redirectResponse.cookies.set('locale', existingLocaleCookie, { path: '/', maxAge: 31536000 });
        return redirectResponse;
      }
    }
  }

  // Allow root landing page to pass through without any checks
  if (pathname === '/' || pathname === '') {
    if (shouldRewrite && currentLocale) {
      const url = req.nextUrl.clone();
      url.pathname = newPathname;
      const rewrittenResponse = NextResponse.rewrite(url);
      // Only set locale cookie if it's different from existing or if override was provided
      if (localeOverride || !existingLocaleCookie || existingLocaleCookie !== currentLocale) {
        rewrittenResponse.cookies.set('locale', currentLocale, { path: '/', maxAge: 31536000 });
      }
      if (currentCountryCode) {
        rewrittenResponse.cookies.set('country', currentCountryCode, { path: '/', maxAge: 31536000 });
      }
      return rewrittenResponse;
    }
    return NextResponse.next();
  }

  const isLoginPage = pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup');
  const isLoginCallback = pathname.startsWith('/auth/callback');
  const isDashboard = pathname.startsWith('/dashboard');
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
  // Protect dashboard route - require valid user and business account
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

      // Check if user has completed onboarding
      const { data: businessProfile, error: dbError } = await supabase
        .from('business_profile')
        .select('id, is_onboarded, onboarding_step')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      // Check if onboarding is completed
      const isOnboardingComplete = businessProfile && (
        businessProfile.is_onboarded === true || 
        businessProfile.onboarding_step === null
      );

      // If no business account or onboarding not completed, redirect to onboarding
      if (dbError || !businessProfile || !isOnboardingComplete) {
        // Preserve locale-country prefix in redirect
        const redirectUrl = urlMatch 
          ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/onboarding/personal-details`, req.url)
          : new URL('/onboarding/personal-details', req.url);
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
      // Check if user has completed onboarding
      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('id, is_onboarded, onboarding_step')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (businessProfile && (businessProfile.is_onboarded || businessProfile.onboarding_step === null)) {
          // Preserve locale-country prefix in redirect
          const redirectUrl = urlMatch 
            ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/dashboard`, req.url)
            : new URL('/dashboard', req.url);
          return NextResponse.redirect(redirectUrl);
        } else {
          // Preserve locale-country prefix in redirect
          const redirectUrl = urlMatch 
            ? new URL(`/${currentLocale}-${currentCountryCode?.toLowerCase()}/onboarding/personal-details`, req.url)
            : new URL('/onboarding/personal-details', req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch (error) {
      console.error('Middleware error:', error);
    }
  }

  // If we had a URL rewrite, create the rewritten response
  if (shouldRewrite && currentLocale) {
    const url = req.nextUrl.clone();
    url.pathname = newPathname;
    // Remove locale override query params to clean up URL
    if (localeOverride) {
      url.searchParams.delete('_locale');
      url.searchParams.delete('_t');
    }
    const rewrittenResponse = NextResponse.rewrite(url);
    // Only set locale cookie if it's different from existing or if override was provided
    if (localeOverride || !existingLocaleCookie || existingLocaleCookie !== currentLocale) {
      rewrittenResponse.cookies.set('locale', currentLocale, { path: '/', maxAge: 31536000 });
    }
    if (currentCountryCode) {
      rewrittenResponse.cookies.set('country', currentCountryCode, { path: '/', maxAge: 31536000 });
    }
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
