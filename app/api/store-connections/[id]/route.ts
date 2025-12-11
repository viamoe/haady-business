import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE: Disconnect a store
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const connectionId = resolvedParams.id

    console.log('🗑️ DELETE request for connection ID:', connectionId, 'User ID:', user.id)

    // First, let's see all connections for this user
    const { data: allUserConnections } = await supabase
      .from('store_connections')
      .select('id, user_id, platform')
      .eq('user_id', user.id)
    
    console.log('📋 All user connections:', allUserConnections)
    console.log('🔍 Looking for connection ID:', connectionId)
    console.log('🔍 Connection ID type:', typeof connectionId)

    // Verify the connection belongs to the user
    const { data: connection, error: fetchError } = await supabase
      .from('store_connections')
      .select('id, user_id, platform')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching connection:', fetchError)
      console.error('Connection ID searched:', connectionId)
      console.error('User ID:', user.id)
      
      return NextResponse.json(
        { 
          error: 'Store connection not found',
          details: fetchError.message,
          connectionId,
          userConnections: allUserConnections?.map(c => ({ id: c.id, platform: c.platform })),
          searchedId: connectionId,
        },
        { status: 404 }
      )
    }

    if (!connection) {
      console.error('❌ Connection is null for ID:', connectionId)
      return NextResponse.json(
        { 
          error: 'Store connection not found',
          connectionId,
          userConnections: allUserConnections?.map(c => ({ id: c.id, platform: c.platform })),
        },
        { status: 404 }
      )
    }

    console.log('✅ Connection found:', { id: connection.id, platform: connection.platform })

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('store_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting store connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect store', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${connection.platform} store disconnected successfully`,
    })
  } catch (error: any) {
    console.error('Exception in DELETE store connection:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET: Get connection details and health status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const connectionId = resolvedParams.id

    // Get connection details - only select fields that exist
    const { data: connection, error: fetchError } = await supabase
      .from('store_connections')
      .select('id, platform, store_external_id')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Store connection not found' },
        { status: 404 }
      )
    }

    // Try to get additional fields if they exist (they may not exist before migration)
    const { data: fullConnection } = await supabase
      .from('store_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    // Merge with defaults for missing fields
    const connectionWithDefaults = {
      ...connection,
      connection_status: fullConnection?.connection_status || 'connected',
      sync_status: fullConnection?.sync_status || 'idle',
      last_sync_at: fullConnection?.last_sync_at || null,
      last_error: fullConnection?.last_error || null,
      expires_at: fullConnection?.expires_at || null,
      created_at: fullConnection?.created_at || null,
    }

    // Check if token is expired
    const isExpired = connectionWithDefaults.expires_at 
      ? new Date(connectionWithDefaults.expires_at) < new Date()
      : false

    // Determine health status
    let healthStatus = connectionWithDefaults.connection_status || 'connected'
    if (isExpired) {
      healthStatus = 'expired'
    } else if (connectionWithDefaults.last_error) {
      healthStatus = 'error'
    }

    return NextResponse.json({
      connection: {
        ...connectionWithDefaults,
        healthStatus,
        isExpired,
      },
    })
  } catch (error: any) {
    console.error('Exception in GET store connection:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

