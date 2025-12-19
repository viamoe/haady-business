import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getLocalizedUrlFromRequest } from '@/lib/localized-url'
import { StoresContent } from './stores-content'

export const dynamic = 'force-dynamic'

export default async function StoresPage() {
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

  // Fetch all stores for this business (including Haady stores)
  // Include store_connections to get connection ID (new structure: store_connections.store_id -> stores.id)
  const { data: storesData, error: storesError } = await supabase
    .from('stores')
    .select(`
      id,
      name,
      slug,
      logo_url,
      platform,
      store_type,
      country,
      city,
      is_active,
      created_at,
      delivery_methods,
      opening_hours,
      store_connections (
        id
      )
    `)
    .eq('business_id', businessProfile.id)
    .order('created_at', { ascending: false })

  if (storesError) {
    console.error('Error fetching stores:', storesError)
  }

  const stores = storesData || []

  // Transform stores to include store_connection_id from the relationship
  const transformedStores = stores.map((store: any) => {
    const connection = Array.isArray(store.store_connections) 
      ? store.store_connections[0] 
      : store.store_connections
    return {
      ...store,
      store_connection_id: connection?.id || null,
    }
  })

  // Fetch product counts for each store
  // Use individual queries per store to avoid RLS issues
  const storesWithCounts = await Promise.all(
    transformedStores.map(async (store) => {
      try {
        // Try to fetch count with filters first
        const { count, error: countError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('is_active', true)
          .is('deleted_at', null)

        if (countError) {
          // If error, try without filters (might be RLS issue)
          const { count: countWithoutFilters, error: errorWithoutFilters } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', store.id)

          if (errorWithoutFilters) {
            console.error(`Error fetching product count for store ${store.id}:`, errorWithoutFilters)
            return {
              ...store,
              product_count: 0,
            }
          }

          return {
            ...store,
            product_count: countWithoutFilters ?? 0,
          }
        }

        return {
          ...store,
          product_count: count ?? 0,
        }
      } catch (error) {
        console.error(`Exception fetching product count for store ${store.id}:`, error)
        return {
          ...store,
          product_count: 0,
        }
      }
    })
  )

  return (
    <StoresContent stores={storesWithCounts} />
  )
}

