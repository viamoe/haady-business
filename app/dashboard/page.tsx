import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { DashboardContent } from './dashboard-content'
import { cookies } from 'next/headers'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
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

  // Check if user has completed setup and get user details
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

  // Extract first name from full_name
  const getFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return user.email?.split('@')[0] || 'there'
    const nameParts = fullName.trim().split(/\s+/)
    return nameParts[0] || user.email?.split('@')[0] || 'there'
  }

  const firstName = getFirstName(merchantUser.full_name)

  // Parallelize all database queries for better performance
  const [merchantResult, storeCountResult, productCountResult, connectionsResult] = await Promise.all([
    // Get merchant details
    supabase
      .from('merchants')
      .select('name, status')
      .eq('id', merchantUser.merchant_id)
      .single(),
    
    // Get store count
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantUser.merchant_id),
    
    // Get product count
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantUser.merchant_id),
    
    // Get store connections
    supabase
      .from('store_connections')
      .select('id, platform, store_external_id, store_name, store_domain')
      .eq('user_id', user.id),
  ])

  const merchant = merchantResult.data
  const storeCount = storeCountResult.count || 0
  const productCount = productCountResult.count || 0

  // Check setup completion status
  const hasStore = storeCount > 0
  const hasProducts = productCount > 0
  // TODO: Check payment methods and shipping configuration when those features are implemented
  const hasPaymentConfigured = false // Placeholder
  const hasShippingConfigured = false // Placeholder

  const isSetupComplete = hasStore && hasProducts && hasPaymentConfigured && hasShippingConfigured

  // Process store connections
  let storeConnections: any[] = []
  
  if (connectionsResult.error) {
    // Only log errors in development
    if (process.env.NODE_ENV === 'development') {
      const errorDetails = {
        message: connectionsResult.error.message,
        details: connectionsResult.error.details,
        hint: connectionsResult.error.hint,
        code: connectionsResult.error.code,
      }
      console.error('❌ Error fetching store connections:', errorDetails)
      
      // Common RLS error codes
      if (connectionsResult.error.code === '42501' || connectionsResult.error.message?.includes('permission denied')) {
        console.error('🔒 RLS Policy Error: User does not have permission to read store_connections')
      }
    }
  } else {
    // Map connections with default values for management fields that may not exist yet
    storeConnections = (connectionsResult.data || []).map((conn: any) => ({
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
    <DashboardContent 
      userName={firstName}
      merchantName={merchant?.name || 'Your Business'}
      storeCount={storeCount || 0}
      productCount={productCount || 0}
      hasStore={hasStore}
      hasProducts={hasProducts}
      hasPaymentConfigured={hasPaymentConfigured}
      hasShippingConfigured={hasShippingConfigured}
      isSetupComplete={isSetupComplete}
      storeConnections={storeConnections}
    />
  )
}
