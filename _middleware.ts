import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isAuthCallback = req.nextUrl.pathname.startsWith('/auth/callback');
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  const isSetupPage = req.nextUrl.pathname.startsWith('/setup');

  // Allow auth callback to pass through without checking session
  if (isAuthCallback) {
    return NextResponse.next();
  }

  // Protect dashboard and setup routes - require valid session
  if (isDashboard || isSetupPage) {
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
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/auth', req.url));
    }

    // If accessing dashboard, check if user has a business account
    if (isDashboard) {
      const { data: merchantUser } = await supabase
        .from('merchant_users')
        .select('merchant_id')
        .eq('auth_user_id', session.user.id)
        .single();

      // If no business account, redirect to setup
      if (!merchantUser) {
        return NextResponse.redirect(new URL('/setup', req.url));
      }
    }
  }

  // If authenticated user tries to access auth page, redirect appropriately
  if (isAuthPage && !isAuthCallback) {
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

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/setup/:path*', '/auth/:path*']
};