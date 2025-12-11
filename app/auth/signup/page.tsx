import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import AuthForm from '../AuthForm';
import { cookies } from 'next/headers';
import { getLocalizedUrlFromRequest } from '@/lib/localized-url';

interface PageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabase();
  const params = await searchParams;
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!error && user) {
    const { data: merchantUser } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', user.id)
      .single();

    if (merchantUser) {
      const cookieStore = await cookies();
      const dashboardUrl = getLocalizedUrlFromRequest('/dashboard', {
        cookies: {
          get: (name: string) => {
            const cookie = cookieStore.get(name);
            return cookie ? { value: cookie.value } : undefined;
          }
        }
      });
      redirect(dashboardUrl);
    } else {
      const cookieStore = await cookies();
      const setupUrl = getLocalizedUrlFromRequest('/setup', {
        cookies: {
          get: (name: string) => {
            const cookie = cookieStore.get(name);
            return cookie ? { value: cookie.value } : undefined;
          }
        }
      });
      redirect(setupUrl);
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthForm mode="signup" reason={params.reason} />
    </Suspense>
  );
}

