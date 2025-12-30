import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/gift-codes/analytics - Get gift analytics for the user's store
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]

    // Get user's business and stores
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!businessProfile) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get stores
    let storeIds: string[] = []
    if (storeId) {
      // Verify store belongs to user
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .eq('business_id', businessProfile.id)
        .single()
      
      if (!store) {
        return NextResponse.json({ error: 'Store not found or unauthorized' }, { status: 403 })
      }
      storeIds = [storeId]
    } else {
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('business_id', businessProfile.id)
      
      if (!stores || stores.length === 0) {
        return NextResponse.json({ error: 'No stores found' }, { status: 404 })
      }
      storeIds = stores.map(s => s.id)
    }

    // Get analytics using the RPC function
    const { data: analytics, error } = await supabase.rpc('get_gift_analytics', {
      p_store_id: storeIds[0], // For now, use first store
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) throw error

    // Get recent activity
    const { data: recentScans } = await supabase
      .from('gift_code_scans')
      .select(`
        id,
        scanned_at,
        scan_source,
        converted,
        code:gift_codes(
          code,
          product:products(name_en, image_url)
        )
      `)
      .in('code_id', (
        await supabase
          .from('gift_codes')
          .select('id')
          .in('store_id', storeIds)
      ).data?.map(c => c.id) || [])
      .order('scanned_at', { ascending: false })
      .limit(10)

    // Get recent orders
    const { data: recentOrders } = await supabase
      .from('gift_orders')
      .select(`
        id,
        order_number,
        recipient_username,
        total_amount,
        status,
        created_at,
        product:products(name_en, image_url)
      `)
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      ...analytics,
      recent_scans: recentScans || [],
      recent_orders: recentOrders || [],
    })
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

