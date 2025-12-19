import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/stores/[id]
 * Update store information
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params
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

    // Get user's business
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id, business_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!businessProfile?.business_name) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, slug, city, country, store_type, delivery_methods, opening_hours, is_active } = body

    const adminClient = createAdminClient()

    // Verify the store exists and belongs to the user's business
    const { data: store, error: storeError } = await adminClient
      .from('stores')
      .select('id, business_id')
      .eq('id', storeId)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Update the store (stores is now the source of truth for all store data)
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (city !== undefined) updateData.city = city || null
    if (country !== undefined) updateData.country = country || null
    if (store_type !== undefined) updateData.store_type = store_type || null
    if (delivery_methods !== undefined) updateData.delivery_methods = delivery_methods || null
    if (opening_hours !== undefined) updateData.opening_hours = opening_hours || null
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedStore, error: updateError } = await adminClient
      .from('stores')
      .update(updateData)
      .eq('id', storeId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating store:', updateError)
      return NextResponse.json(
        { error: 'Failed to update store: ' + updateError.message },
        { status: 500 }
      )
    }

    // Note: is_active is now only in stores table, no need to update store_connections

    return NextResponse.json({
      success: true,
      message: 'Store updated successfully',
      store: updatedStore,
    })
  } catch (error: any) {
    console.error('Unexpected error updating store:', error)
    return NextResponse.json(
      {
        error:
          'An unexpected error occurred: ' + (error.message || 'Unknown error'),
      },
      { status: 500 }
    )
  }
}

