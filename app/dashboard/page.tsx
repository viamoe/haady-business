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
  const { data: businessProfile } = await supabase
    .from('business_profile')
    .select('id, full_name, business_name, status, business_country')
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

  // Extract first name from full_name
  const getFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return user.email?.split('@')[0] || 'there'
    const nameParts = fullName.trim().split(/\s+/)
    return nameParts[0] || user.email?.split('@')[0] || 'there'
  }

  const firstName = getFirstName(businessProfile.full_name)

  // First, get all store IDs for this business
  const { data: storesData } = await supabase
    .from('stores')
    .select('id')
    .eq('business_id', businessProfile.id)

  const storeIds = storesData?.map(store => store.id) || []

  // Parallelize all database queries for better performance
  const [storeCountResult, productCountResult, connectionsResult] = await Promise.all([
    // Get store count
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessProfile.id),
    
    // Get product count (only if we have stores)
    storeIds.length > 0
      ? supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .eq('is_active', true)
          .is('deleted_at', null)
      : Promise.resolve({ data: null, count: 0, error: null }),
    
    // Get store connections via stores (new structure)
    supabase
      .from('stores')
      .select(`
        id,
        name,
        platform,
        store_connections (
          id,
          store_external_id,
          store_domain
        )
      `)
      .eq('business_id', businessProfile.id)
      .eq('is_active', true),
  ])

  // Business data is now directly in businessProfile
  const business = {
    name: businessProfile.business_name,
    status: businessProfile.status,
    country: businessProfile.business_country
  }
  const storeCount = storeCountResult.count || 0
  
  // Handle product count with fallback for deleted_at column
  let productCount = 0
  if (productCountResult.error) {
    // If error is due to deleted_at column not existing, try without it
    if (productCountResult.error.message?.includes('deleted_at') || productCountResult.error.code === '42703') {
      if (storeIds.length > 0) {
        const { count: retryCount } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .eq('is_active', true)
        productCount = retryCount || 0
      }
    } else {
      console.error('Error fetching product count:', productCountResult.error)
    }
  } else {
    productCount = productCountResult.count || 0
  }

  // Fetch country and currency information from database
  let countryCurrency = 'ر.س' // Default to Saudi Riyal symbol
  if (business?.country) {
    const { data: countryData, error: countryError } = await supabase
      .from('countries')
      .select('currency_icon')
      .eq('id', business.country)
      .single()
    
    if (countryError) {
      console.error('Error fetching country currency:', countryError)
    }
    
    // Use currency_icon if available (check for null, undefined, and empty string)
    if (countryData?.currency_icon && countryData.currency_icon.trim() !== '') {
      countryCurrency = countryData.currency_icon.trim()
    } else {
      console.log('Currency icon not found or empty for country:', business.country, 'Country data:', countryData)
    }
  } else {
    console.log('Merchant country not set:', business)
  }

  // Check setup completion status
  const hasStore = storeCount > 0
  const hasProducts = productCount > 0
  // TODO: Check payment methods and shipping configuration when those features are implemented
  const hasPaymentConfigured = false // Placeholder
  const hasShippingConfigured = false // Placeholder

  const isSetupComplete = hasStore && hasProducts && hasPaymentConfigured && hasShippingConfigured

  // Process store connections (transform from stores with connections)
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
        console.error('🔒 RLS Policy Error: User does not have permission to read stores')
      }
    }
  } else {
    // Transform stores with connections to match expected format
    const storesWithConnections = connectionsResult.data || []
    storeConnections = storesWithConnections
      .filter((store: any) => store.store_connections && store.store_connections.length > 0)
      .map((store: any) => {
        const connection = Array.isArray(store.store_connections) 
          ? store.store_connections[0] 
          : store.store_connections
        return {
          id: connection.id,
          platform: store.platform,
          store_external_id: connection.store_external_id,
          store_name: store.name, // From stores table
          store_domain: connection.store_domain,
          connection_status: 'connected',
          sync_status: 'idle',
          last_sync_at: null,
          last_error: null,
          expires_at: null,
          created_at: null,
        }
      })
  }

  return (
    <DashboardContent 
      userName={firstName}
      businessName={business?.name || 'Your Business'}
      storeCount={storeCount || 0}
      productCount={productCount || 0}
      hasStore={hasStore}
      hasProducts={hasProducts}
      hasPaymentConfigured={hasPaymentConfigured}
      hasShippingConfigured={hasShippingConfigured}
      isSetupComplete={isSetupComplete}
      storeConnections={storeConnections}
      countryCurrency={countryCurrency}
    />
  )
}
