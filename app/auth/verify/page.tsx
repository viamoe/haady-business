import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import OtpVerificationForm from './OtpVerificationForm';
import { cookies } from 'next/headers';
import { getLocalizedUrlFromRequest } from '@/lib/localized-url';

export const dynamic = 'force-dynamic';

export default async function OtpVerificationPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const supabase = await createServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!error && user) {
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id, business_name')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const cookieStore = await cookies();
    if (businessProfile?.business_name) {
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

  if (!searchParams.email) {
    const cookieStore = await cookies();
    const loginUrl = getLocalizedUrlFromRequest('/auth/login', {
      cookies: {
        get: (name: string) => {
          const cookie = cookieStore.get(name);
          return cookie ? { value: cookie.value } : undefined;
        }
      }
    });
    redirect(loginUrl);
  }

  return <OtpVerificationForm email={searchParams.email} />;
}

