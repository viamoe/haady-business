import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import AuthForm from '../AuthForm';
import { cookies } from 'next/headers';
import { getLocalizedUrlFromRequest } from '@/lib/localized-url';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const supabase = await createServerSupabase();
  const params = await searchParams;
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!error && user) {
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id, business_name')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (businessProfile?.business_name) {
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
      const onboardingUrl = getLocalizedUrlFromRequest('/onboarding/personal-details', {
        cookies: {
          get: (name: string) => {
            const cookie = cookieStore.get(name);
            return cookie ? { value: cookie.value } : undefined;
          }
        }
      });
      redirect(onboardingUrl);
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthForm mode="login" reason={params.reason} />
    </Suspense>
  );
}

