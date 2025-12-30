import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * POST /api/products/[id]/upload-image
 * Upload product image to Supabase storage
 */
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
    const productId = resolvedParams.id

    // Verify the product belongs to the user's business
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

    // Check if product exists and belongs to user's business
    // Use a simpler query that doesn't rely on RLS for the join
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, store_id, image_url')
      .eq('id', productId)
      .single()

    if (fetchError || !existingProduct) {
      console.error('Error fetching product:', {
        error: fetchError,
        productId,
        businessProfileId: businessProfile.id
      })
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify business ownership through store (separate query to avoid RLS issues)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, business_id')
      .eq('id', existingProduct.store_id)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      console.error('Error verifying store ownership:', {
        error: storeError,
        storeId: existingProduct.store_id,
        businessProfileId: businessProfile.id
      })
      return NextResponse.json(
        { error: 'Access denied: Product does not belong to your business' },
        { status: 403 }
      )
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
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

    // Validate file size (max 5MB for product images)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
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

    // Delete old image if it exists
    if (existingProduct.image_url) {
      try {
        // Extract the file path from the URL
        const urlParts = existingProduct.image_url.split('/public/public_assets/')
        if (urlParts.length > 1) {
          const oldFilePath = urlParts[1]
          await adminClient.storage
            .from('public_assets')
            .remove([oldFilePath])
        }
      } catch (error) {
        console.warn('Failed to delete old image:', error)
      }
    }

    // Generate unique filename with UUID to avoid conflicts
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const uniqueId = crypto.randomUUID()
    const fileName = `${uniqueId}.${fileExt}`
    const filePath = `product-images/${existingProduct.store_id}/${productId}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('public_assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('public_assets')
      .getPublicUrl(filePath)

    const imageUrl = urlData.publicUrl

    // Check if product_images table exists and has any images
    const { data: existingImages, error: imagesCheckError } = await supabase
      .from('product_images')
      .select('id, is_primary')
      .eq('product_id', productId)

    const hasImages = existingImages && existingImages.length > 0
    const hasPrimary = existingImages?.some(img => img.is_primary) || false

    // Insert into product_images table
    const { data: newImage, error: insertError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: imageUrl,
        display_order: hasImages ? existingImages.length : 0,
        is_primary: !hasPrimary // Set as primary if no primary exists
      })
      .select()
      .single()

    if (insertError) {
      // If table doesn't exist, fall back to updating products.image_url
      if (insertError.code === '42P01') {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', productId)

        if (updateError) {
          console.error('Error updating product image URL:', updateError)
          return NextResponse.json(
            { error: 'Failed to update product image URL', details: updateError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({ 
          image_url: imageUrl,
          image_id: null,
          message: 'Image uploaded successfully'
        })
      }

      console.error('Error inserting product image:', insertError)
      return NextResponse.json(
        { error: 'Failed to save image record', details: insertError.message },
        { status: 500 }
      )
    }

    // Update product.image_url to primary image for backward compatibility
    if (newImage.is_primary) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', productId)

      if (updateError) {
        console.warn('Failed to update product.image_url:', updateError)
      }
    }

    return NextResponse.json({ 
      image_url: imageUrl,
      image_id: newImage.id,
      is_primary: newImage.is_primary,
      message: 'Image uploaded successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/products/[id]/upload-image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

