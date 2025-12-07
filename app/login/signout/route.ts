import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  
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
          // No-op in route handler for sign out
        },
      },
    }
  );

  await supabase.auth.signOut();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const response = NextResponse.redirect(new URL('/', origin));
  
  // Clear auth cookies
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  
  return response;
}

