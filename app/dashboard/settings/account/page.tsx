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
  const { data: businessProfile } = await supabase
    .from('business_profile')
    .select('id, full_name, store_id, is_onboarded, onboarding_step, status, created_at')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!businessProfile?.is_onboarded && businessProfile?.onboarding_step !== null) {
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

  // Get all stores count for this business
  const { count: storeCount } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessProfile.id)

  // Get the primary store name
  let storeName = null
  if (businessProfile.store_id) {
    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', businessProfile.store_id)
      .maybeSingle()
    storeName = store?.name
  }

  // Create business object from business_profile (data is now merged)
  const business = {
    id: businessProfile.id,
    name: storeName || 'My Business',
    status: businessProfile.status,
    created_at: businessProfile.created_at
  }

  return (
    <AccountSettingsContent 
      business={business}
      businessUser={businessProfile}
      storeCount={storeCount || 0}
    />
  )
}

