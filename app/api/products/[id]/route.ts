import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID, validateCategoryIds } from '@/lib/categories'

/**
 * PUT /api/products/[id]
 * Update a product
 */
export async function PUT(
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
    const { 
      name_en, name_ar, description_en, description_ar, price, sku, barcode, barcode_type, image_url, is_available, category_ids,
      product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels,
      compare_at_price, discount_type, discount_value, discount_start_date, discount_end_date
    } = body

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
      console.error('Error fetching product for update:', {
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
      console.error('Error verifying store ownership for update:', {
        error: storeError,
        storeId: existingProduct.store_id,
        businessProfileId: businessProfile.id
      })
      return NextResponse.json(
        { error: 'Access denied: Product does not belong to your business' },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: any = {}
    if (name_en !== undefined) updateData.name_en = name_en || null
    if (name_ar !== undefined) updateData.name_ar = name_ar || null
    if (description_en !== undefined) updateData.description_en = description_en || null
    if (description_ar !== undefined) updateData.description_ar = description_ar || null
    if (price !== undefined) {
      if (price <= 0) {
        return NextResponse.json(
          { error: 'Price must be greater than 0' },
          { status: 400 }
        )
      }
      updateData.price = parseFloat(price)
    }
    if (sku !== undefined) updateData.sku = sku || null
    if (barcode !== undefined) updateData.barcode = barcode || null
    if (barcode_type !== undefined) updateData.barcode_type = barcode_type || 'EAN13'
    if (image_url !== undefined) updateData.image_url = image_url || null
    if (is_available !== undefined) updateData.is_available = is_available
    // Classification fields
    if (product_type !== undefined) updateData.product_type = product_type
    if (selling_method !== undefined) updateData.selling_method = selling_method
    if (selling_unit !== undefined) updateData.selling_unit = selling_unit || null
    if (fulfillment_type !== undefined) updateData.fulfillment_type = fulfillment_type
    if (requires_scheduling !== undefined) updateData.requires_scheduling = requires_scheduling
    if (subscription_interval !== undefined) updateData.subscription_interval = subscription_interval || null
    if (sales_channels !== undefined) updateData.sales_channels = sales_channels
    
    // Pricing/discount fields
    if (compare_at_price !== undefined) updateData.compare_at_price = compare_at_price || null
    if (discount_type !== undefined) updateData.discount_type = discount_type
    if (discount_value !== undefined) updateData.discount_value = discount_value || null
    if (discount_start_date !== undefined) updateData.discount_start_date = discount_start_date || null
    if (discount_end_date !== undefined) updateData.discount_end_date = discount_end_date || null

    // Update the product
    const { data: product, error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating product:', updateError)
      return NextResponse.json(
        { error: 'Failed to update product', details: updateError.message },
        { status: 500 }
      )
    }

    // Update categories if provided
    if (category_ids !== undefined) {
      if (!Array.isArray(category_ids)) {
        return NextResponse.json(
          { error: 'Validation error', message: 'category_ids must be an array' },
          { status: 400 }
        )
      }

      if (category_ids.length > 10) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Maximum 10 categories allowed per product' },
          { status: 400 }
        )
      }

      // Validate all category IDs exist and are active
      if (category_ids.length > 0) {
        const validation = await validateCategoryIds(category_ids, supabase)
        if (!validation.valid) {
          return NextResponse.json(
            {
              error: 'Validation error',
              message: 'One or more category IDs are invalid or inactive',
              details: `Invalid IDs: ${validation.invalidIds.join(', ')}`
            },
            { status: 422 }
          )
        }
      }

      // Delete existing category links
      const { error: deleteError } = await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', productId)

      if (deleteError) {
        console.error('Error deleting existing product categories:', deleteError)
        // Don't fail the request, product was updated successfully
      } else {
        // Insert new category links
        if (category_ids.length > 0) {
          const links = category_ids.map((categoryId: string) => ({
            product_id: productId,
            category_id: categoryId
          }))

          const { error: insertError } = await supabase
            .from('product_categories')
            .insert(links)

          if (insertError) {
            console.error('Error inserting product categories:', insertError)
            // Don't fail the request, product was updated successfully
          }
        }
      }
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error in PUT /api/products/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]
 * Delete a product permanently from the database
 * Use ?soft=true query param for soft delete (sets is_active to false)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    
    // Check for soft delete query param
    const url = new URL(request.url)
    const softDelete = url.searchParams.get('soft') === 'true'
    
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
      console.error('Error fetching product for delete:', {
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
      console.error('Error verifying store ownership for delete:', {
        error: storeError,
        storeId: existingProduct.store_id,
        businessProfileId: businessProfile.id
      })
      return NextResponse.json(
        { error: 'Access denied: Product does not belong to your business' },
        { status: 403 }
      )
    }

    if (softDelete) {
      // Soft delete by setting is_active to false
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId)

      if (updateError) {
        console.error('Error soft deleting product:', updateError)
        return NextResponse.json(
          { error: 'Failed to delete product', details: updateError.message },
          { status: 500 }
        )
      }
    } else {
      // Hard delete - permanently remove from database
      // Related records (images, categories, inventory, bundle_items) will be cascade deleted
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (deleteError) {
        console.error('Error deleting product:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete product', details: deleteError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, softDelete })
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

