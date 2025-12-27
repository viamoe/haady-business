import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * POST /api/stores/upload-logo
 * Upload store logo to Supabase storage
 * Path: public_assets/store-logos/{storeUID}/logo.{ext}
 */
export async function POST(request: Request) {
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

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
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

    // Verify the store belongs to the user's business
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!businessProfile) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 404 }
      )
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, business_id, logo_url')
      .eq('id', storeId)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
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

    // Delete old logo if it exists
    if (store.logo_url) {
      try {
        // Extract the file path from the URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/public_assets/store-logos/{storeUID}/logo.{ext}
        const urlParts = store.logo_url.split('/public/public_assets/')
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

    // Generate filename
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `logo.${fileExt}`
    const filePath = `store-logos/${storeId}/${fileName}`

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
        { error: 'Failed to upload logo', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = adminClient.storage
      .from('public_assets')
      .getPublicUrl(filePath)

    // Update store with logo URL
    const { error: updateError } = await adminClient
      .from('stores')
      .update({ 
        logo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId)

    if (updateError) {
      console.error('Database update error:', updateError)
      // Try to delete the uploaded file
      await adminClient.storage
        .from('public_assets')
        .remove([filePath])
      
      return NextResponse.json(
        { error: 'Failed to update store record', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logo_url: publicUrl,
      store_id: storeId
    })

  } catch (error: any) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

