import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// POST /api/gift-codes/scan - Record a gift code scan (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    const body = await request.json()
    const { code, session_id, source, device_info, latitude, longitude } = body

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Get IP and user agent from request headers
    const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') ||
                       null
    const user_agent = request.headers.get('user-agent')
    const referrer = request.headers.get('referer')

    // Call the record_gift_scan function
    const { data, error } = await supabase.rpc('record_gift_scan', {
      p_code: code,
      p_user_id: user?.id || null,
      p_session_id: session_id || null,
      p_source: source || 'qr',
      p_device_info: device_info || {},
      p_ip_address: ip_address,
      p_user_agent: user_agent,
      p_latitude: latitude || null,
      p_longitude: longitude || null,
    })

    if (error) throw error

    // Check if the scan was successful
    if (!data.success) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error recording scan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record scan' },
      { status: 500 }
    )
  }
}

// GET /api/gift-codes/scan?code=XXX - Get product info for a gift code (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Find the gift code
    const { data: giftCode, error } = await supabase
      .from('gift_codes')
      .select(`
        id,
        code,
        is_active,
        expires_at,
        max_uses,
        current_uses,
        custom_message,
        discount_percent,
        discount_amount,
        product:products(
          id,
          name_en,
          name_ar,
          description_en,
          description_ar,
          price,
          image_url,
          sku
        ),
        store:stores(
          id,
          name,
          name_ar,
          logo_url
        )
      `)
      .eq('code', code)
      .single()

    if (error || !giftCode) {
      return NextResponse.json({ error: 'Gift code not found' }, { status: 404 })
    }

    // Check if code is active
    if (!giftCode.is_active) {
      return NextResponse.json({ error: 'This gift code is no longer active' }, { status: 400 })
    }

    // Check expiration
    if (giftCode.expires_at && new Date(giftCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This gift code has expired' }, { status: 400 })
    }

    // Check max uses
    if (giftCode.max_uses && giftCode.current_uses >= giftCode.max_uses) {
      return NextResponse.json({ error: 'This gift code has reached its usage limit' }, { status: 400 })
    }

    return NextResponse.json({
      code: giftCode.code,
      product: giftCode.product,
      store: giftCode.store,
      message: giftCode.custom_message,
      discount: {
        percent: giftCode.discount_percent,
        amount: giftCode.discount_amount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching gift code:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gift code' },
      { status: 500 }
    )
  }
}

