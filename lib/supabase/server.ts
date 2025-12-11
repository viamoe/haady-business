import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const createServerSupabase = async () => {
  const cookieStore = await cookies();

  return createServerClient(
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
          // In Server Components, cookies can only be read, not written
          // Cookie modifications should happen in Route Handlers or Server Actions
          // This is a no-op to prevent "Cookies can only be modified in a Server Action or Route Handler" errors
          // Cookie updates will be handled properly in route handlers like /auth/callback
        },
      }
    }
  );
};