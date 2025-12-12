import { createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

interface ShopifyProduct {
  id: number
  title: string
  body_html?: string
  vendor?: string
  product_type?: string
  created_at: string
  handle: string
  updated_at: string
  published_at?: string
  template_suffix?: string
  status: string
  published_scope: string
  tags: string
  admin_graphql_api_id: string
  variants: Array<{
    id: number
    product_id: number
    title: string
    price: string
    sku?: string
    position: number
    compare_at_price?: string
    option1?: string
    option2?: string
    option3?: string
    taxable: boolean
    barcode?: string
    grams: number
    image_id?: number
    weight: number
    weight_unit: string
    inventory_item_id: number
    inventory_quantity?: number
    old_inventory_quantity?: number
    requires_shipping: boolean
    created_at: string
    updated_at: string
  }>
  images: Array<{
    id: number
    product_id: number
    position: number
    created_at: string
    updated_at: string
    alt?: string
    width: number
    height: number
    src: string
    variant_ids: number[]
    admin_graphql_api_id: string
  }>
  options: Array<{
    id: number
    product_id: number
    name: string
    position: number
    values: string[]
  }>
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[]
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
 * Fetch products from Shopify API
 */
async function fetchShopifyProducts(
  shopDomain: string,
  accessToken: string,
  pageInfo?: string,
  limit: number = 250
): Promise<{ products: ShopifyProduct[]; nextPageInfo?: string }> {
  // Shopify uses cursor-based pagination with page_info
  let url = `https://${shopDomain}/admin/api/2024-01/products.json?limit=${limit}`
  
  if (pageInfo) {
    url += `&page_info=${pageInfo}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Shopify API error: ${response.status} - ${errorText}`)
  }

  const data: ShopifyProductsResponse = await response.json()
  
  // Extract next page info from Link header if present
  const linkHeader = response.headers.get('link')
  let nextPageInfo: string | undefined
  
  if (linkHeader) {
    const nextMatch = linkHeader.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/)
    if (nextMatch) {
      nextPageInfo = decodeURIComponent(nextMatch[1])
    }
  }
  
  return {
    products: data.products || [],
    nextPageInfo,
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
 * Preview products from Shopify (without saving to database)
 */
export async function previewShopifyProducts(
  accessToken: string,
  storeDomain?: string
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
  // Extract shop domain from storeDomain (format: haady-shopy.myshopify.com)
  let shopDomain = storeDomain || ''
  if (shopDomain.includes('.myshopify.com')) {
    shopDomain = shopDomain.replace('.myshopify.com', '')
  } else if (shopDomain.includes('myshopify.com')) {
    shopDomain = shopDomain.split('.')[0]
  }

  if (!shopDomain) {
    throw new Error('Shop domain is required for Shopify preview')
  }

  // Fetch all products from Shopify (handle pagination)
  let pageInfo: string | undefined
  const allProducts: ShopifyProduct[] = []

  do {
    try {
      const { products, nextPageInfo } = await fetchShopifyProducts(
        `${shopDomain}.myshopify.com`,
        accessToken,
        pageInfo
      )
      allProducts.push(...products)
      pageInfo = nextPageInfo
    } catch (error: any) {
      throw new Error(`Error fetching products: ${error.message}`)
    }
  } while (pageInfo)

  // Map to preview format
  const previews = allProducts.map((shopifyProduct) => {
    const mainVariant = shopifyProduct.variants?.[0]
    if (!mainVariant) {
      return null
    }

    // Detect language for name and description
    const nameLang = detectLanguage(shopifyProduct.title)
    const descLang = shopifyProduct.body_html ? detectLanguage(shopifyProduct.body_html) : 'en'

    // Calculate total inventory across all variants
    const totalInventory = shopifyProduct.variants.reduce(
      (sum, variant) => sum + (variant.inventory_quantity || 0),
      0
    )

    // Remove HTML tags for description
    const plainDescription = shopifyProduct.body_html
      ? shopifyProduct.body_html.replace(/<[^>]*>/g, '').trim()
      : undefined

    return {
      id: shopifyProduct.id.toString(),
      platformProductId: shopifyProduct.id.toString(),
      name: shopifyProduct.title,
      nameEn: nameLang === 'en' ? shopifyProduct.title : undefined,
      nameAr: nameLang === 'ar' ? shopifyProduct.title : undefined,
      description: plainDescription,
      descriptionEn: descLang === 'en' ? plainDescription : undefined,
      descriptionAr: descLang === 'ar' ? plainDescription : undefined,
      price: parseFloat(mainVariant.price) || 0,
      sku: mainVariant.sku || shopifyProduct.id.toString(),
      imageUrl: shopifyProduct.images && shopifyProduct.images.length > 0
        ? shopifyProduct.images[0].src
        : undefined,
      isActive: shopifyProduct.status === 'active',
      isAvailable: totalInventory > 0,
      inventory: totalInventory,
    }
  }).filter((p): p is NonNullable<typeof p> => p !== null)

  return previews
}

/**
 * Sync products from Shopify to database
 */
export async function syncShopifyProducts(
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
    console.log('🛍️ Starting Shopify sync:', {
      userId,
      storeName,
      storeDomain,
      hasAccessToken: !!accessToken,
    })
    
    // Get merchant_id from merchant_users
    const { data: merchantUser, error: merchantError } = await supabase
      .from('merchant_users')
      .select('merchant_id')
      .eq('auth_user_id', userId)
      .single()

    if (merchantError || !merchantUser) {
      console.error('❌ Merchant lookup failed:', merchantError)
      throw new Error('Merchant not found. Please complete your business setup first.')
    }

    const merchantId = merchantUser.merchant_id
    console.log('✅ Found merchant:', merchantId)

    // Get or create store
    const storeId = await getOrCreateStore(
      supabase,
      merchantId,
      storeName || 'Shopify Store',
      storeDomain
    )
    console.log('✅ Store ID:', storeId)

    // Extract shop domain from storeDomain (format: haady-shopy.myshopify.com)
    let shopDomain = storeDomain || ''
    if (shopDomain.includes('.myshopify.com')) {
      shopDomain = shopDomain.replace('.myshopify.com', '')
    } else if (shopDomain.includes('myshopify.com')) {
      shopDomain = shopDomain.split('.')[0]
    }

    if (!shopDomain) {
      throw new Error('Shop domain is required for Shopify sync')
    }

    // Fetch all products from Shopify (handle pagination)
    let pageInfo: string | undefined
    const allProducts: ShopifyProduct[] = []

    do {
      try {
        const { products, nextPageInfo } = await fetchShopifyProducts(
          `${shopDomain}.myshopify.com`,
          accessToken,
          pageInfo
        )
        allProducts.push(...products)
        pageInfo = nextPageInfo
      } catch (error: any) {
        result.errors.push(`Error fetching products: ${error.message}`)
        pageInfo = undefined // Stop pagination on error
      }
    } while (pageInfo)

    console.log(`📦 Fetched ${allProducts.length} products from Shopify`)
    
    if (allProducts.length === 0) {
      console.warn('⚠️ No products found in Shopify store')
      return result
    }

    // Filter products if selectedProductIds is provided
    let productsToProcess = allProducts
    if (selectedProductIds && selectedProductIds.length > 0) {
      const selectedIds = new Set(selectedProductIds.map(id => parseInt(id)))
      productsToProcess = allProducts.filter(p => selectedIds.has(p.id))
      console.log(`📋 Filtering to ${productsToProcess.length} selected products (out of ${allProducts.length} total)`)
    }

    // Process each product
    console.log(`🔄 Starting to process ${productsToProcess.length} products...`)
    for (const shopifyProduct of productsToProcess) {
      try {
        console.log(`🛍️ Processing Shopify product: ${shopifyProduct.title} (ID: ${shopifyProduct.id})`)
        
        // Get the first variant (or default variant) for main product data
        const mainVariant = shopifyProduct.variants?.[0]
        if (!mainVariant) {
          console.warn(`⚠️ Product ${shopifyProduct.title} has no variants, skipping`)
          result.errors.push(`Product ${shopifyProduct.title} has no variants, skipping`)
          continue
        }

        // Detect language for name and description
        const nameLang = detectLanguage(shopifyProduct.title)
        const descLang = shopifyProduct.body_html ? detectLanguage(shopifyProduct.body_html) : 'en'

        // Calculate total inventory across all variants
        const totalInventory = shopifyProduct.variants.reduce(
          (sum, variant) => sum + (variant.inventory_quantity || 0),
          0
        )

        // Map Shopify product to our database schema
        // Note: products table uses name_en/name_ar, not name/slug
        const productData: any = {
          store_id: storeId,
          price: parseFloat(mainVariant.price) || 0,
          sku: mainVariant.sku || shopifyProduct.id.toString(),
          is_available: totalInventory > 0,
          is_active: shopifyProduct.status === 'active',
        }

        // Set name based on detected language
        if (nameLang === 'ar') {
          productData.name_ar = shopifyProduct.title
          productData.name_en = shopifyProduct.title // Fallback
        } else {
          productData.name_en = shopifyProduct.title
          productData.name_ar = shopifyProduct.title // Fallback
        }

        // Set description based on detected language
        if (shopifyProduct.body_html) {
          // Remove HTML tags for description
          const plainDescription = shopifyProduct.body_html.replace(/<[^>]*>/g, '').trim()
          if (plainDescription) {
            if (descLang === 'ar') {
              productData.description_ar = plainDescription
              productData.description_en = plainDescription // Fallback
            } else {
              productData.description_en = plainDescription
              productData.description_ar = plainDescription // Fallback
            }
          }
        }

        // Set image URL if available (use first image)
        if (shopifyProduct.images && shopifyProduct.images.length > 0) {
          productData.image_url = shopifyProduct.images[0].src
        }

        // Set compare_at_price if available
        if (mainVariant.compare_at_price) {
          productData.compare_at_price = parseFloat(mainVariant.compare_at_price)
        }

        // Prepare platform-specific data to store in product_sources
        const platformData = {
          title: shopifyProduct.title,
          body_html: shopifyProduct.body_html,
          vendor: shopifyProduct.vendor,
          product_type: shopifyProduct.product_type,
          handle: shopifyProduct.handle,
          status: shopifyProduct.status,
          tags: shopifyProduct.tags,
          variants: shopifyProduct.variants,
          images: shopifyProduct.images,
          options: shopifyProduct.options,
          total_inventory: totalInventory,
        }

        // Check if product source already exists (by platform and platform_product_id)
        let existingSource: { product_id: string } | null = null
        
        try {
          const { data, error: sourceCheckError } = await supabase
            .from('product_sources')
            .select('product_id')
            .eq('platform', 'shopify')
            .eq('platform_product_id', shopifyProduct.id.toString())
            .maybeSingle()

          if (sourceCheckError) {
            if (sourceCheckError.code === '42P01' || sourceCheckError.message?.includes('does not exist')) {
              console.log('product_sources table may not exist, using SKU fallback')
            } else if (sourceCheckError.code !== 'PGRST116') {
              console.error('Error checking for existing product source:', sourceCheckError)
            }
          } else {
            existingSource = data
          }
        } catch (err) {
          console.log('Error querying product_sources, using SKU fallback:', err)
        }

        // Fallback: Check by SKU if product_sources check didn't work
        let existingProductBySku: { id: string } | null = null
        if (!existingSource) {
          try {
            const { data: skuProduct } = await supabase
              .from('products')
              .select('id')
              .eq('store_id', storeId)
              .eq('sku', productData.sku)
              .maybeSingle()
            
            existingProductBySku = skuProduct
          } catch (err) {
            console.error('Error checking by SKU:', err)
          }
        }

        let productId: string
        let isNewProduct = false

        if (existingSource && existingSource.product_id) {
          // Product source exists, update the product and source
          productId = existingSource.product_id
          console.log(`🔄 Updating existing product: ${shopifyProduct.title} (ID: ${productId})`)

          const { error: updateError } = await adminClient
            .from('products')
            .update({
              ...productData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', productId)

          if (updateError) {
            console.error(`❌ Error updating product ${shopifyProduct.title}:`, updateError)
            console.error('Product data:', JSON.stringify(productData, null, 2))
            result.errors.push(`Error updating product ${shopifyProduct.title}: ${updateError.message}`)
            continue
          }
          
          console.log(`✅ Updated product: ${productId}`)

          // Update product source
          const { error: sourceUpdateError } = await adminClient
            .from('product_sources')
            .update({
              platform_sku: mainVariant.sku || shopifyProduct.id.toString(),
              platform_data: platformData,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('product_id', productId)
            .eq('platform', 'shopify')

          if (sourceUpdateError) {
            result.errors.push(`Error updating product source for ${shopifyProduct.title}: ${sourceUpdateError.message}`)
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
            result.errors.push(`Error updating product ${shopifyProduct.title}: ${updateError.message}`)
            continue
          }

          // Try to create product source
          try {
            await adminClient
              .from('product_sources')
              .insert({
                product_id: productId,
                platform: 'shopify',
                platform_product_id: shopifyProduct.id.toString(),
                platform_sku: mainVariant.sku || shopifyProduct.id.toString(),
                platform_data: platformData,
                synced_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString(),
              })
          } catch (sourceErr: any) {
            console.log('Could not create product_source (table may not exist):', sourceErr.message)
          }

          result.productsUpdated++
        } else {
          // New product - create both product and product_source
          console.log(`➕ Creating new product: ${shopifyProduct.title}`, {
            storeId,
            sku: productData.sku,
            slug: productData.slug,
            price: productData.price,
          })
          
          const { data: newProduct, error: insertError } = await adminClient
            .from('products')
            .insert(productData)
            .select('id')
            .single()

          if (insertError) {
            console.error(`❌ Error creating product ${shopifyProduct.title}:`, insertError)
            console.error('Product data:', JSON.stringify(productData, null, 2))
            result.errors.push(`Error creating product ${shopifyProduct.title}: ${insertError.message}`)
            continue
          }
          
          console.log(`✅ Created product: ${newProduct.id}`)

          productId = newProduct.id
          isNewProduct = true
          result.productsCreated++

          // Create product source record
          try {
            const { error: sourceError } = await adminClient
              .from('product_sources')
              .insert({
                product_id: productId,
                platform: 'shopify',
                platform_product_id: shopifyProduct.id.toString(),
                platform_sku: mainVariant.sku || shopifyProduct.id.toString(),
                platform_data: platformData,
                synced_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString(),
              })

            if (sourceError) {
              console.log('Could not create product_source (table may not exist):', sourceError.message)
            }
          } catch (sourceErr: any) {
            console.log('Error creating product_source:', sourceErr.message)
          }
        }

        result.productsSynced++
        console.log(`✅ Successfully processed: ${shopifyProduct.title}`)
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || 'Unknown error'
        console.error(`❌ Error processing product ${shopifyProduct.title}:`, error)
        console.error('Error details:', {
          message: errorMsg,
          stack: error?.stack,
          code: error?.code,
        })
        result.errors.push(`Error processing product ${shopifyProduct.title}: ${errorMsg}`)
      }
    }

    console.log(`✅ Sync complete: ${result.productsCreated} created, ${result.productsUpdated} updated`)
    console.log(`📊 Sync summary:`, {
      totalProducts: allProducts.length,
      productsSynced: result.productsSynced,
      productsCreated: result.productsCreated,
      productsUpdated: result.productsUpdated,
      errors: result.errors.length,
      skipped: allProducts.length - result.productsSynced,
    })

    if (result.errors.length > 0) {
      console.warn(`⚠️ Sync completed with ${result.errors.length} errors:`)
      result.errors.slice(0, 10).forEach((error, index) => {
        console.warn(`  ${index + 1}. ${error}`)
      })
      if (result.errors.length > 10) {
        console.warn(`  ... and ${result.errors.length - 10} more errors`)
      }
      result.success = false
    }

    return result
  } catch (error: any) {
    console.error('Error in syncShopifyProducts:', error)
    result.success = false
    result.errors.push(error.message || 'Unknown error occurred')
    return result
  }
}

/**
 * Sync inventory (stock quantities) from Shopify to database
 * This is a lightweight sync that only updates stock levels
 */
export async function syncShopifyInventory(
  userId: string,
  accessToken: string,
  storeDomain?: string
): Promise<InventorySyncResult> {
  const supabase = await createServerSupabase()
  const result: InventorySyncResult = {
    success: true,
    productsUpdated: 0,
    errors: [],
  }

  try {
    // Extract shop domain
    let shopDomain = storeDomain || ''
    if (shopDomain.includes('.myshopify.com')) {
      shopDomain = shopDomain.replace('.myshopify.com', '')
    } else if (shopDomain.includes('myshopify.com')) {
      shopDomain = shopDomain.split('.')[0]
    }

    if (!shopDomain) {
      throw new Error('Shop domain is required for Shopify inventory sync')
    }

    // Fetch all products from Shopify (handle pagination)
    let pageInfo: string | undefined
    const allProducts: ShopifyProduct[] = []

    do {
      try {
        const { products, nextPageInfo } = await fetchShopifyProducts(
          `${shopDomain}.myshopify.com`,
          accessToken,
          pageInfo
        )
        allProducts.push(...products)
        pageInfo = nextPageInfo
      } catch (error: any) {
        result.errors.push(`Error fetching products: ${error.message}`)
        pageInfo = undefined
      }
    } while (pageInfo)

    console.log(`📦 Fetched ${allProducts.length} products for inventory sync`)

    // Process each product - only update stock and is_available
    for (const shopifyProduct of allProducts) {
      try {
        // Calculate total inventory across all variants
        const totalInventory = shopifyProduct.variants.reduce(
          (sum, variant) => sum + (variant.inventory_quantity || 0),
          0
        )

        // Find product by product_sources first (most reliable)
        let productId: string | null = null

        try {
          const { data: source } = await supabase
            .from('product_sources')
            .select('product_id')
            .eq('platform', 'shopify')
            .eq('platform_product_id', shopifyProduct.id.toString())
            .maybeSingle()

          if (source) {
            productId = source.product_id
          }
        } catch (err) {
          console.log('product_sources lookup failed, using SKU fallback')
        }

        // Fallback: Find by SKU if product_sources didn't work
        if (!productId && shopifyProduct.variants?.[0]) {
          const mainVariant = shopifyProduct.variants[0]
          const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('sku', mainVariant.sku || shopifyProduct.id.toString())
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
        const updateData: any = {
          is_available: totalInventory > 0,
          updated_at: new Date().toISOString(),
        }

        // Create admin client for inventory sync operations
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

        const { error: updateError } = await adminClient
          .from('products')
          .update(updateData)
          .eq('id', productId)

        if (updateError) {
          result.errors.push(`Error updating inventory for product ${shopifyProduct.title}: ${updateError.message}`)
          continue
        }

        // Update platform_data quantity in product_sources if it exists
        try {
          const { data: existingSource } = await supabase
            .from('product_sources')
            .select('platform_data')
            .eq('product_id', productId)
            .eq('platform', 'shopify')
            .maybeSingle()

          if (existingSource) {
            const updatedPlatformData = {
              ...(existingSource.platform_data || {}),
              total_inventory: totalInventory,
            }

            await supabase
              .from('product_sources')
              .update({
                platform_data: updatedPlatformData,
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('product_id', productId)
              .eq('platform', 'shopify')
          }
        } catch (err) {
          console.log('Could not update product_sources platform_data:', err)
        }

        result.productsUpdated++
      } catch (error: any) {
        result.errors.push(`Error processing inventory for product ${shopifyProduct.title}: ${error.message}`)
        console.error('Error processing inventory:', error)
      }
    }

    console.log(`✅ Inventory sync complete: ${result.productsUpdated} products updated`)

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  } catch (error: any) {
    console.error('Error in syncShopifyInventory:', error)
    result.success = false
    result.errors.push(error.message || 'Unknown error occurred')
    return result
  }
}

