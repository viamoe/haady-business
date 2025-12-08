import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
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

      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session || !session.user) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      // Check if user already has a merchant account
      const { data: merchantUser } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', session.user.id)
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

  // Protect dashboard route - require valid session and merchant account
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

      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session || !session.user) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      // Check if user has a business account
      const { data: merchantUser, error: dbError } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', session.user.id)
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
  if (isLoginPage && !isLoginCallback) {
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

      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (!authError && session && session.user) {
        // Check if user has a business account
        const { data: merchantUser } = await supabase
          .from('merchant_users')
          .select('merchant_id')
          .eq('auth_user_id', session.user.id)
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
    '/dashboard/:path*',
    '/login/:path*',
    '/setup/:path*',
  ],
};
