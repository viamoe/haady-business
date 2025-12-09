import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Allow root landing page to pass through without any checks
  if (pathname === '/' || pathname === '') {
    return NextResponse.next();
  }

  const isLoginPage = pathname.startsWith('/login');
  const isLoginCallback = pathname.startsWith('/login/callback');
  const isDashboard = pathname.startsWith('/dashboard');
  const isSetupPage = pathname.startsWith('/setup');

  // Allow login callback to pass through without checking session
  if (isLoginCallback) {
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
        return NextResponse.redirect(new URL('/login', req.url));
      }

      // Check if user already has a merchant account
      const { data: merchantUser } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', user.id)
        .single();

      // If user has merchant, redirect to dashboard
      if (merchantUser) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // User is authenticated but no merchant - allow access to setup
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/login', req.url));
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
        return NextResponse.redirect(new URL('/login', req.url));
      }

      // Check if user has a business account
      const { data: merchantUser, error: dbError } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', user.id)
        .single();

      // If no business account, redirect to setup
      if (dbError || !merchantUser) {
        return NextResponse.redirect(new URL('/setup', req.url));
      }
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/login', req.url));
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
        // Check if user has a business account
        const { data: merchantUser } = await supabase
          .from('merchant_users')
          .select('merchant_id')
          .eq('auth_user_id', user.id)
          .single();

        if (merchantUser) {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        } else {
          return NextResponse.redirect(new URL('/setup', req.url));
        }
      }
    } catch (error) {
      console.error('Middleware error:', error);
    }
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
