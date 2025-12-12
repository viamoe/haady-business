import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { syncSallaProducts, syncSallaInventory } from '@/lib/sync/salla-products'
import { syncShopifyProducts, syncShopifyInventory } from '@/lib/sync/shopify-products'

// POST: Trigger a manual sync for a store connection
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
    const body = await request.json().catch(() => ({}))
    const syncType = body.type || 'all' // 'products', 'inventory', 'orders', 'all'
    const selectedProductIds = body.selectedProductIds // Array of product IDs to sync (optional)

    console.log('Sync request for connection ID:', connectionId, 'User ID:', user.id)

    // Get connection details - handle missing columns gracefully
    const { data: connection, error: fetchError } = await supabase
      .from('store_connections')
      .select('id, user_id, platform, access_token, refresh_token')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching connection:', fetchError)
      console.error('Connection ID:', connectionId)
      console.error('User ID:', user.id)
      
      // Try to see if connection exists at all
      const { data: allConnections } = await supabase
        .from('store_connections')
        .select('id, user_id, platform')
        .eq('user_id', user.id)
      
      console.log('All user connections:', allConnections)
      
      return NextResponse.json(
        { 
          error: 'Store connection not found',
          details: fetchError.message,
          connectionId,
          userConnections: allConnections?.map(c => ({ id: c.id, platform: c.platform }))
        },
        { status: 404 }
      )
    }

    if (!connection) {
      console.error('Connection is null for ID:', connectionId)
      return NextResponse.json(
        { error: 'Store connection not found', connectionId },
        { status: 404 }
      )
    }

    console.log('Connection found:', { id: connection.id, platform: connection.platform })

    // Try to get additional fields if they exist
    const { data: fullConnection } = await supabase
      .from('store_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    const connectionWithDefaults = {
      ...connection,
      expires_at: fullConnection?.expires_at || null,
      connection_status: fullConnection?.connection_status || 'connected',
    }

    // Check if token is expired (using connectionWithDefaults)
    const isExpired = connectionWithDefaults.expires_at 
      ? new Date(connectionWithDefaults.expires_at) < new Date()
      : false

    if (isExpired) {
      return NextResponse.json(
        { error: 'Token expired', requiresReauth: true },
        { status: 401 }
      )
    }

    // Check connection status
    if (connectionWithDefaults.connection_status === 'disconnected' || connectionWithDefaults.connection_status === 'error') {
      return NextResponse.json(
        { error: 'Connection is not active', requiresReauth: true },
        { status: 400 }
      )
    }

    // Update sync status to 'syncing'
    const { error: updateError } = await supabase
      .from('store_connections')
      .update({
        sync_status: 'syncing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Error updating sync status:', updateError)
    }

    // Get store name and domain from connection if available
    const { data: fullConnectionData } = await supabase
      .from('store_connections')
      .select('store_name, store_domain')
      .eq('id', connectionId)
      .single()

    // Implement actual sync logic based on platform
    console.log('🔄 Starting sync for platform:', connection.platform)
    console.log('Sync parameters:', {
      platform: connection.platform,
      syncType,
      userId: user.id,
      storeName: fullConnectionData?.store_name,
      storeDomain: fullConnectionData?.store_domain,
    })
    
    const syncResult = await performSync(
      connection.platform,
      connection.access_token,
      syncType,
      user.id,
      fullConnectionData?.store_name,
      fullConnectionData?.store_domain,
      selectedProductIds
    )
    
    console.log('✅ Sync result:', {
      success: syncResult.success,
      error: syncResult.error,
      details: syncResult.details,
    })

    // Update sync status based on result (only if columns exist)
    const finalSyncStatus = syncResult.success ? 'success' : 'error'
    try {
      const { error: finalUpdateError } = await supabase
        .from('store_connections')
        .update({
          sync_status: finalSyncStatus,
          last_sync_at: syncResult.success ? new Date().toISOString() : undefined,
          last_error: syncResult.error || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)

      if (finalUpdateError) {
        // Columns might not exist yet, that's okay
        console.log('Note: sync status columns may not exist yet:', finalUpdateError.message)
      }
    } catch (finalUpdateError: any) {
      // Columns might not exist yet, that's okay
      console.log('Note: sync status columns may not exist yet:', finalUpdateError.message)
    }

    if (!syncResult.success) {
      // If it's a "coming soon" message (like Shopify sync not implemented), return 200 with info
      if ((syncResult as any).comingSoon) {
        return NextResponse.json({
          success: false,
          message: syncResult.error || 'Feature coming soon',
          comingSoon: true,
        }, { status: 200 })
      }
      
      // Otherwise, return error
      return NextResponse.json(
        { error: syncResult.error || 'Sync failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully`,
      syncType,
      syncedAt: new Date().toISOString(),
      details: syncResult.details,
    })
  } catch (error: any) {
    console.error('❌ Exception in sync store connection:', error)
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    
    // Update sync status to error (only if columns exist)
    try {
      const supabase = await createServerSupabase()
      // Handle both sync and async params (Next.js 15 compatibility)
      const resolvedParams = params instanceof Promise ? await params : params
      const connectionId = resolvedParams.id
      
      await supabase
        .from('store_connections')
        .update({
          sync_status: 'error',
          last_error: error.message || 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
    } catch (updateError: any) {
      // Columns might not exist yet, that's okay
      console.log('Note: sync status columns may not exist yet:', updateError.message)
    }

    const errorMessage = error.message || error.toString() || 'Internal server error'
    const errorDetails = {
      message: errorMessage,
      name: error.name,
      stack: error.stack,
    }

    // Include more context in the error response
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: errorDetails,
        // Include platform and sync type for debugging
        platform: connection?.platform,
        syncType,
        selectedProductIdsCount: selectedProductIds?.length || 0,
      },
      { status: 500 }
    )
  }
}

// Sync function - implements actual platform APIs
async function performSync(
  platform: string,
  accessToken: string,
  syncType: string,
  userId: string,
  storeName?: string,
  storeDomain?: string,
  selectedProductIds?: string[]
): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    switch (platform) {
      case 'salla':
        if (syncType === 'products' || syncType === 'all') {
          const result = await syncSallaProducts(userId, accessToken, storeName, storeDomain, selectedProductIds)
          
          if (!result.success) {
            return {
              success: false,
              error: `Sync completed with errors: ${result.errors.join(', ')}`,
              details: result,
            }
          }

          // If syncing 'all', also sync inventory
          if (syncType === 'all') {
            const inventoryResult = await syncSallaInventory(userId, accessToken)
            return {
              success: true,
              details: {
                productsSynced: result.productsSynced,
                productsCreated: result.productsCreated,
                productsUpdated: result.productsUpdated,
                inventoryUpdated: inventoryResult.productsUpdated,
                errors: [...result.errors, ...inventoryResult.errors],
              },
            }
          }

          return {
            success: true,
            details: {
              productsSynced: result.productsSynced,
              productsCreated: result.productsCreated,
              productsUpdated: result.productsUpdated,
              errors: result.errors,
            },
          }
        }
        
        if (syncType === 'inventory') {
          const inventoryResult = await syncSallaInventory(userId, accessToken)
          
          if (!inventoryResult.success) {
            return {
              success: false,
              error: `Inventory sync completed with errors: ${inventoryResult.errors.join(', ')}`,
              details: inventoryResult,
            }
          }

          return {
            success: true,
            details: {
              inventoryUpdated: inventoryResult.productsUpdated,
              errors: inventoryResult.errors,
            },
          }
        }
        
        // TODO: Implement orders sync for Salla
        return { success: true }

      case 'zid':
        // TODO: Implement Zid sync
        return { success: false, error: 'Zid sync not yet implemented' }

      case 'shopify':
        if (syncType === 'products' || syncType === 'all') {
          console.log('🛍️ Calling syncShopifyProducts...')
          const result = await syncShopifyProducts(userId, accessToken, storeName, storeDomain, selectedProductIds)
          console.log('🛍️ Shopify sync result:', {
            success: result.success,
            productsSynced: result.productsSynced,
            productsCreated: result.productsCreated,
            productsUpdated: result.productsUpdated,
            errorsCount: result.errors.length,
            firstFewErrors: result.errors.slice(0, 3),
          })
          
          // Even if there are errors, if we synced some products, consider it partially successful
          if (!result.success && result.productsSynced === 0) {
            return {
              success: false,
              error: `Sync failed: ${result.errors[0] || 'No products were synced'}`,
              details: result,
            }
          }
          
          // If we synced products but have errors, still return success with details
          if (!result.success) {
            return {
              success: true, // Partial success
              error: `Sync completed with ${result.errors.length} errors`,
              details: result,
            }
          }

          // If syncing 'all', also sync inventory
          if (syncType === 'all') {
            const inventoryResult = await syncShopifyInventory(userId, accessToken, storeDomain)
            return {
              success: true,
              details: {
                productsSynced: result.productsSynced,
                productsCreated: result.productsCreated,
                productsUpdated: result.productsUpdated,
                inventoryUpdated: inventoryResult.productsUpdated,
                errors: [...result.errors, ...inventoryResult.errors],
              },
            }
          }

          return {
            success: true,
            details: {
              productsSynced: result.productsSynced,
              productsCreated: result.productsCreated,
              productsUpdated: result.productsUpdated,
              errors: result.errors,
            },
          }
        }
        
        if (syncType === 'inventory') {
          const inventoryResult = await syncShopifyInventory(userId, accessToken, storeDomain)
          
          if (!inventoryResult.success) {
            return {
              success: false,
              error: `Inventory sync completed with errors: ${inventoryResult.errors.join(', ')}`,
              details: inventoryResult,
            }
          }

          return {
            success: true,
            details: {
              inventoryUpdated: inventoryResult.productsUpdated,
              errors: inventoryResult.errors,
            },
          }
        }
        
        // TODO: Implement orders sync for Shopify
        return { success: true }

      default:
        return { success: false, error: `Unknown platform: ${platform}` }
    }
  } catch (error: any) {
    console.error('Error in performSync:', error)
    return {
      success: false,
      error: error.message || 'Sync failed',
    }
  }
}

