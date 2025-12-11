import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Refresh an expired token
export async function POST(
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

    // Get connection details
    const { data: connection, error: fetchError } = await supabase
      .from('store_connections')
      .select('id, user_id, platform, refresh_token')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Store connection not found' },
        { status: 404 }
      )
    }

    if (!connection.refresh_token) {
      return NextResponse.json(
        { error: 'No refresh token available. Please reconnect your store.' },
        { status: 400 }
      )
    }

    // Refresh token based on platform
    const refreshResult = await refreshPlatformToken(
      connection.platform,
      connection.refresh_token
    )

    if (!refreshResult.success) {
      // Update connection status to expired/error (only if columns exist)
      try {
        await supabase
          .from('store_connections')
          .update({
            connection_status: 'expired',
            last_error: refreshResult.error || 'Token refresh failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connectionId)
      } catch (updateError: any) {
        // Columns might not exist yet, that's okay
        console.log('Note: status columns may not exist yet:', updateError.message)
      }

      return NextResponse.json(
        { error: refreshResult.error || 'Failed to refresh token', requiresReauth: true },
        { status: 401 }
      )
    }

    // Update connection with new tokens
    // Build update object with only fields that might exist
    const updateData: any = {
      access_token: refreshResult.access_token,
      refresh_token: refreshResult.refresh_token || connection.refresh_token,
    }

    // Only add these fields if columns exist (they may not exist before migration)
    try {
      // Try to update with all fields
      const updatePayload: any = {
        ...updateData,
        expires_at: refreshResult.expires_at || null,
        connection_status: 'connected',
        last_error: null,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('store_connections')
        .update(updatePayload)
        .eq('id', connectionId)

      if (updateError && updateError.message?.includes('does not exist')) {
        // Columns don't exist yet, just update the basic fields
        const { error: basicUpdateError } = await supabase
          .from('store_connections')
          .update(updateData)
          .eq('id', connectionId)

        if (basicUpdateError) {
          throw basicUpdateError
        }
      } else if (updateError) {
        throw updateError
      }
    } catch (updateError: any) {
      // Fallback to basic update
      const { error: basicUpdateError } = await supabase
        .from('store_connections')
        .update(updateData)
        .eq('id', connectionId)

      if (basicUpdateError) {
        console.error('Error updating tokens:', basicUpdateError)
        return NextResponse.json(
          { error: 'Failed to save new tokens', details: basicUpdateError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    })
  } catch (error: any) {
    console.error('Exception in refresh token:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Platform-specific token refresh logic
async function refreshPlatformToken(
  platform: string,
  refreshToken: string
): Promise<{
  success: boolean
  access_token?: string
  refresh_token?: string
  expires_at?: string
  error?: string
}> {
  switch (platform) {
    case 'salla':
      return await refreshSallaToken(refreshToken)
    case 'zid':
      // TODO: Implement Zid token refresh
      return { success: false, error: 'Zid token refresh not yet implemented' }
    case 'shopify':
      // TODO: Implement Shopify token refresh
      return { success: false, error: 'Shopify token refresh not yet implemented' }
    default:
      return { success: false, error: `Unknown platform: ${platform}` }
  }
}

// Salla token refresh
async function refreshSallaToken(refreshToken: string): Promise<{
  success: boolean
  access_token?: string
  refresh_token?: string
  expires_at?: string
  error?: string
}> {
  try {
    const clientId = process.env.NEXT_PUBLIC_SALLA_CLIENT_ID
    const clientSecret = process.env.SALLA_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Salla credentials not configured' }
    }

    const response = await fetch('https://accounts.salla.sa/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Salla token refresh failed:', errorText)
      return { success: false, error: 'Failed to refresh Salla token' }
    }

    const data = await response.json()
    const { access_token, refresh_token, expires_in } = data

    if (!access_token) {
      return { success: false, error: 'Invalid token response' }
    }

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : undefined

    return {
      success: true,
      access_token,
      refresh_token: refresh_token || refreshToken,
      expires_at: expiresAt,
    }
  } catch (error: any) {
    console.error('Exception refreshing Salla token:', error)
    return { success: false, error: error.message || 'Token refresh failed' }
  }
}

