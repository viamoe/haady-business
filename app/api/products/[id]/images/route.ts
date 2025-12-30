import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
      // If table doesn't exist yet, return empty array (backward compatibility)
      if (imagesError.code === '42P01') {
        return NextResponse.json({ images: [] })
      }
      return NextResponse.json(
        { error: 'Failed to fetch images', details: imagesError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      images: (images || []).map(img => ({
        id: img.id,
        url: img.image_url,
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

    // Handle both sync and async params (Next.js 15 compatibility)
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

    // Check if product image exists and belongs to product
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

    // Verify business ownership through store
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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/products/[id]/images:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/products/[id]/images
 * Update image (set as primary, change display order, etc.)
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

    // Handle both sync and async params (Next.js 15 compatibility)
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

