import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST: Sync a store by store external ID (platform store ID)
// This is useful when you know the store ID from the platform but not the connection ID
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

    const body = await request.json().catch(() => ({}))
    const storeExternalId = body.storeExternalId || body.store_external_id || body.storeId
    const platform = body.platform || 'salla' // Default to salla
    const syncType = body.type || 'all'
    const selectedProductIds = body.selectedProductIds

    if (!storeExternalId) {
      return NextResponse.json(
        { error: 'storeExternalId is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Looking for store connection:', {
      storeExternalId,
      platform,
      userId: user.id,
    })

    // Find the connection by store_external_id and platform
    const { data: connection, error: fetchError } = await supabase
      .from('store_connections')
      .select('id, user_id, platform, access_token, refresh_token, store_name, store_domain')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('store_external_id', storeExternalId.toString())
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching connection:', fetchError)
      return NextResponse.json(
        { 
          error: 'Error finding store connection',
          details: fetchError.message 
        },
        { status: 500 }
      )
    }

    if (!connection) {
      // Try to find by store_id (legacy field name)
      const { data: legacyConnection } = await supabase
        .from('store_connections')
        .select('id, user_id, platform, access_token, refresh_token, store_name, store_domain')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('store_id', storeExternalId.toString())
        .maybeSingle()

      if (legacyConnection) {
        console.log('✅ Found connection by legacy store_id field')
        // Use the legacy connection
        const connectionId = legacyConnection.id
        
        // Redirect to the sync endpoint
        return NextResponse.redirect(
          new URL(`/api/store-connections/${connectionId}/sync`, request.url)
        )
      }

      return NextResponse.json(
        { 
          error: 'Store connection not found',
          message: `No connection found for store ID ${storeExternalId} on platform ${platform}`,
          storeExternalId,
          platform,
        },
        { status: 404 }
      )
    }

    console.log('✅ Found connection:', connection.id)

    // Now trigger the sync using the existing sync endpoint logic
    // We'll call the sync function directly
    const connectionId = connection.id

    // Import sync functions
    const { syncSallaProducts, syncSallaInventory } = await import('@/lib/sync/salla-products')
    const { syncShopifyProducts, syncShopifyInventory } = await import('@/lib/sync/shopify-products')

    // Update sync status to 'syncing'
    await supabase
      .from('store_connections')
      .update({
        sync_status: 'syncing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    // Perform the sync based on platform
    let syncResult: { success: boolean; error?: string; details?: any } = { success: false }

    if (connection.platform === 'salla') {
      if (syncType === 'products' || syncType === 'all') {
        const result = await syncSallaProducts(
          user.id,
          connection.access_token,
          connection.id,
          connection.store_name || undefined,
          connection.store_domain || undefined,
          selectedProductIds
        )

        if (!result.success) {
          syncResult = {
            success: false,
            error: `Sync completed with errors: ${result.errors.join(', ')}`,
            details: result,
          }
        } else {
          // If syncing 'all', also sync inventory
          if (syncType === 'all') {
            const inventoryResult = await syncSallaInventory(user.id, connection.access_token)
            syncResult = {
              success: true,
              details: {
                productsSynced: result.productsSynced,
                productsCreated: result.productsCreated,
                productsUpdated: result.productsUpdated,
                inventoryUpdated: inventoryResult.productsUpdated,
                errors: [...result.errors, ...inventoryResult.errors],
              },
            }
          } else {
            syncResult = {
              success: true,
              details: {
                productsSynced: result.productsSynced,
                productsCreated: result.productsCreated,
                productsUpdated: result.productsUpdated,
                errors: result.errors,
              },
            }
          }
        }
      } else if (syncType === 'inventory') {
        const inventoryResult = await syncSallaInventory(user.id, connection.access_token)
        syncResult = {
          success: inventoryResult.success,
          error: inventoryResult.errors.length > 0 ? inventoryResult.errors.join(', ') : undefined,
          details: {
            inventoryUpdated: inventoryResult.productsUpdated,
            errors: inventoryResult.errors,
          },
        }
      }
    } else if (connection.platform === 'shopify') {
      if (syncType === 'products' || syncType === 'all') {
        const result = await syncShopifyProducts(
          user.id,
          connection.access_token,
          connection.id,
          connection.store_name || undefined,
          connection.store_domain || undefined,
          selectedProductIds
        )

        if (!result.success) {
          syncResult = {
            success: false,
            error: `Sync completed with errors: ${result.errors.join(', ')}`,
            details: result,
          }
        } else {
          if (syncType === 'all') {
            const inventoryResult = await syncShopifyInventory(user.id, connection.access_token, connection.store_domain || undefined)
            syncResult = {
              success: true,
              details: {
                productsSynced: result.productsSynced,
                productsCreated: result.productsCreated,
                productsUpdated: result.productsUpdated,
                inventoryUpdated: inventoryResult.productsUpdated,
                errors: [...result.errors, ...inventoryResult.errors],
              },
            }
          } else {
            syncResult = {
              success: true,
              details: {
                productsSynced: result.productsSynced,
                productsCreated: result.productsCreated,
                productsUpdated: result.productsUpdated,
                errors: result.errors,
              },
            }
          }
        }
      } else if (syncType === 'inventory') {
        const inventoryResult = await syncShopifyInventory(user.id, connection.access_token, connection.store_domain || undefined)
        syncResult = {
          success: inventoryResult.success,
          error: inventoryResult.errors.length > 0 ? inventoryResult.errors.join(', ') : undefined,
          details: {
            inventoryUpdated: inventoryResult.productsUpdated,
            errors: inventoryResult.errors,
          },
        }
      }
    } else {
      return NextResponse.json(
        { error: `Platform ${connection.platform} sync not yet implemented` },
        { status: 501 }
      )
    }

    // Update sync status based on result
    const finalSyncStatus = syncResult.success ? 'success' : 'error'
    await supabase
      .from('store_connections')
      .update({
        sync_status: finalSyncStatus,
        last_sync_at: syncResult.success ? new Date().toISOString() : undefined,
        last_error: syncResult.error || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (!syncResult.success) {
      return NextResponse.json(
        { 
          error: syncResult.error || 'Sync failed',
          details: syncResult.details 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully for store ${storeExternalId}`,
      syncType,
      syncedAt: new Date().toISOString(),
      details: syncResult.details,
      connectionId: connectionId,
    })
  } catch (error: any) {
    console.error('❌ Exception in sync by store ID:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      },
      { status: 500 }
    )
  }
}

