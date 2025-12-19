import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/stores
 * Create a new Haady store (without external connection)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get business profile
    const { data: businessProfile, error: businessError } = await supabase
      .from('business_profile')
      .select('id, business_name, business_country')
      .eq('auth_user_id', user.id)
      .single()

    if (businessError || !businessProfile || !businessProfile.business_name) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Get business's country from business_profile
    const adminClient = createAdminClient()
    let defaultCountry: string | null = null
    if (businessProfile.business_country) {
      // Get country name from countries table
      const { data: countryData, error: countryError } = await adminClient
        .from('countries')
        .select('name')
        .eq('id', businessProfile.business_country)
        .single()

      if (!countryError && countryData?.name) {
        defaultCountry = countryData.name
      }
    }

    const {
      name,
      slug,
      store_type = 'online',
      country,
      city,
      address,
      minimum_order_amount,
      description,
    } = await request.json()

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existingStore } = await adminClient
      .from('stores')
      .select('id')
      .eq('slug', slug.trim().toLowerCase())
      .single()

    if (existingStore) {
      return NextResponse.json(
        { error: 'A store with this slug already exists. Please use a different slug.' },
        { status: 400 }
      )
    }

    // Create the Haady store (standalone, no external connection)
    const { data: newStore, error: insertError } = await adminClient
      .from('stores')
      .insert({
        business_id: businessProfile.id,
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        store_type: store_type || 'online',
        country: country?.trim() || defaultCountry || null,
        city: city?.trim() || null,
        address: address?.trim() || null,
        minimum_order_amount: minimum_order_amount ? parseFloat(minimum_order_amount.toString()) : null,
        description: description?.trim() || null,
        platform: 'haady',
        store_connection_id: null,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating store:', insertError)
      return NextResponse.json(
        { error: 'Failed to create store: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Store created successfully',
      store: newStore,
    })
  } catch (error: any) {
    console.error('Unexpected error creating store:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

