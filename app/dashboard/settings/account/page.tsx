import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'
import { AccountSettingsContent } from './account-settings-content'

export const dynamic = 'force-dynamic'

export default async function AccountSettingsPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
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

  // Check if user has completed setup
  const { data: merchantUser } = await supabase
    .from('merchant_users')
    .select('merchant_id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!merchantUser?.merchant_id) {
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

  // Get merchant details
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('id, name, status, created_at')
    .eq('id', merchantUser.merchant_id)
    .single()

  // Get all stores count for this merchant
  const { count: storeCount } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantUser.merchant_id)

  return (
    <AccountSettingsContent 
      merchant={merchant}
      merchantUser={merchantUser}
      storeCount={storeCount || 0}
    />
  )
}

