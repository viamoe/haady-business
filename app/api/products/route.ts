import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID, validateCategoryIds } from '@/lib/categories'

/**
 * POST /api/products
 * Create a new product
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
      name_en, name_ar, description_en, description_ar, price, sku, barcode, barcode_type, image_url, store_id, category_ids,
      product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels,
      compare_at_price, discount_type, discount_value, discount_start_date, discount_end_date,
      // Inventory fields
      track_inventory, allow_backorder, low_stock_threshold, stock_quantity
    } = body

    // Validate required fields
    // Both name_en and name_ar are required (NOT NULL in database)
    if (!name_en || !name_en.trim()) {
      return NextResponse.json(
        { error: 'Product name in English (name_en) is required' },
        { status: 400 }
      )
    }
    
    if (!name_ar || !name_ar.trim()) {
      return NextResponse.json(
        { error: 'Product name in Arabic (name_ar) is required' },
        { status: 400 }
      )
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      )
    }

    if (!store_id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
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
      .select('id, business_id')
      .eq('id', store_id)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

    // Generate SKU if not provided
    const finalSku = sku || `PROD-${Date.now()}`

    // Prepare product data
    const productData: Record<string, any> = {
      store_id,
      name_en: name_en.trim(),
      name_ar: name_ar.trim(),
      description_en: description_en?.trim() || null,
      description_ar: description_ar?.trim() || null,
      price: parseFloat(price),
      sku: finalSku,
      image_url: image_url || null,
      is_available: true,
      is_active: true,
    }

    // Add barcode fields if provided
    if (barcode) {
      productData.barcode = barcode
      productData.barcode_type = barcode_type || 'EAN13'
    }

    // Add classification fields if provided
    if (product_type) productData.product_type = product_type
    if (selling_method) productData.selling_method = selling_method
    if (selling_unit !== undefined) productData.selling_unit = selling_unit || null
    if (fulfillment_type) productData.fulfillment_type = fulfillment_type
    if (requires_scheduling !== undefined) productData.requires_scheduling = requires_scheduling
    if (subscription_interval !== undefined) productData.subscription_interval = subscription_interval || null
    if (sales_channels) productData.sales_channels = sales_channels

    // Add pricing/discount fields if provided
    if (compare_at_price !== undefined) productData.compare_at_price = compare_at_price || null
    if (discount_type) productData.discount_type = discount_type
    if (discount_value !== undefined) productData.discount_value = discount_value || null
    if (discount_start_date !== undefined) productData.discount_start_date = discount_start_date || null
    if (discount_end_date !== undefined) productData.discount_end_date = discount_end_date || null

    // Add inventory tracking fields if provided
    if (track_inventory !== undefined) productData.track_inventory = track_inventory
    if (allow_backorder !== undefined) productData.allow_backorder = allow_backorder
    if (low_stock_threshold !== undefined && low_stock_threshold !== null) {
      productData.low_stock_threshold = parseInt(low_stock_threshold, 10) || 10
    }

    console.log('Creating product with data:', {
      store_id,
      name_en: productData.name_en,
      name_ar: productData.name_ar,
      price: productData.price,
      sku: productData.sku,
      business_id: businessProfile.id
    })

    // Create the product
    let product
    let productError
    
    try {
      const result = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()
      
      product = result.data
      productError = result.error
      
      if (productError) {
        console.error('Supabase error creating product:', {
          error: productError,
          code: productError.code,
          message: productError.message,
          details: productError.details,
          hint: productError.hint
        })
      }
    } catch (insertException: any) {
      console.error('Exception during product insert:', {
        exception: insertException,
        message: insertException?.message,
        stack: insertException?.stack,
        name: insertException?.name,
        productData
      })
      return NextResponse.json(
        { 
          error: 'Failed to create product', 
          details: insertException?.message || 'Database insert exception',
          type: 'insert_exception',
          ...(process.env.NODE_ENV === 'development' && { stack: insertException?.stack })
        },
        { status: 500 }
      )
    }

    if (productError) {
      console.error('Error creating product:', {
        error: productError,
        code: productError.code,
        message: productError.message,
        details: productError.details,
        hint: productError.hint,
        store_id: store_id,
        business_id: businessProfile.id
      })
      return NextResponse.json(
        { 
          error: 'Failed to create product', 
          details: productError.message || 'Unknown database error',
          code: productError.code,
          hint: productError.hint
        },
        { status: 500 }
      )
    }

    if (!product) {
      console.error('Product creation returned no data')
      return NextResponse.json(
        { 
          error: 'Failed to create product',
          details: 'Product was not returned after creation'
        },
        { status: 500 }
      )
    }

    // Link categories if provided (completely optional - never fails product creation)
    // Normalize category_ids: handle null, undefined, empty string, etc.
    const normalizedCategoryIds = Array.isArray(category_ids) 
      ? category_ids.filter(id => id && typeof id === 'string' && id.trim().length > 0)
      : []
    
    // Only attempt category linking if we have valid IDs
    // This is completely optional - product creation succeeds regardless
    if (normalizedCategoryIds.length > 0) {
      // Use a separate try-catch to ensure product creation always succeeds
      try {
        // Validate category_ids count
        if (normalizedCategoryIds.length > 10) {
          console.warn(`Product ${product.id} created, but too many categories (${normalizedCategoryIds.length}). Maximum is 10.`)
          // Don't fail - just skip category linking
        } else {
          // Validate all category IDs exist and are active
          let validation
          try {
            validation = await validateCategoryIds(normalizedCategoryIds, supabase)
          } catch (validationError: any) {
            console.warn('Error validating category IDs (product created successfully):', {
              error: validationError?.message || 'Unknown validation error',
              productId: product.id
            })
            // If validation fails, skip category linking but don't fail product creation
            validation = { valid: false, invalidIds: normalizedCategoryIds }
          }

          if (!validation.valid && validation.invalidIds.length > 0) {
            // Product created but categories invalid - log warning
            console.warn(`Product ${product.id} created, but some categories are invalid:`, validation.invalidIds)
          }

          // Insert valid category links
          const validCategoryIds = normalizedCategoryIds.filter(
            (id: string) => !validation.invalidIds.includes(id)
          )

          if (validCategoryIds.length > 0) {
            try {
              const links = validCategoryIds.map((categoryId: string) => ({
                product_id: product.id,
                category_id: categoryId
              }))

              const { error: categoryError } = await supabase
                .from('product_categories')
                .insert(links)

              if (categoryError) {
                // Log error but don't fail - product was created successfully
                console.warn(`Product ${product.id} created successfully, but category linking failed:`, {
                  code: categoryError.code,
                  message: categoryError.message,
                  hint: categoryError.hint
                })
                // Categories can be added later via the product edit form
              } else {
                console.log(`Successfully linked ${validCategoryIds.length} categories to product ${product.id}`)
              }
            } catch (insertError: any) {
              // Catch any unexpected errors during insert
              console.warn(`Product ${product.id} created successfully, but category insert failed:`, {
                error: insertError?.message || 'Unknown insert error'
              })
            }
          }
        }
      } catch (categoryError: any) {
        // Catch any unexpected errors in category linking
        // This should never happen, but if it does, product creation still succeeds
        console.warn(`Product ${product.id} created successfully, but category linking encountered an error:`, {
          error: categoryError?.message || 'Unknown category error'
        })
      }
    }

    // Create initial inventory record if stock_quantity is provided
    if (stock_quantity !== undefined && stock_quantity !== null && track_inventory !== false) {
      try {
        const initialQuantity = parseInt(stock_quantity, 10) || 0
        
        if (initialQuantity >= 0) {
          // Get the main branch for this store (or use null for store-level inventory)
          const { data: mainBranch } = await supabase
            .from('store_branches')
            .select('id')
            .eq('store_id', store_id)
            .eq('is_main_branch', true)
            .single()

          // Create inventory record
          const inventoryData: Record<string, any> = {
            product_id: product.id,
            store_id: store_id,
            quantity: initialQuantity,
            reserved_quantity: 0,
            low_stock_threshold: productData.low_stock_threshold || 10
          }

          // If main branch exists, associate inventory with it
          if (mainBranch) {
            inventoryData.branch_id = mainBranch.id
          }

          const { error: inventoryError } = await supabase
            .from('inventory')
            .insert(inventoryData)

          if (inventoryError) {
            // Log error but don't fail - product was created successfully
            console.warn(`Product ${product.id} created successfully, but inventory record failed:`, {
              code: inventoryError.code,
              message: inventoryError.message,
              hint: inventoryError.hint
            })
          } else {
            console.log(`Successfully created inventory record for product ${product.id} with quantity ${initialQuantity}`)
          }
        }
      } catch (inventoryException: any) {
        // Catch any unexpected errors during inventory creation
        console.warn(`Product ${product.id} created successfully, but inventory creation encountered an error:`, {
          error: inventoryException?.message || 'Unknown inventory error'
        })
      }
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/products:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      error: error
    })
    
    // Ensure we always return a serializable error response
    const errorResponse: any = {
      error: 'Internal server error',
      details: error?.message || 'An unexpected error occurred'
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error?.stack
      errorResponse.name = error?.name
      errorResponse.code = error?.code
      errorResponse.hint = error?.hint
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

