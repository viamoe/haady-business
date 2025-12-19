import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabase()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get business profile
    const { data: businessProfile, error: businessError } = await supabase
      .from('business_profile')
      .select('id, business_name')
      .eq('auth_user_id', user.id)
      .single()

    if (businessError || !businessProfile) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    // Get store connection ID from query params (optional)
    const storeConnectionId = searchParams.get('storeConnectionId')

    // Get store IDs - filter by store connection if provided, otherwise get all stores for business
    let storeIds: string[] = []
    
    if (storeConnectionId) {
      // Filter by selected store connection
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('store_connection_id', storeConnectionId)
        .eq('is_active', true)

      if (storesError) {
        return NextResponse.json(
          { error: 'Failed to fetch stores', details: storesError.message },
          { status: 500 }
        )
      }

      storeIds = stores?.map(s => s.id) || []
    } else {
      // Get all store IDs for this business (fallback for backward compatibility)
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('business_id', businessProfile.id)
        .eq('is_active', true)

      if (storesError) {
        return NextResponse.json(
          { error: 'Failed to fetch stores', details: storesError.message },
          { status: 500 }
        )
      }

      storeIds = stores?.map(s => s.id) || []
    }

    if (storeIds.length === 0) {
      return NextResponse.json({ products: [], count: 0 })
    }

    // Search products by name, description, SKU, or ID (UUID)
    // Note: products table uses name_en/name_ar and description_en/description_ar, not name/description
    // Use the search term directly - ilike handles Arabic/Unicode text correctly
    const searchTerm = query.trim()
    
    // Check if search term looks like a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm)
    
    // Build the query with OR condition for name (en/ar), description (en/ar), SKU, or ID
    // PostgREST format: column.operator.value,column.operator.value
    // Note: id is UUID type, so we can only use exact match (eq), not ilike
    // For partial UUID searches, we'll search in text fields and SKU
    let orCondition: string
    if (isUUID) {
      // If it's a full UUID, search by exact ID match or pattern match in other fields
      orCondition = `id.eq.${searchTerm},name_en.ilike.%${searchTerm}%,name_ar.ilike.%${searchTerm}%,description_en.ilike.%${searchTerm}%,description_ar.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`
    } else {
      // For regular search (including partial UUIDs), use pattern matching for text fields and SKU
      // Note: Can't use ilike on UUID column, so we search in name, description, and SKU only
      orCondition = `name_en.ilike.%${searchTerm}%,name_ar.ilike.%${searchTerm}%,description_en.ilike.%${searchTerm}%,description_ar.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`
    }
    
    const { data: products, error: productsError, count } = await supabase
      .from('products')
      .select('id, name_en, name_ar, description_en, description_ar, price, sku, image_url, is_available, is_active, created_at, store_id', { count: 'exact' })
      .in('store_id', storeIds)
      .eq('is_active', true)
      .or(orCondition)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (productsError) {
      console.error('Products search error:', {
        error: productsError,
        message: productsError.message,
        code: productsError.code,
        details: productsError.details,
        hint: productsError.hint,
        query: query.trim(),
        searchTerm,
        orCondition
      })
      return NextResponse.json(
        { error: 'Failed to search products', details: productsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      products: products || [],
      count: count || 0,
      query: query.trim()
    })
  } catch (error: any) {
    console.error('Error in products search API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
