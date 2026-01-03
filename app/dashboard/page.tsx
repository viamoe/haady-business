import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { DashboardContent } from './dashboard-content'
import { cookies } from 'next/headers'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'

// Cache for 60 seconds, revalidate on demand
export const revalidate = 60
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
    .select('id, full_name, status, business_country, is_onboarded, onboarding_step, store_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Check if onboarding is completed
  const isOnboardingComplete = businessProfile && (
    businessProfile.is_onboarded === true || 
    businessProfile.onboarding_step === null
  );

  if (!businessProfile || !isOnboardingComplete) {
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

  // First, get all store IDs and names for this business (optimize: get name here too)
  const { data: storesData } = await supabase
    .from('stores')
    .select('id, name')
    .eq('business_id', businessProfile.id)

  const storeIds = storesData?.map(store => store.id) || []
  
  // Get primary store name early if available
  let businessName = 'Your Business'
  if (businessProfile?.store_id && storesData) {
    const primaryStore = storesData.find(store => store.id === businessProfile.store_id)
    if (primaryStore?.name) {
      businessName = primaryStore.name
    }
  }
  
  // Store country for use in parallel query
  const businessCountry = businessProfile?.business_country

  // Calculate date ranges for today, week, month, year
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)
  
  const monthStart = new Date(now)
  monthStart.setDate(monthStart.getDate() - 30)
  
  const yearStart = new Date(now)
  yearStart.setFullYear(yearStart.getFullYear() - 1)

  // Parallelize all database queries for better performance
  // Also fetch country currency in parallel to avoid sequential query
  const [storeCountResult, productCountResult, connectionsResult, ordersTodayResult, ordersWeekResult, ordersMonthResult, ordersYearResult, salesTodayResult, salesWeekResult, salesMonthResult, salesYearResult, countryCurrencyResult] = await Promise.all([
    // Get store count
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessProfile.id),
    
    // Get product count (only if we have stores, exclude trashed products)
    storeIds.length > 0
      ? supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .eq('is_active', true)
          .is('deleted_at', null)
      : Promise.resolve({ data: null, count: 0, error: null } as { data: null; count: number; error: null }),
    
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
    
    // Get orders count for today
    storeIds.length > 0
      ? supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .gte('created_at', todayStart.toISOString())
      : Promise.resolve({ data: null, count: 0, error: null } as { data: null; count: number; error: null }),
    
    // Get orders count for week
    storeIds.length > 0
      ? supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .gte('created_at', weekStart.toISOString())
      : Promise.resolve({ data: null, count: 0, error: null } as { data: null; count: number; error: null }),
    
    // Get orders count for month
    storeIds.length > 0
      ? supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .gte('created_at', monthStart.toISOString())
      : Promise.resolve({ data: null, count: 0, error: null } as { data: null; count: number; error: null }),
    
    // Get orders count for year
    storeIds.length > 0
      ? supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .gte('created_at', yearStart.toISOString())
      : Promise.resolve({ data: null, count: 0, error: null } as { data: null; count: number; error: null }),
    
    // Get sales (total_amount) for today (only paid orders)
    storeIds.length > 0
      ? supabase
          .from('orders')
          .select('total_amount')
          .in('store_id', storeIds)
          .gte('created_at', todayStart.toISOString())
          .eq('payment_status', 'paid')
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
    
    // Get sales for week
    storeIds.length > 0
      ? supabase
          .from('orders')
          .select('total_amount')
          .in('store_id', storeIds)
          .gte('created_at', weekStart.toISOString())
          .eq('payment_status', 'paid')
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
    
    // Get sales for month
    storeIds.length > 0
      ? supabase
          .from('orders')
          .select('total_amount')
          .in('store_id', storeIds)
          .gte('created_at', monthStart.toISOString())
          .eq('payment_status', 'paid')
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
    
    // Get sales for year
    storeIds.length > 0
      ? supabase
          .from('orders')
          .select('total_amount')
          .in('store_id', storeIds)
          .gte('created_at', yearStart.toISOString())
          .eq('payment_status', 'paid')
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
    
    // Fetch country currency in parallel (optimize: avoid sequential query)
    businessCountry
      ? supabase
          .from('countries')
          .select('currency_icon')
          .eq('id', businessCountry)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as { data: null; error: null }),
  ])

  // Business name already set above

  // Business data (use businessProfile.country directly to avoid extra query)
  const business = {
    name: businessName,
    status: businessProfile?.status,
    country: businessProfile?.business_country
  }
  const storeCount = storeCountResult.count || 0
  
  // Handle product count
  let productCount = 0
  if (productCountResult.error) {
    const errorMessage = productCountResult.error.message || ''
    const errorCode = productCountResult.error.code || ''
    
    // Log the error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching product count:', {
        error: productCountResult.error,
        message: errorMessage,
        code: errorCode,
        storeIds: storeIds,
        storeIdsLength: storeIds.length
      })
    }
    
    // Try to retry without is_active filter if that's causing issues
    if (storeIds.length > 0) {
      const { count: retryCount, error: retryError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .in('store_id', storeIds)
      
      if (retryError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching product count (retry failed):', retryError)
        }
        productCount = 0
      } else {
        productCount = retryCount || 0
        if (process.env.NODE_ENV === 'development') {
          console.log('Product count (retry successful):', productCount)
        }
      }
    } else {
      productCount = 0
    }
  } else {
    productCount = productCountResult.count || 0
    if (process.env.NODE_ENV === 'development') {
      console.log('Product count:', productCount, 'storeIds:', storeIds)
    }
  }

  // Get country currency from parallel query result
  let countryCurrency = 'ر.س' // Default to Saudi Riyal symbol
  if (countryCurrencyResult?.data?.currency_icon && countryCurrencyResult.data.currency_icon.trim() !== '') {
    countryCurrency = countryCurrencyResult.data.currency_icon.trim()
  } else if (countryCurrencyResult?.error && process.env.NODE_ENV === 'development') {
    console.error('Error fetching country currency:', countryCurrencyResult.error)
  }

  // Calculate sales totals
  const calculateSalesTotal = (ordersData: any[] | null) => {
    if (!ordersData || ordersData.length === 0) return 0
    return ordersData.reduce((sum, order) => sum + (parseFloat(order.total_amount?.toString() || '0') || 0), 0)
  }

  const salesToday = calculateSalesTotal(salesTodayResult.data)
  const salesWeek = calculateSalesTotal(salesWeekResult.data)
  const salesMonth = calculateSalesTotal(salesMonthResult.data)
  const salesYear = calculateSalesTotal(salesYearResult.data)

  // Get orders counts
  const ordersToday = ordersTodayResult.count || 0
  const ordersWeek = ordersWeekResult.count || 0
  const ordersMonth = ordersMonthResult.count || 0
  const ordersYear = ordersYearResult.count || 0

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
      initialSalesData={{
        today: salesToday,
        week: salesWeek,
        month: salesMonth,
        year: salesYear,
      }}
      initialOrdersData={{
        today: ordersToday,
        week: ordersWeek,
        month: ordersMonth,
        year: ordersYear,
      }}
      storeIds={storeIds}
    />
  )
}
