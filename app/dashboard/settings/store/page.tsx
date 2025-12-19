import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'
import { StoreSettingsContent } from './store-settings-content'

export const dynamic = 'force-dynamic'

export default async function StoreSettingsPage() {
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
    .select('id, business_name, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!businessProfile?.business_name) {
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

  // Get store connections (external platform connections like Salla, Shopify, etc.)
  const { data: connectionsData, error: connectionsError } = await supabase
    .from('store_connections')
    .select('id, platform, store_external_id, store_name, store_domain, store_logo_url, logo_zoom')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  let storeConnections: any[] = []
  
  if (connectionsError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching store connections:', connectionsError)
    }
  } else {
    storeConnections = (connectionsData || []).map((conn: any) => ({
      ...conn,
      store_name: conn.store_name || null,
      store_domain: conn.store_domain || null,
      connection_status: 'connected',
      sync_status: 'idle',
      last_sync_at: null,
      last_error: null,
      expires_at: null,
      created_at: null,
    }))
  }

  return (
    <StoreSettingsContent storeConnections={storeConnections} />
  )
}

