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

  // Get merchant details
  const { data: merchant } = await supabase
    .from('merchants')
    .select('name, status')
    .eq('id', merchantUser.merchant_id)
    .single()

  // Get store count
  const { count: storeCount } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantUser.merchant_id)

  // Get product count
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantUser.merchant_id)

  // Check setup completion status
  const hasStore = (storeCount || 0) > 0
  const hasProducts = (productCount || 0) > 0
  // TODO: Check payment methods and shipping configuration when those features are implemented
  const hasPaymentConfigured = false // Placeholder
  const hasShippingConfigured = false // Placeholder

  const isSetupComplete = hasStore && hasProducts && hasPaymentConfigured && hasShippingConfigured

  // Get store connections
  let storeConnections: any[] = []
  
  try {
    // Query store connections - RLS policies should allow users to see their own
    // First try with all columns to see what exists
    const { data: allData, error: testError } = await supabase
      .from('store_connections')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
    
    if (testError) {
      console.error('Test query error:', testError.message)
    } else if (allData && allData.length > 0) {
      console.log('Available columns:', Object.keys(allData[0]))
    }
    
    // Query store connections - include store_name and store_domain if they exist
    const { data: connections, error: connectionsError } = await supabase
      .from('store_connections')
      .select('id, platform, store_external_id, store_name, store_domain')
      .eq('user_id', user.id)
    
    // Debug: Log the connections to see what we're getting
    if (connections && connections.length > 0) {
      console.log('📦 Fetched connections:', JSON.stringify(connections, null, 2))
      connections.forEach((conn: any, index: number) => {
        console.log(`Connection ${index}:`, {
          id: conn.id,
          idType: typeof conn.id,
          platform: conn.platform,
          hasId: !!conn.id,
        })
      })
    }

    if (connectionsError) {
      // Log full error details
      const errorDetails = {
        message: connectionsError.message,
        details: connectionsError.details,
        hint: connectionsError.hint,
        code: connectionsError.code,
        fullError: connectionsError
      }
      console.error('❌ Error fetching store connections:', JSON.stringify(errorDetails, null, 2))
      
      // Common RLS error codes
      if (connectionsError.code === '42501' || connectionsError.message?.includes('permission denied')) {
        console.error('🔒 RLS Policy Error: User does not have permission to read store_connections')
        console.error('💡 Solution: Run the SQL in docs/database/fix_store_connections_rls.sql to fix RLS policies')
      }
    } else {
      // Map connections with default values for management fields that may not exist yet
      storeConnections = (connections || []).map((conn: any) => ({
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
      console.log('✅ Store connections found:', storeConnections.length, connections)
    }
  } catch (error: any) {
    console.error('💥 Exception fetching store connections:', error?.message || error)
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
