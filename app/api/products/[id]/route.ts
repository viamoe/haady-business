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

    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError?.message },
        { status: 400 }
      )
    }
    
    const { 
      name_en, name_ar, description_en, description_ar, price, sku, barcode, barcode_type, qr_code, qr_code_auto_generated, image_url, is_available, category_ids,
      product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels,
      compare_at_price, discount_type, discount_value, discount_start_date, discount_end_date,
      // Brand
      brand_id,
      // Inventory fields
      track_inventory, allow_backorder, low_stock_threshold, stock_quantity,
      // Status fields
      status, scheduled_publish_at,
      // Edit history tracking
      edit_type
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

    // Check if product exists and get full product data for history tracking
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
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
      // Allow price to be 0 for drafts, but require > 0 for non-draft products
      const isDraft = status === 'draft' || existingProduct.status === 'draft'
      if (!isDraft && price <= 0) {
        return NextResponse.json(
          { error: 'Price must be greater than 0 for published products' },
          { status: 400 }
        )
      }
      updateData.price = parseFloat(price)
    }
    if (sku !== undefined) updateData.sku = sku || null
    if (barcode !== undefined) updateData.barcode = barcode || null
    if (barcode_type !== undefined) updateData.barcode_type = barcode_type || 'EAN13'
    if (qr_code !== undefined) updateData.qr_code = qr_code || null
    if (qr_code_auto_generated !== undefined) updateData.qr_code_auto_generated = qr_code_auto_generated || false
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

    // Brand
    if (brand_id !== undefined) updateData.brand_id = brand_id || null

    // Status fields
    if (status !== undefined) {
      updateData.status = status
      // Set is_published based on status for backwards compatibility
      updateData.is_published = status === 'active'
    }
    if (scheduled_publish_at !== undefined) updateData.scheduled_publish_at = scheduled_publish_at || null

    // Track changes for edit history
    // Exclude fields that are managed separately or are legacy fields
    const excludeFromHistory = ['image_url', 'is_published']
    const changes: Record<string, { old_value: any; new_value: any }> = {}
    Object.keys(updateData).forEach(key => {
      // Skip excluded fields
      if (excludeFromHistory.includes(key)) return
      
      const oldValue = existingProduct[key]
      const newValue = updateData[key]
      // Only track if value actually changed
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          old_value: oldValue,
          new_value: newValue
        }
      }
    })

    // Get existing categories for history tracking (before updating)
    let oldCategoryIds: string[] = []
    if (category_ids !== undefined) {
      const { data: existingCategories } = await supabase
        .from('product_categories')
        .select('category_id')
        .eq('product_id', productId)

      oldCategoryIds = existingCategories?.map(c => c.category_id).sort() || []
      const newCategoryIds = [...category_ids].sort()

      // Track category changes
      if (JSON.stringify(oldCategoryIds) !== JSON.stringify(newCategoryIds)) {
        changes['category_ids'] = {
          old_value: oldCategoryIds,
          new_value: newCategoryIds
        }
      }
    }

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

    // Handle inventory updates
    if (track_inventory !== undefined || stock_quantity !== undefined || low_stock_threshold !== undefined) {
      try {
        // Get the main branch for this store (or use null for store-level inventory)
        const { data: mainBranch } = await supabase
          .from('store_branches')
          .select('id')
          .eq('store_id', existingProduct.store_id)
          .eq('is_main_branch', true)
          .single()

        // Check if inventory record exists
        const inventoryQuery = supabase
          .from('inventory')
          .select('id, quantity, low_stock_threshold')
          .eq('product_id', productId)
          .eq('store_id', existingProduct.store_id)
        
        if (mainBranch) {
          inventoryQuery.eq('branch_id', mainBranch.id)
        } else {
          inventoryQuery.is('branch_id', null)
        }

        const { data: existingInventory } = await inventoryQuery.maybeSingle()

        const inventoryData: Record<string, any> = {
          product_id: productId,
          store_id: existingProduct.store_id,
        }

        if (mainBranch) {
          inventoryData.branch_id = mainBranch.id
        }

        // Update or create inventory record
        if (track_inventory === false) {
          // If tracking is disabled, delete inventory record if it exists
          if (existingInventory) {
            await supabase
              .from('inventory')
              .delete()
              .eq('id', existingInventory.id)
          }
        } else {
          // Update or create inventory
          if (stock_quantity !== undefined) {
            inventoryData.quantity = parseInt(stock_quantity, 10) || 0
          } else if (existingInventory) {
            inventoryData.quantity = existingInventory.quantity
          } else {
            inventoryData.quantity = 0
          }

          if (low_stock_threshold !== undefined) {
            inventoryData.low_stock_threshold = parseInt(low_stock_threshold, 10) || 10
          } else if (existingInventory) {
            inventoryData.low_stock_threshold = existingInventory.low_stock_threshold || 10
          } else {
            inventoryData.low_stock_threshold = 10
          }

          if (existingInventory) {
            // Update existing inventory
            const { error: inventoryError } = await supabase
              .from('inventory')
              .update({
                quantity: inventoryData.quantity,
                low_stock_threshold: inventoryData.low_stock_threshold
              })
              .eq('id', existingInventory.id)

            if (inventoryError) {
              console.warn(`Product ${productId} updated successfully, but inventory update failed:`, inventoryError)
            }
          } else {
            // Create new inventory record
            inventoryData.reserved_quantity = 0
            const { error: inventoryError } = await supabase
              .from('inventory')
              .insert(inventoryData)

            if (inventoryError) {
              console.warn(`Product ${productId} updated successfully, but inventory creation failed:`, inventoryError)
            }
          }
        }
      } catch (inventoryException: any) {
        console.warn(`Product ${productId} updated successfully, but inventory update encountered an error:`, {
          error: inventoryException?.message || 'Unknown inventory error'
        })
      }
    }

    // Save edit history if there are changes (after all updates are complete)
    if (Object.keys(changes).length > 0) {
      try {
        console.log('📝 Saving edit history with changes:', Object.keys(changes))
        
        const historyPayload = {
          product_id: productId,
          edited_by: user.id,
          changes: changes,
          edit_type: edit_type || 'update'
        }
        
        // Try with regular client first (uses RLS policy)
        const { error: historyError, data: historyData } = await supabase
          .from('product_edit_history')
          .insert(historyPayload)
          .select()

        if (historyError) {
          console.error('❌ Failed to save edit history with regular client:', {
            error: historyError,
            message: historyError.message,
            details: historyError.details,
            hint: historyError.hint,
            code: historyError.code
          })
          
          // Fallback to service role if regular client fails
          try {
            const { createServiceSupabase } = await import('@/lib/supabase/server')
            const serviceSupabase = await createServiceSupabase()
            
            const { error: serviceError, data: serviceData } = await serviceSupabase
              .from('product_edit_history')
              .insert(historyPayload)
              .select()
            
            if (serviceError) {
              console.error('❌ Failed to save edit history with service role:', serviceError)
            } else {
              console.log('✅ Edit history saved successfully with service role:', serviceData)
            }
          } catch (serviceException: any) {
            console.error('❌ Exception using service role:', serviceException?.message)
          }
        } else {
          console.log('✅ Edit history saved successfully:', historyData)
        }
      } catch (historyError: any) {
        // Log error but don't fail the request - history is non-critical
        console.error('❌ Exception saving edit history:', {
          message: historyError?.message,
          stack: historyError?.stack,
          error: historyError
        })
      }
    } else {
      console.log('⚠️ No changes detected, skipping history save. UpdateData keys:', Object.keys(updateData))
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('Error in PUT /api/products/[id]:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error?.stack || error?.toString(),
          productId: params instanceof Promise ? 'loading...' : params?.id 
        })
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]
 * Soft delete a product (move to trash) by default
 * Use ?permanent=true query param for permanent hard delete
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    
    // Check for permanent delete query param
    const url = new URL(request.url)
    const permanentDelete = url.searchParams.get('permanent') === 'true'
    
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

    if (permanentDelete) {
      // Hard delete - permanently remove from database
      // Related records (images, categories, inventory, bundle_items) will be cascade deleted
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (deleteError) {
        console.error('Error permanently deleting product:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete product', details: deleteError.message },
          { status: 500 }
        )
      }
    } else {
      // Soft delete by setting deleted_at timestamp
      const { error: updateError } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', productId)

      if (updateError) {
        console.error('Error soft deleting product:', updateError)
        return NextResponse.json(
          { error: 'Failed to delete product', details: updateError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, permanent: permanentDelete })
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

