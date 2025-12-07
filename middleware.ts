import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const basePath = '/business';
  const pathname = req.nextUrl.pathname;
  
  // Only process paths that start with basePath
  if (!pathname.startsWith(basePath)) {
    return NextResponse.next();
  }
  
  // Remove basePath from pathname for route checking
  const pathWithoutBase = pathname.replace(basePath, '') || '/';
  
  const isAuthPage = pathWithoutBase.startsWith('/auth');
  const isAuthCallback = pathWithoutBase.startsWith('/auth/callback');
  const isDashboard = pathWithoutBase.startsWith('/dashboard');
  const isSetupPage = pathWithoutBase.startsWith('/setup');

  // Allow auth callback to pass through without checking session
  if (isAuthCallback) {
    return NextResponse.next();
  }

  // Protect dashboard route - require valid session
  if (isDashboard) {
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
      return NextResponse.redirect(new URL(`${basePath}/setup`, req.url));
    }

    // Check if user has a business account
    const { data: merchantUser } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', session.user.id)
      .single();

    // If no business account, redirect to setup
    if (!merchantUser) {
      return NextResponse.redirect(new URL(`${basePath}/setup`, req.url));
    }
  }

  // Setup page is accessible without auth (for step 1), but we can check auth state
  // The setup page itself handles the logic

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
        return NextResponse.redirect(new URL(`${basePath}/dashboard`, req.url));
      } else {
        return NextResponse.redirect(new URL(`${basePath}/setup`, req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match business routes, exclude Next.js internals and static files
    '/business',
    '/business/dashboard/:path*',
    '/business/setup/:path*',
    '/business/auth/:path*',
  ],
};