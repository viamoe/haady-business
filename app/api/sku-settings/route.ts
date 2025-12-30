import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// GET /api/sku-settings - Get SKU settings for current store
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('store_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!businessProfile?.store_id) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 })
    }

    // Get SKU settings
    const { data: settings, error: settingsError } = await supabase
      .from('sku_settings')
      .select('*')
      .eq('store_id', businessProfile.store_id)
      .maybeSingle()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching SKU settings:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        settings: {
          sku_prefix: 'PROD',
          sku_separator: '-',
          sku_include_date: false,
          sku_date_format: 'YYMM',
          sku_sequence_length: 6,
          sku_use_product_name: false,
          sku_auto_generate: true,
          barcode_type: 'INTERNAL',
          barcode_prefix: '200',
          barcode_auto_generate: true,
          prefer_external_sku: false,
          prefer_external_barcode: false,
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in GET /api/sku-settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/sku-settings - Update SKU settings
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's store
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('store_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!businessProfile?.store_id) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      sku_prefix,
      sku_separator,
      sku_include_date,
      sku_date_format,
      sku_sequence_length,
      sku_use_product_name,
      sku_auto_generate,
      barcode_type,
      barcode_prefix,
      barcode_auto_generate,
      prefer_external_sku,
      prefer_external_barcode,
    } = body

    // Upsert settings
    const { data: settings, error: upsertError } = await supabase
      .from('sku_settings')
      .upsert({
        store_id: businessProfile.store_id,
        sku_prefix,
        sku_separator,
        sku_include_date,
        sku_date_format,
        sku_sequence_length,
        sku_use_product_name,
        sku_auto_generate,
        barcode_type,
        barcode_prefix,
        barcode_auto_generate,
        prefer_external_sku,
        prefer_external_barcode,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'store_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting SKU settings:', upsertError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in PUT /api/sku-settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

