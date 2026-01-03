import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

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

    // Validate file size (max 10MB before optimization)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Image optimization and validation constants
    const MAX_DIMENSION = 4000 // Max width or height
    const MIN_DIMENSION = 100 // Min width or height
    const TARGET_MAX_DIMENSION = 2000 // Target max dimension after resize
    const JPEG_QUALITY = 85
    const WEBP_QUALITY = 85

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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const originalBuffer = Buffer.from(arrayBuffer)

    // Get image metadata for validation
    let metadata
    try {
      metadata = await sharp(originalBuffer).metadata()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid image file' },
        { status: 400 }
      )
    }

    // Validate dimensions
    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Unable to read image dimensions' },
        { status: 400 }
      )
    }

    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      return NextResponse.json(
        { error: `Image dimensions too small (min ${MIN_DIMENSION}x${MIN_DIMENSION})` },
        { status: 400 }
      )
    }

    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      return NextResponse.json(
        { error: `Image dimensions too large (max ${MAX_DIMENSION}x${MAX_DIMENSION})` },
        { status: 400 }
      )
    }

    // Optimize image: resize if needed, convert to JPEG/WebP, compress
    let optimizedBuffer: Buffer
    let contentType: string
    let fileExt: string

    const isAnimated = metadata.pages && metadata.pages > 1

    if (isAnimated || file.type === 'image/gif') {
      // Keep GIFs as-is (including animated GIFs)
      optimizedBuffer = originalBuffer
      contentType = 'image/gif'
      fileExt = 'gif'
    } else {
      // Resize and optimize static images
      const shouldResize = metadata.width > TARGET_MAX_DIMENSION || metadata.height > TARGET_MAX_DIMENSION

      let sharpInstance = sharp(originalBuffer)

      if (shouldResize) {
        sharpInstance = sharpInstance.resize(TARGET_MAX_DIMENSION, TARGET_MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      // Convert to WebP for better compression (fallback to JPEG)
      try {
        optimizedBuffer = await sharpInstance
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
        contentType = 'image/webp'
        fileExt = 'webp'
      } catch {
        // Fallback to JPEG if WebP fails
        optimizedBuffer = await sharpInstance
          .jpeg({ quality: JPEG_QUALITY, progressive: true })
          .toBuffer()
        contentType = 'image/jpeg'
        fileExt = 'jpg'
      }
    }

    // Generate unique filename with UUID to avoid conflicts
    const uniqueId = crypto.randomUUID()
    const fileName = `${uniqueId}.${fileExt}`
    const tempPath = `product-images/${existingProduct.store_id}/${productId}/.temp/${uniqueId}.${fileExt}`
    const finalPath = `product-images/${existingProduct.store_id}/${productId}/${fileName}`

    // Upload to temporary location first (transaction safety)
    const { error: tempUploadError } = await adminClient.storage
      .from('public_assets')
      .upload(tempPath, optimizedBuffer, {
        contentType,
        upsert: true,
      })

    if (tempUploadError) {
      console.error('Error uploading image:', tempUploadError)
      return NextResponse.json(
        { error: 'Failed to upload image', details: tempUploadError.message },
        { status: 500 }
      )
    }

    // Check if there's already a primary image
    const { data: hasPrimary } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle()

    // Get max display_order
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('display_order')
      .eq('product_id', productId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextDisplayOrder = existingImages && existingImages.length > 0
      ? (existingImages[0].display_order || 0) + 1
      : 0

    // Get temp URL for database insert
    const { data: tempUrlData } = adminClient.storage
      .from('public_assets')
      .getPublicUrl(tempPath)

    const tempImageUrl = tempUrlData.publicUrl

    // Insert into product_images table with temp URL
    const isPrimary = !hasPrimary // Set as primary if none exists
    const { data: newImage, error: insertError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: tempImageUrl, // Will be updated after move
        display_order: nextDisplayOrder,
        is_primary: isPrimary
      })
      .select()
      .single()

    if (insertError) {
      // Rollback: delete temp file
      await adminClient.storage.from('public_assets').remove([tempPath])
      
      // If table doesn't exist, fall back to updating products.image_url
      if (insertError.code === '42P01') {
        // Move temp to final location
        const { error: moveError } = await adminClient.storage
          .from('public_assets')
          .move(tempPath, finalPath)

        if (moveError) {
          await adminClient.storage.from('public_assets').remove([tempPath])
          return NextResponse.json(
            { error: 'Failed to finalize image upload', details: moveError.message },
            { status: 500 }
          )
        }

        const { data: finalUrlData } = adminClient.storage
          .from('public_assets')
          .getPublicUrl(finalPath)

        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: finalUrlData.publicUrl })
          .eq('id', productId)

        if (updateError) {
          console.error('Error updating product image URL:', updateError)
          return NextResponse.json(
            { error: 'Failed to update product image URL', details: updateError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({ 
          image_url: finalUrlData.publicUrl,
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

    // Move from temp to final location (transaction safety)
    const { error: moveError } = await adminClient.storage
      .from('public_assets')
      .move(tempPath, finalPath)

    if (moveError) {
      // Rollback: delete DB record and temp file
      await supabase.from('product_images').delete().eq('id', newImage.id)
      await adminClient.storage.from('public_assets').remove([tempPath])
      return NextResponse.json(
        { error: 'Failed to finalize image upload', details: moveError.message },
        { status: 500 }
      )
    }

    // Get final public URL
    const { data: finalUrlData } = adminClient.storage
      .from('public_assets')
      .getPublicUrl(finalPath)

    const finalImageUrl = finalUrlData.publicUrl

    // Update image URL in database with final path
    await supabase
      .from('product_images')
      .update({ image_url: finalImageUrl })
      .eq('id', newImage.id)

    // Update product.image_url if this is the primary image
    if (isPrimary) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: finalImageUrl })
        .eq('id', productId)

      if (updateError) {
        console.warn('Failed to update product.image_url:', updateError)
      }
    }

    return NextResponse.json({ 
      image_url: finalImageUrl,
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

