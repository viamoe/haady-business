import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/categories'

// POST /api/brands/[id]/upload-logo - Upload brand logo (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const { id } = await Promise.resolve(params)

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'ID must be a valid UUID' },
        { status: 400 }
      )
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      )
    }

    // TODO: Add admin check here
    // const isAdmin = await checkAdminRole(user.id)
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Validation error', message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type (images only)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'File must be an image (JPEG, PNG, WebP, GIF, or SVG)' },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Validation error', message: 'File size must be less than 2MB' },
        { status: 400 }
      )
    }

    // Check if brand exists
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, logo_url')
      .eq('id', id)
      .single()

    if (brandError || !brand) {
      return NextResponse.json(
        { error: 'Not found', message: 'Brand not found' },
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
    if (brand.logo_url) {
      try {
        // Extract the file path from the URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/public_assets/brand-logos/{brandId}/logo.{ext}
        const urlParts = brand.logo_url.split('/public/public_assets/')
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
    const filePath = `brand-logos/${id}/${fileName}`

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
      console.error('Error uploading logo:', uploadError)
      return NextResponse.json(
        { error: 'Upload failed', message: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('public_assets')
      .getPublicUrl(filePath)

    const logoUrl = urlData.publicUrl

    // Update brand with new logo URL
    const { data: updatedBrand, error: updateError } = await supabase
      .from('brands')
      .update({ logo_url: logoUrl })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating brand:', updateError)
      // Try to delete the uploaded file if database update fails
      await adminClient.storage.from('public_assets').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to update brand', message: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logo_url: logoUrl,
      brand: updatedBrand
    })
  } catch (error: any) {
    console.error('Error in POST /api/brands/[id]/upload-logo:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

