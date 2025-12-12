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

  // Get store connections
  const { data: connectionsData, error: connectionsError } = await supabase
    .from('store_connections')
    .select('id, platform, store_external_id, store_name, store_domain')
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

