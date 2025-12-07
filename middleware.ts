import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Allow root landing page to pass through without any checks
  if (pathname === '/' || pathname === '') {
    return NextResponse.next();
  }
  
  const isAuthPage = pathname.startsWith('/auth');
  const isAuthCallback = pathname.startsWith('/auth/callback');
  const isDashboard = pathname.startsWith('/dashboard');
  const isSetupPage = pathname.startsWith('/setup');

  // Allow auth callback to pass through without checking session
  if (isAuthCallback) {
    return NextResponse.next();
  }
  
  // Allow setup page to pass through (handles its own auth logic)
  if (isSetupPage) {
    return NextResponse.next();
  }

  // Protect dashboard route - require valid session
  if (isDashboard) {
    try {
      // Create Supabase client to check session properly
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
            setAll(cookiesToSet) {
              // Cookies are set in route handlers, not middleware
              // This is a no-op in middleware
            },
          },
        }
      );

      // Check for valid session
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session || !session.user) {
        return NextResponse.redirect(new URL('/setup', req.url));
      }

      // Check if user has a business account
      // Note: Database queries in middleware should be lightweight
      const { data: merchantUser, error: dbError } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', session.user.id)
        .single();

      // If database query fails or no business account, redirect to setup
      if (dbError || !merchantUser) {
        return NextResponse.redirect(new URL('/setup', req.url));
      }
    } catch (error) {
      // If middleware fails, redirect to setup to avoid blocking
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/setup', req.url));
    }
  }

  // Setup page is accessible without auth (for step 1), but we can check auth state
  // The setup page itself handles the logic

  // If authenticated user tries to access auth page, redirect appropriately
  if (isAuthPage && !isAuthCallback) {
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

      // Check for valid session
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
      // If middleware fails, allow request to continue
      console.error('Middleware error:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match routes that need middleware processing
    // Exclude: root landing page, Next.js internals, static files
    '/dashboard/:path*',
    '/auth/:path*',
  ],
};