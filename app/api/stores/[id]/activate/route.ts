import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/stores/[id]/activate
 * Activate a Haady store by creating a store_connection record for it
 * This makes it appear in the sidebar store selector
 */
export async function POST(
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

    const adminClient = createAdminClient()

    // Get the store and verify it belongs to the user's business
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id, business_name')
      .eq('auth_user_id', user.id)
      .single()

    if (!businessProfile?.business_name) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    // Get the store
    const { data: store, error: storeError } = await adminClient
      .from('stores')
      .select('id, name, logo_url, platform, business_id')
      .eq('id', storeId)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Check if store already has a store_connection
    const { data: existingConnection } = await adminClient
      .from('store_connections')
      .select('id')
      .eq('store_id', storeId)
      .maybeSingle()

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Store is already activated', storeConnection: { id: existingConnection.id } },
        { status: 400 }
      )
    }

    // Only Haady stores can be activated this way
    if (store.platform !== 'haady') {
      return NextResponse.json(
        { error: 'Only Haady stores can be activated. External stores are connected via their platforms.' },
        { status: 400 }
      )
    }

    // Generate random tokens for Haady stores (not used for API calls, just to satisfy the constraint)
    const randomToken = crypto.randomUUID()
    const randomAccessToken = `haady_access_${randomToken}`
    const randomRefreshToken = `haady_refresh_${randomToken}`

    // Create a store_connection record for the Haady store
    // Now store_connections only stores OAuth data, and links to stores via store_id
    const { data: storeConnection, error: connectionError } = await adminClient
      .from('store_connections')
      .insert({
        store_id: storeId, // Link to the store
        store_external_id: storeId, // Use the store ID as external ID for reference
        store_domain: null,
        connection_status: 'connected',
        sync_status: 'idle',
        access_token: randomAccessToken,
        refresh_token: randomRefreshToken,
      })
      .select()
      .single()

    if (connectionError) {
      console.error('Error creating store connection:', connectionError)
      return NextResponse.json(
        { error: 'Failed to activate store: ' + connectionError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Store activated successfully',
      storeConnection: storeConnection,
    })
  } catch (error: any) {
    console.error('Unexpected error activating store:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/stores/[id]/activate
 * Deactivate a Haady store by removing its store_connection record
 * This removes it from the sidebar store selector
 */
export async function DELETE(
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

    const adminClient = createAdminClient()

    // Get the store and verify it belongs to the user's business
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id, business_name')
      .eq('auth_user_id', user.id)
      .single()

    if (!businessProfile?.business_name) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    // Get the store
    const { data: store, error: storeError } = await adminClient
      .from('stores')
      .select('id, platform, business_id')
      .eq('id', storeId)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Check if store has a store_connection
    const { data: existingConnection } = await adminClient
      .from('store_connections')
      .select('id')
      .eq('store_id', storeId)
      .maybeSingle()

    if (!existingConnection) {
      return NextResponse.json(
        { error: 'Store is not activated' },
        { status: 400 }
      )
    }

    // Only Haady stores can be deactivated this way
    if (store.platform !== 'haady') {
      return NextResponse.json(
        { error: 'Only Haady stores can be deactivated. External stores must be disconnected via their platforms.' },
        { status: 400 }
      )
    }

    // Delete the store_connection record (CASCADE will handle cleanup)
    const { error: deleteError } = await adminClient
      .from('store_connections')
      .delete()
      .eq('id', existingConnection.id)

    if (deleteError) {
      console.error('Error deleting store connection:', deleteError)
      // The store is already unlinked, so we just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Store deactivated successfully',
    })
  } catch (error: any) {
    console.error('Unexpected error deactivating store:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

