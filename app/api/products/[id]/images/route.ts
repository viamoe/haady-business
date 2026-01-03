import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

/**
 * GET /api/products/[id]/images
 * Get all images for a product
 */
export async function GET(
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

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', productId)
      .single()

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify business ownership through store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, business_id')
      .eq('id', existingProduct.store_id)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Fetch product images
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('id, image_url, display_order, is_primary')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })
      .order('is_primary', { ascending: false })

    if (imagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch images', details: imagesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      images: (images || []).map(img => ({
        id: img.id,
        url: img.image_url,
        display_order: img.display_order,
        is_primary: img.is_primary
      }))
    })
  } catch (error: any) {
    console.error('Error in GET /api/products/[id]/images:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products/[id]/images
 * Upload multiple images for a product
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

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', productId)
      .single()

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify business ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, business_id')
      .eq('id', existingProduct.store_id)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const featuredIndexStr = formData.get('featuredIndex') as string | null
    const featuredIndex = featuredIndexStr ? parseInt(featuredIndexStr, 10) : undefined

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Validate featured index if provided
    if (featuredIndex !== undefined && (featuredIndex < 0 || featuredIndex >= files.length)) {
      return NextResponse.json(
        { error: 'Invalid featured index' },
        { status: 400 }
      )
    }

    // Get existing images to determine display_order
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('display_order')
      .eq('product_id', productId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextDisplayOrder = existingImages && existingImages.length > 0
      ? (existingImages[0].display_order || 0) + 1
      : 0

    // Check if there's already a primary image
    const { data: hasPrimary } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle()

    // Upload files and create image records
    const { createClient } = await import('@supabase/supabase-js')
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

    const uploadedImages: Array<{ id: string; url: string; display_order: number; is_primary: boolean }> = []
    const errors: Array<{ fileName: string; error: string }> = []
    const tempUploads: Array<{ tempPath: string; finalPath: string }> = []

    // Image optimization and validation constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (before optimization)
    const MAX_DIMENSION = 4000 // Max width or height
    const MIN_DIMENSION = 100 // Min width or height
    const TARGET_MAX_DIMENSION = 2000 // Target max dimension after resize
    const JPEG_QUALITY = 85
    const WEBP_QUALITY = 85

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      let optimizedBuffer: Buffer
      let contentType: string
      let fileExt: string

      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          errors.push({ fileName: file.name, error: 'File must be an image' })
          continue
        }

        // Validate file size (max 10MB before optimization)
        if (file.size > MAX_FILE_SIZE) {
          errors.push({ fileName: file.name, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB` })
          continue
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const originalBuffer = Buffer.from(arrayBuffer)

        // Get image metadata for validation
        const metadata = await sharp(originalBuffer).metadata()
        
        // Validate dimensions
        if (!metadata.width || !metadata.height) {
          errors.push({ fileName: file.name, error: 'Unable to read image dimensions' })
          continue
        }

        if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
          errors.push({ 
            fileName: file.name, 
            error: `Image dimensions too small (min ${MIN_DIMENSION}x${MIN_DIMENSION})` 
          })
          continue
        }

        if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
          errors.push({ 
            fileName: file.name, 
            error: `Image dimensions too large (max ${MAX_DIMENSION}x${MAX_DIMENSION})` 
          })
          continue
        }

        // Optimize image: resize if needed, convert to JPEG/WebP, compress
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

        // Generate unique filename
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
          errors.push({ fileName: file.name, error: `Upload failed: ${tempUploadError.message}` })
          continue
        }

        // Determine if this should be primary
        const isPrimary = !hasPrimary && (
          featuredIndex !== undefined ? featuredIndex === i : i === 0
        )
        const displayOrder = nextDisplayOrder + i

        // Insert into product_images table
        const { data: urlData } = adminClient.storage
          .from('public_assets')
          .getPublicUrl(tempPath) // Use temp path for URL initially

        const tempImageUrl = urlData.publicUrl

        const { data: newImage, error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: tempImageUrl, // Will be updated after move
            display_order: displayOrder,
            is_primary: isPrimary
          })
          .select()
          .single()

        if (insertError) {
          // Rollback: delete temp file
          await adminClient.storage.from('public_assets').remove([tempPath])
          errors.push({ fileName: file.name, error: `Database insert failed: ${insertError.message}` })
          continue
        }

        // Move from temp to final location (transaction safety)
        const { error: moveError } = await adminClient.storage
          .from('public_assets')
          .move(tempPath, finalPath)

        if (moveError) {
          // Rollback: delete DB record and temp file
          await supabase.from('product_images').delete().eq('id', newImage.id)
          await adminClient.storage.from('public_assets').remove([tempPath])
          errors.push({ fileName: file.name, error: `File move failed: ${moveError.message}` })
          continue
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

        uploadedImages.push({
          id: newImage.id,
          url: finalImageUrl,
          display_order: displayOrder,
          is_primary: isPrimary
        })

        // Update product.image_url if this is the primary image
        if (isPrimary) {
          await supabase
            .from('products')
            .update({ image_url: finalImageUrl })
            .eq('id', productId)
        }

      } catch (error: any) {
        console.error(`Error processing image ${file.name}:`, error)
        errors.push({ 
          fileName: file.name, 
          error: error.message || 'Unknown error during image processing' 
        })
      }
    }

    // Clean up any remaining temp files (safety measure)
    try {
      const tempFiles = tempUploads.map(t => t.tempPath)
      if (tempFiles.length > 0) {
        await adminClient.storage.from('public_assets').remove(tempFiles)
      }
    } catch (cleanupError) {
      console.warn('Error cleaning up temp files:', cleanupError)
    }

    // Track image additions in edit history
    if (uploadedImages.length > 0) {
      try {
        await supabase
          .from('product_edit_history')
          .insert({
            product_id: productId,
            edited_by: user.id,
            changes: {
              images_added: {
                old_value: null,
                new_value: uploadedImages.map(img => img.url)
              }
            },
            edit_type: 'image_upload'
          })
      } catch (historyError) {
        console.warn('Failed to log image upload to history:', historyError)
      }
    }

    return NextResponse.json({ 
      images: uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadedImages.length} of ${files.length} image(s)${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
    })
  } catch (error: any) {
    console.error('Error in POST /api/products/[id]/images:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/products/[id]/images
 * Update image (set as primary, change display order)
 */
export async function PATCH(
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

    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    const body = await request.json()
    const { imageId, is_primary, display_order } = body

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

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

    // Check if product image exists
    const { data: image, error: imageError } = await supabase
      .from('product_images')
      .select('id, product_id, image_url')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single()

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Verify business ownership
    const { data: product } = await supabase
      .from('products')
      .select('store_id')
      .eq('id', productId)
      .single()

    if (product) {
      const { data: store } = await supabase
        .from('stores')
        .select('business_id')
        .eq('id', product.store_id)
        .eq('business_id', businessProfile.id)
        .single()

      if (!store) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Update image
    const updateData: any = {}
    if (is_primary !== undefined) {
      updateData.is_primary = is_primary
      
      // If setting as primary, unset other primaries
      if (is_primary) {
        await supabase
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId)
          .neq('id', imageId)

        // Update product.image_url for backward compatibility
        await supabase
          .from('products')
          .update({ image_url: image.image_url })
          .eq('id', productId)
      }
    }
    if (display_order !== undefined) {
      updateData.display_order = display_order
    }

    const { error: updateError } = await supabase
      .from('product_images')
      .update(updateData)
      .eq('id', imageId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update image', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PATCH /api/products/[id]/images:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]/images
 * Delete a product image
 */
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

    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    const body = await request.json()
    const { imageId } = body

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

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

    // Check if product image exists
    const { data: image, error: imageError } = await supabase
      .from('product_images')
      .select('id, product_id, image_url')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single()

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Verify business ownership
    const { data: product } = await supabase
      .from('products')
      .select('store_id')
      .eq('id', productId)
      .single()

    if (product) {
      const { data: store } = await supabase
        .from('stores')
        .select('business_id')
        .eq('id', product.store_id)
        .eq('business_id', businessProfile.id)
        .single()

      if (!store) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Delete image from storage
    if (image.image_url) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
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

        // Extract the file path from the URL
        const urlParts = image.image_url.split('/public/public_assets/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await adminClient.storage
            .from('public_assets')
            .remove([filePath])
        }
      } catch (storageError) {
        console.warn('Failed to delete image from storage:', storageError)
        // Continue to delete the database record even if storage deletion fails
      }
    }

    // Store image URL for history before deleting
    const deletedImageUrl = image.image_url

    // Delete image record
    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete image', details: deleteError.message },
        { status: 500 }
      )
    }

    // Track image deletion in edit history
    try {
      await supabase
        .from('product_edit_history')
        .insert({
          product_id: productId,
          edited_by: user.id,
          changes: {
            images_removed: {
              old_value: deletedImageUrl,
              new_value: null
            }
          },
          edit_type: 'image_delete'
        })
    } catch (historyError) {
      console.warn('Failed to log image deletion to history:', historyError)
    }

    // If this was the primary image, set the first remaining image as primary
    const { data: remainingImages } = await supabase
      .from('product_images')
      .select('id, image_url')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })
      .limit(1)

    if (remainingImages && remainingImages.length > 0) {
      // Set first image as primary
      await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', remainingImages[0].id)

      // Update product.image_url
      await supabase
        .from('products')
        .update({ image_url: remainingImages[0].image_url })
        .eq('id', productId)
    } else {
      // No images left, clear product.image_url
      await supabase
        .from('products')
        .update({ image_url: null })
        .eq('id', productId)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/products/[id]/images:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

