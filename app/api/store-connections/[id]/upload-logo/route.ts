import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const connectionId = resolvedParams.id

    // Verify the connection belongs to the user and get existing logo
    const { data: connection, error: connectionError } = await supabase
      .from('store_connections')
      .select('id, user_id, store_external_id, store_logo_url')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Store connection not found' },
        { status: 404 }
      )
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const zoomLevel = formData.get('zoom') ? parseInt(formData.get('zoom') as string) : 100

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate zoom level (50-200%)
    if (zoomLevel < 50 || zoomLevel > 200) {
      return NextResponse.json(
        { error: 'Zoom level must be between 50 and 200' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 }
      )
    }

    // Create admin client for storage operations
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Delete old logo if it exists
    if (connection.store_logo_url) {
      try {
        // Extract the file path from the URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/public_assets/store-logos/{user_id}/{connection_id}/{filename}
        const urlParts = connection.store_logo_url.split('/public/public_assets/')
        if (urlParts.length > 1) {
          const oldFilePath = urlParts[1]
          // Delete the old file
          await adminClient.storage
            .from('public_assets')
            .remove([oldFilePath])
        }
      } catch (error) {
        // Log error but don't fail the upload if old file deletion fails
        console.warn('Failed to delete old logo:', error)
      }
    }

    // Generate consistent filename (using connectionId only, so it always overwrites)
    // This ensures we only have one logo file per connection
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `logo.${fileExt}`
    const filePath = `store-logos/${user.id}/${connectionId}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage (using public_assets bucket)
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('public_assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Replace if exists
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('public_assets')
      .getPublicUrl(filePath)

    const logoUrl = urlData.publicUrl

    // Update store_connections table with logo URL and zoom level
    const { error: updateError } = await adminClient
      .from('store_connections')
      .update({ 
        store_logo_url: logoUrl,
        logo_zoom: zoomLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Database update error:', updateError)
      // Try to delete the uploaded file if database update fails
      await adminClient.storage
        .from('public_assets')
        .remove([filePath])
      
      return NextResponse.json(
        { error: 'Failed to update store record', details: updateError.message },
        { status: 500 }
      )
    }

    // Also update the stores table if it exists and is linked
    const { data: store } = await adminClient
      .from('stores')
      .select('id')
      .eq('store_connection_id', connectionId)
      .single()

    if (store) {
      // Get platform from connection to sync to store
      const { data: connectionData } = await adminClient
        .from('store_connections')
        .select('platform')
        .eq('id', connectionId)
        .single()

      await adminClient
        .from('stores')
        .update({ 
          logo_url: logoUrl,
          platform: connectionData?.platform || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', store.id)
    }

    return NextResponse.json({
      success: true,
      logoUrl,
      message: 'Logo uploaded successfully'
    })

  } catch (error) {
    console.error('Error uploading store logo:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const connectionId = resolvedParams.id

    // Verify the connection belongs to the user and get existing logo
    const { data: connection, error: connectionError } = await supabase
      .from('store_connections')
      .select('id, user_id, store_logo_url')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Store connection not found' },
        { status: 404 }
      )
    }

    // Create admin client for storage operations
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Delete logo file from storage if it exists
    if (connection.store_logo_url) {
      try {
        // Extract the file path from the URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/public_assets/store-logos/{user_id}/{connection_id}/{filename}
        const urlParts = connection.store_logo_url.split('/public/public_assets/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          // Delete the file
          await adminClient.storage
            .from('public_assets')
            .remove([filePath])
        }
      } catch (error) {
        // Log error but continue with database update
        console.warn('Failed to delete logo file from storage:', error)
      }
    }

    // Update store_connections table to remove logo URL and reset zoom
    const { error: updateError } = await adminClient
      .from('store_connections')
      .update({ 
        store_logo_url: null,
        logo_zoom: 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update store record', details: updateError.message },
        { status: 500 }
      )
    }

    // Also update the stores table if it exists and is linked
    const { data: store } = await adminClient
      .from('stores')
      .select('id')
      .eq('store_connection_id', connectionId)
      .single()

    if (store) {
      // Get platform from connection to sync to store
      const { data: connectionData } = await adminClient
        .from('store_connections')
        .select('platform')
        .eq('id', connectionId)
        .single()

      await adminClient
        .from('stores')
        .update({ 
          logo_url: null,
          platform: connectionData?.platform || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', store.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Logo removed successfully'
    })

  } catch (error) {
    console.error('Error removing store logo:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

