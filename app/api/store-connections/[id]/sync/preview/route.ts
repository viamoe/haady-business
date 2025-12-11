import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as shopifySync from '@/lib/sync/shopify-products'
import * as sallaSync from '@/lib/sync/salla-products'

// GET: Preview products before syncing (without saving to database)
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

    console.log('Preview request for connection ID:', connectionId, 'User ID:', user.id)

    // Get connection details
    const { data: connection, error: fetchError } = await supabase
      .from('store_connections')
      .select('id, user_id, platform, access_token, store_domain')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !connection) {
      console.error('Error fetching connection:', fetchError)
      return NextResponse.json(
        { error: 'Store connection not found' },
        { status: 404 }
      )
    }

    // Check if token is expired
    const { data: fullConnection } = await supabase
      .from('store_connections')
      .select('expires_at')
      .eq('id', connectionId)
      .single()

    const isExpired = fullConnection?.expires_at
      ? new Date(fullConnection.expires_at) < new Date()
      : false

    if (isExpired) {
      return NextResponse.json(
        { error: 'Token expired', requiresReauth: true },
        { status: 401 }
      )
    }

    // Preview products based on platform
    console.log('🔄 Starting preview for platform:', connection.platform)

    switch (connection.platform) {
      case 'shopify':
        try {
          const previews = await shopifySync.previewShopifyProducts(
            connection.access_token,
            connection.store_domain || undefined
          )
          console.log(`📦 Preview: Found ${previews.length} products from Shopify`)
          return NextResponse.json({
            success: true,
            products: previews,
            platform: connection.platform,
          })
        } catch (error: any) {
          console.error('Error previewing Shopify products:', error)
          return NextResponse.json(
            { error: error.message || 'Failed to preview products' },
            { status: 500 }
          )
        }

      case 'salla':
        try {
          const previews = await sallaSync.previewSallaProducts(
            connection.access_token
          )
          console.log(`📦 Preview: Found ${previews.length} products from Salla`)
          return NextResponse.json({
            success: true,
            products: previews,
            platform: connection.platform,
          })
        } catch (error: any) {
          console.error('Error previewing Salla products:', error)
          return NextResponse.json(
            { error: error.message || 'Failed to preview products' },
            { status: 500 }
          )
        }

      case 'zid':
        // TODO: Implement Zid preview
        return NextResponse.json(
          { error: 'Zid preview not yet implemented' },
          { status: 501 }
        )

      default:
        return NextResponse.json(
          { error: `Unknown platform: ${connection.platform}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('❌ Exception in preview products:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

