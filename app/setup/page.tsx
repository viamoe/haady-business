import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import SetupForm from './SetupForm';
import { cookies } from 'next/headers';
import { getLocalizedUrlFromRequest } from '@/lib/localized-url';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const supabase = await createServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
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
  
  // Check if user already has a merchant account with a merchant_id
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id')
    .eq('auth_user_id', user.id)
    .single();
  
  if (merchantUser?.merchant_id) {
    // User already has a business, redirect to dashboard
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
  }
  
  return <SetupForm />;
}

