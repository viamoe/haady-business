import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// GET /api/gift-codes - Get all gift codes for the user's store
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's business and stores
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!businessProfile) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: stores } = await supabase
      .from('stores')
      .select('id')
      .eq('business_id', businessProfile.id)

    if (!stores || stores.length === 0) {
      return NextResponse.json({ error: 'No stores found' }, { status: 404 })
    }

    const storeIds = stores.map(s => s.id)

    // Get gift codes with product info
    const { data: giftCodes, error } = await supabase
      .from('gift_codes')
      .select(`
        *,
        product:products(id, name_en, name_ar, sku, price, image_url)
      `)
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(giftCodes || [])
  } catch (error: any) {
    console.error('Error fetching gift codes:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gift codes' },
      { status: 500 }
    )
  }
}

// POST /api/gift-codes - Create a new gift code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, store_id, branch_id, custom_message, discount_percent, discount_amount, max_uses, expires_at, qr_style } = body

    if (!product_id || !store_id) {
      return NextResponse.json(
        { error: 'product_id and store_id are required' },
        { status: 400 }
      )
    }

    // Verify store ownership
    const { data: store } = await supabase
      .from('stores')
      .select('business_id')
      .eq('id', store_id)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('id', store.business_id)
      .single()

    if (!businessProfile) {
      return NextResponse.json({ error: 'Unauthorized access to store' }, { status: 403 })
    }

    // Create gift code
    const { data: giftCode, error } = await supabase
      .from('gift_codes')
      .insert({
        product_id,
        store_id,
        branch_id: branch_id || null,
        custom_message: custom_message || null,
        discount_percent: discount_percent || null,
        discount_amount: discount_amount || null,
        max_uses: max_uses || null,
        expires_at: expires_at || null,
        qr_style: qr_style || { foreground: '#F4610B', background: '#FFFFFF' },
        created_by: user.id,
      })
      .select(`
        *,
        product:products(id, name_en, name_ar, sku, price, image_url)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(giftCode, { status: 201 })
  } catch (error: any) {
    console.error('Error creating gift code:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create gift code' },
      { status: 500 }
    )
  }
}

