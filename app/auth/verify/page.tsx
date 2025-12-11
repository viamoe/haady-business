import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import OtpVerificationForm from './OtpVerificationForm';
import { cookies } from 'next/headers';
import { getLocalizedUrlFromRequest } from '@/lib/localized-url';

export default async function OtpVerificationPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const supabase = await createServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!error && user) {
    const { data: merchantUser } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', user.id)
      .single();

    const cookieStore = await cookies();
    if (merchantUser) {
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

