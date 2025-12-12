import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

interface SallaProduct {
  id: number
  name: string
  sku: string
  description?: string
  price: {
    amount: number
    currency: string
    compare_at?: number
  }
  quantity?: number
  status: string
  images?: Array<{
    id: number
    url: string
  }>
  categories?: Array<{
    id: number
    name: string
  }>
  variants?: Array<{
    id: number
    name: string
    sku: string
    price: {
      amount: number
      currency: string
    }
    quantity?: number
  }>
  weight?: number
  slug?: string
}

interface SyncResult {
  success: boolean
  productsSynced: number
  productsCreated: number
  productsUpdated: number
  errors: string[]
}

interface InventorySyncResult {
  success: boolean
  productsUpdated: number
  errors: string[]
}

/**
 * Fetch products from Salla API
 */
async function fetchSallaProducts(
  accessToken: string,
  page: number = 1,
  perPage: number = 50
): Promise<{ products: SallaProduct[]; hasMore: boolean }> {
  const response = await fetch(
    `https://api.salla.dev/admin/v2/products?page=${page}&per_page=${perPage}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Salla API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  // Salla API returns data in a 'data' property with pagination
  const products = data.data || []
  const pagination = data.pagination || {}
  
  return {
    products,
    hasMore: pagination.current_page < pagination.total_pages,
  }
}

/**
 * Get or create a store for the merchant
 * Uses admin client to bypass RLS for store creation
 */
async function getOrCreateStore(
  supabase: any,
  merchantId: string,
  storeName: string,
  storeDomain?: string
): Promise<string> {
  // First, try to find an existing store for this merchant (using regular client)
  const { data: existingStore } = await supabase
    .from('stores')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (existingStore) {
    return existingStore.id
  }

  // Create a new store if none exists - use admin client to bypass RLS
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const slug = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const { data: newStore, error } = await adminClient
    .from('stores')
    .insert({
      merchant_id: merchantId,
      name: storeName,
      slug: `${slug}-${Date.now()}`,
      store_type: 'online',
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create store: ${error.message}`)
  }

  return newStore.id
}

/**
 * Detect language of text (simple detection)
 */
function detectLanguage(text: string): 'ar' | 'en' {
  // Simple Arabic detection - check for Arabic characters
  const arabicPattern = /[\u0600-\u06FF]/
  return arabicPattern.test(text) ? 'ar' : 'en'
}

/**
 * Preview products from Salla (without saving to database)
 */
export async function previewSallaProducts(
  accessToken: string
): Promise<Array<{
  id: string
  platformProductId: string
  name: string
  nameEn?: string
  nameAr?: string
  description?: string
  descriptionEn?: string
  descriptionAr?: string
  price: number
  sku?: string
  imageUrl?: string
  isActive: boolean
  isAvailable: boolean
  inventory?: number
}>> {
  // Fetch all products from Salla (handle pagination)
  let page = 1
  let hasMore = true
  const allProducts: SallaProduct[] = []

  while (hasMore) {
    try {
      const { products, hasMore: more } = await fetchSallaProducts(accessToken, page, 50)
      allProducts.push(...products)
      hasMore = more
      page++
    } catch (error: any) {
      throw new Error(`Error fetching products: ${error.message}`)
    }
  }

  // Map to preview format
  const previews = allProducts.map((sallaProduct) => {
    // Detect language for name and description
    const nameLang = detectLanguage(sallaProduct.name)
    const descLang = sallaProduct.description ? detectLanguage(sallaProduct.description) : 'en'

    const quantity = sallaProduct.quantity || 0

    return {
      id: sallaProduct.id.toString(),
      platformProductId: sallaProduct.id.toString(),
      name: sallaProduct.name,
      nameEn: nameLang === 'en' ? sallaProduct.name : undefined,
      nameAr: nameLang === 'ar' ? sallaProduct.name : undefined,
      description: sallaProduct.description,
      descriptionEn: descLang === 'en' ? sallaProduct.description : undefined,
      descriptionAr: descLang === 'ar' ? sallaProduct.description : undefined,
      price: sallaProduct.price.amount,
      sku: sallaProduct.sku || sallaProduct.id.toString(),
      imageUrl: sallaProduct.images && sallaProduct.images.length > 0
        ? sallaProduct.images[0].url
        : undefined,
      isActive: sallaProduct.status === 'active' || sallaProduct.status === 'published',
      isAvailable: quantity > 0,
      inventory: quantity,
    }
  })

  return previews
}

/**
 * Sync products from Salla to database
 */
export async function syncSallaProducts(
  userId: string,
  accessToken: string,
  storeName?: string,
  storeDomain?: string,
  selectedProductIds?: string[]
): Promise<SyncResult> {
  const supabase = await createServerSupabase()
  // Create admin client for product operations to bypass RLS
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
  const result: SyncResult = {
    success: true,
    productsSynced: 0,
    productsCreated: 0,
    productsUpdated: 0,
    errors: [],
  }

  try {
    // Get merchant_id from merchant_users
    const { data: merchantUser, error: merchantError } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', userId)
      .single()

    if (merchantError || !merchantUser) {
      throw new Error('Merchant not found. Please complete your business setup first.')
    }

    const merchantId = merchantUser.merchant_id

    // Get or create store
    const storeId = await getOrCreateStore(
      supabase,
      merchantId,
      storeName || 'Salla Store',
      storeDomain
    )

    // Fetch all products from Salla (handle pagination)
    let page = 1
    let hasMore = true
    const allProducts: SallaProduct[] = []

    while (hasMore) {
      try {
        const { products, hasMore: more } = await fetchSallaProducts(accessToken, page, 50)
        allProducts.push(...products)
        hasMore = more
        page++
      } catch (error: any) {
        result.errors.push(`Error fetching page ${page}: ${error.message}`)
        hasMore = false
      }
    }

    console.log(`📦 Fetched ${allProducts.length} products from Salla`)

    // Filter products if selectedProductIds is provided
    let productsToProcess = allProducts
    if (selectedProductIds && selectedProductIds.length > 0) {
      const selectedIds = new Set(selectedProductIds.map(id => parseInt(id)))
      productsToProcess = allProducts.filter(p => selectedIds.has(p.id))
      console.log(`📋 Filtering to ${productsToProcess.length} selected products (out of ${allProducts.length} total)`)
    }

    // Process each product
    for (const sallaProduct of productsToProcess) {
      try {
        // Detect language for name and description
        const nameLang = detectLanguage(sallaProduct.name)
        const descLang = sallaProduct.description ? detectLanguage(sallaProduct.description) : 'en'

        // Map Salla product to our actual database schema
        // Note: stock column doesn't exist in products table, so we only sync is_available
        const productData: any = {
          store_id: storeId,
          price: sallaProduct.price.amount,
          sku: sallaProduct.sku || sallaProduct.id.toString(),
          // stock: sallaProduct.quantity || 0, // Column doesn't exist - stored in platform_data instead
          is_available: (sallaProduct.quantity || 0) > 0,
          is_active: sallaProduct.status === 'active' || sallaProduct.status === 'published',
        }

        // Set name based on detected language
        if (nameLang === 'ar') {
          productData.name_ar = sallaProduct.name
          productData.name_en = sallaProduct.name // Fallback to same value if no English
        } else {
          productData.name_en = sallaProduct.name
          productData.name_ar = sallaProduct.name // Fallback to same value if no Arabic
        }

        // Set description based on detected language
        if (sallaProduct.description) {
          if (descLang === 'ar') {
            productData.description_ar = sallaProduct.description
            productData.description_en = sallaProduct.description // Fallback
          } else {
            productData.description_en = sallaProduct.description
            productData.description_ar = sallaProduct.description // Fallback
          }
        }

        // Set image URL if available (use first image)
        if (sallaProduct.images && sallaProduct.images.length > 0) {
          productData.image_url = sallaProduct.images[0].url
        }

        // Set compare_at_price if available
        if (sallaProduct.price && sallaProduct.price.compare_at) {
          productData.compare_at_price = sallaProduct.price.compare_at
        }

        // Prepare platform-specific data to store in product_sources
        const platformData = {
          name: sallaProduct.name,
          description: sallaProduct.description,
          price: sallaProduct.price,
          quantity: sallaProduct.quantity,
          status: sallaProduct.status,
          images: sallaProduct.images || [],
          categories: sallaProduct.categories || [],
          variants: sallaProduct.variants || [],
          weight: sallaProduct.weight,
          slug: sallaProduct.slug,
        }

        // Check if product source already exists (by platform and platform_product_id)
        // Use adminClient to bypass RLS for reliable duplicate detection
        let existingSource: { product_id: string } | null = null
        
        try {
          const { data, error: sourceCheckError } = await adminClient
            .from('product_sources')
            .select('product_id')
            .eq('platform', 'salla')
            .eq('platform_product_id', sallaProduct.id.toString())
            .maybeSingle()

          if (sourceCheckError) {
            // If table doesn't exist or other error, fall back to product checks
            if (sourceCheckError.code === '42P01' || sourceCheckError.message?.includes('does not exist')) {
              console.log('product_sources table may not exist, using product table fallback')
            } else if (sourceCheckError.code !== 'PGRST116') {
              console.error('Error checking for existing product source:', sourceCheckError)
            }
          } else {
            existingSource = data
          }
        } catch (err) {
          console.log('Error querying product_sources, using product table fallback:', err)
        }

        // Fallback: Check by SKU within the same store (most reliable fallback)
        let existingProductBySku: { id: string } | null = null
        if (!existingSource) {
          try {
            const { data: skuProduct } = await adminClient
              .from('products')
              .select('id')
              .eq('store_id', storeId)
              .eq('sku', productData.sku)
              .maybeSingle()
            
            existingProductBySku = skuProduct
            
            // If found by SKU, also check if product_source exists for this product
            if (existingProductBySku) {
              const { data: existingSourceForProduct } = await adminClient
                .from('product_sources')
                .select('product_id, platform, platform_product_id')
                .eq('product_id', existingProductBySku.id)
                .eq('platform', 'salla')
                .maybeSingle()
              
              // If product_source exists but with different platform_product_id, it's a different product
              // This prevents linking the same product to multiple platform products
              if (existingSourceForProduct && existingSourceForProduct.platform_product_id !== sallaProduct.id.toString()) {
                console.log(`⚠️ Product with SKU ${productData.sku} exists but is linked to different Salla product (${existingSourceForProduct.platform_product_id}), skipping to prevent duplicate`)
                result.errors.push(`Product with SKU ${productData.sku} already exists and is linked to a different Salla product`)
                continue
              }
            }
          } catch (err) {
            console.error('Error checking by SKU:', err)
          }
        }
        
        // Additional check: Verify product doesn't exist by platform_product_id in products table
        // (in case product_sources table doesn't exist but we want to prevent duplicates)
        if (!existingSource && !existingProductBySku) {
          try {
            // Check if any product in this store has the same name and SKU (additional safety check)
            const { data: duplicateCheck } = await adminClient
              .from('products')
              .select('id, sku, name_en, name_ar')
              .eq('store_id', storeId)
              .or(`name_en.eq.${productData.name_en || ''},name_ar.eq.${productData.name_ar || ''}`)
              .maybeSingle()
            
            if (duplicateCheck && duplicateCheck.sku === productData.sku) {
              console.log(`⚠️ Potential duplicate detected: Product with same SKU and similar name exists (ID: ${duplicateCheck.id})`)
              // Don't create duplicate, update existing instead
              existingProductBySku = { id: duplicateCheck.id }
            }
          } catch (err) {
            // This is a safety check, so we can ignore errors
            console.log('Duplicate check failed (non-critical):', err)
          }
        }

        let productId: string
        let isNewProduct = false

        if (existingSource && existingSource.product_id) {
          // Product source exists, update the product and source
          productId = existingSource.product_id

          const { error: updateError } = await adminClient
            .from('products')
            .update({
              ...productData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', productId)

          if (updateError) {
            result.errors.push(`Error updating product ${sallaProduct.name}: ${updateError.message}`)
            continue
          }

          // Update product source
          const { error: sourceUpdateError } = await adminClient
            .from('product_sources')
            .update({
              platform_sku: sallaProduct.sku,
              platform_data: platformData,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('product_id', productId)
            .eq('platform', 'salla')

          if (sourceUpdateError) {
            result.errors.push(`Error updating product source for ${sallaProduct.name}: ${sourceUpdateError.message}`)
          }

          result.productsUpdated++
        } else if (existingProductBySku && existingProductBySku.id) {
          // Product exists by SKU but no product_source - update product and create source
          productId = existingProductBySku.id

          const { error: updateError } = await adminClient
            .from('products')
            .update({
              ...productData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', productId)

          if (updateError) {
            result.errors.push(`Error updating product ${sallaProduct.name}: ${updateError.message}`)
            continue
          }

          // Try to create product source (might fail if table doesn't exist, that's okay)
          try {
            await adminClient
              .from('product_sources')
              .insert({
                product_id: productId,
                platform: 'salla',
                platform_product_id: sallaProduct.id.toString(),
                platform_sku: sallaProduct.sku,
                platform_data: platformData,
                synced_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString(),
              })
          } catch (sourceErr: any) {
            // Table might not exist yet, that's okay
            console.log('Could not create product_source (table may not exist):', sourceErr.message)
          }

          result.productsUpdated++
        } else {
          // New product - create both product and product_source
          const { data: newProduct, error: insertError } = await adminClient
            .from('products')
            .insert(productData)
            .select('id')
            .single()

          if (insertError) {
            result.errors.push(`Error creating product ${sallaProduct.name}: ${insertError.message}`)
            continue
          }

          productId = newProduct.id
          isNewProduct = true
          result.productsCreated++

          // Create product source record (might fail if table doesn't exist, that's okay)
          try {
            const { error: sourceError } = await adminClient
              .from('product_sources')
              .insert({
                product_id: productId,
                platform: 'salla',
                platform_product_id: sallaProduct.id.toString(),
                platform_sku: sallaProduct.sku,
                platform_data: platformData,
                synced_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString(),
              })

            if (sourceError) {
              // Table might not exist yet, that's okay - log but don't fail
              console.log('Could not create product_source (table may not exist):', sourceError.message)
            }
          } catch (sourceErr: any) {
            console.log('Error creating product_source:', sourceErr.message)
          }
        }

        result.productsSynced++
      } catch (error: any) {
        result.errors.push(`Error processing product ${sallaProduct.name}: ${error.message}`)
        console.error('Error processing product:', error)
      }
    }

    console.log(`✅ Sync complete: ${result.productsCreated} created, ${result.productsUpdated} updated`)

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  } catch (error: any) {
    console.error('Error in syncSallaProducts:', error)
    result.success = false
    result.errors.push(error.message || 'Unknown error occurred')
    return result
  }
}

/**
 * Sync inventory (stock quantities) from Salla to database
 * This is a lightweight sync that only updates stock levels
 */
export async function syncSallaInventory(
  userId: string,
  accessToken: string
): Promise<InventorySyncResult> {
  const supabase = await createServerSupabase()
  // Create admin client for product operations to bypass RLS
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
  const result: InventorySyncResult = {
    success: true,
    productsUpdated: 0,
    errors: [],
  }

  try {
    // Fetch all products from Salla (handle pagination)
    let page = 1
    let hasMore = true
    const allProducts: SallaProduct[] = []

    while (hasMore) {
      try {
        const { products, hasMore: more } = await fetchSallaProducts(accessToken, page, 50)
        allProducts.push(...products)
        hasMore = more
        page++
      } catch (error: any) {
        result.errors.push(`Error fetching page ${page}: ${error.message}`)
        hasMore = false
      }
    }

    console.log(`📦 Fetched ${allProducts.length} products for inventory sync`)

    // Process each product - only update stock and is_available
    for (const sallaProduct of allProducts) {
      try {
        // Find product by product_sources first (most reliable)
        let productId: string | null = null

        try {
          const { data: source } = await supabase
            .from('product_sources')
            .select('product_id')
            .eq('platform', 'salla')
            .eq('platform_product_id', sallaProduct.id.toString())
            .maybeSingle()

          if (source) {
            productId = source.product_id
          }
        } catch (err) {
          // If product_sources doesn't exist, fall back to SKU
          console.log('product_sources lookup failed, using SKU fallback')
        }

        // Fallback: Find by SKU if product_sources didn't work
        if (!productId) {
          const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('sku', sallaProduct.sku || sallaProduct.id.toString())
            .maybeSingle()

          if (product) {
            productId = product.id
          }
        }

        if (!productId) {
          // Product doesn't exist yet - skip (inventory sync only updates existing products)
          continue
        }

        // Update is_available based on stock quantity
        // Note: stock column doesn't exist in products table, so we only update is_available
        // Stock quantity is stored in product_sources.platform_data.quantity
        const stock = sallaProduct.quantity || 0
        const updateData: any = {
          // stock: stock, // Column doesn't exist - stored in platform_data instead
          is_available: stock > 0,
          updated_at: new Date().toISOString(),
        }

        const { error: updateError } = await adminClient
          .from('products')
          .update(updateData)
          .eq('id', productId)

        if (updateError) {
          result.errors.push(`Error updating inventory for product ${sallaProduct.name}: ${updateError.message}`)
          continue
        }

        // Update platform_data quantity in product_sources if it exists
        try {
          // First, get the existing platform_data
          const { data: existingSource } = await adminClient
            .from('product_sources')
            .select('platform_data')
            .eq('product_id', productId)
            .eq('platform', 'salla')
            .maybeSingle()

          if (existingSource) {
            // Update platform_data with new quantity
            const updatedPlatformData = {
              ...(existingSource.platform_data || {}),
              quantity: stock,
            }

            await adminClient
              .from('product_sources')
              .update({
                platform_data: updatedPlatformData,
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('product_id', productId)
              .eq('platform', 'salla')
          }
        } catch (err) {
          // If product_sources doesn't exist or update fails, that's okay
          // We can manually update platform_data later if needed
          console.log('Could not update product_sources platform_data:', err)
        }

        result.productsUpdated++
      } catch (error: any) {
        result.errors.push(`Error processing inventory for product ${sallaProduct.name}: ${error.message}`)
        console.error('Error processing inventory:', error)
      }
    }

    console.log(`✅ Inventory sync complete: ${result.productsUpdated} products updated`)

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  } catch (error: any) {
    console.error('Error in syncSallaInventory:', error)
    result.success = false
    result.errors.push(error.message || 'Unknown error occurred')
    return result
  }
}

