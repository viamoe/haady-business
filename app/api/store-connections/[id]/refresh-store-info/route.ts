import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Refresh store information from platform API
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
      .select('id, user_id, platform, access_token')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Store connection not found' },
        { status: 404 }
      )
    }

    let storeName = null
    let storeDomain = null
    let storeExternalId = null

    // Fetch store info based on platform
    if (connection.platform === 'salla') {
      try {
        const storeResponse = await fetch('https://api.salla.dev/admin/v2/store/info', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        if (storeResponse.ok) {
          const storeInfo = await storeResponse.json()
          console.log('📦 Salla Store Info Response:', JSON.stringify(storeInfo, null, 2))
          
          // Try multiple possible response structures
          if (storeInfo?.data) {
            storeExternalId = storeInfo.data.id?.toString() || storeInfo.data.store_id?.toString() || null
            storeName = storeInfo.data.name || storeInfo.data.store_name || null
            storeDomain = storeInfo.data.domain || storeInfo.data.store_domain || null
          } else if (storeInfo?.name) {
            storeExternalId = storeInfo.id?.toString() || storeInfo.store_id?.toString() || null
            storeName = storeInfo.name || storeInfo.store_name || null
            storeDomain = storeInfo.domain || storeInfo.store_domain || null
          }
          
          console.log('✅ Extracted store info:', { storeExternalId, storeName, storeDomain })
        } else {
          const errorText = await storeResponse.text()
          let errorDetails: any = { status: storeResponse.status, message: errorText }
          
          try {
            const errorJson = JSON.parse(errorText)
            errorDetails = { ...errorDetails, ...errorJson }
          } catch {
            // Not JSON, keep as text
          }
          
          console.error('❌ Failed to fetch store info from Salla:', {
            status: storeResponse.status,
            statusText: storeResponse.statusText,
            error: errorDetails,
            endpoint: 'https://api.salla.dev/admin/v2/store/info',
            hasToken: !!connection.access_token,
            tokenLength: connection.access_token?.length,
          })
          
          return NextResponse.json(
            { 
              error: 'Failed to fetch store information from Salla',
              details: errorDetails,
              status: storeResponse.status,
            },
            { status: storeResponse.status }
          )
        }
      } catch (error: any) {
        console.error('❌ Error fetching store info:', error)
        return NextResponse.json(
          { error: 'Error fetching store information', details: error.message },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Platform not supported for store info refresh' },
        { status: 400 }
      )
    }

    // Update the connection with store info
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (storeExternalId !== null) {
      updateData.store_external_id = storeExternalId
    }
    if (storeName !== null) {
      updateData.store_name = storeName
    }
    if (storeDomain !== null) {
      updateData.store_domain = storeDomain
    }

    const { error: updateError } = await supabase
      .from('store_connections')
      .update(updateData)
      .eq('id', connectionId)

    if (updateError) {
      console.error('❌ Error updating store connection:', updateError)
      return NextResponse.json(
        { error: 'Failed to update store connection', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      store_name: storeName,
      store_domain: storeDomain,
      store_external_id: storeExternalId,
    })
  } catch (error: any) {
    console.error('❌ Exception in refresh store info:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

