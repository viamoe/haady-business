import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Preview products from external store before importing
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const connectionId = resolvedParams.id

    // Get connection details - RLS policies will handle access control
    const { data: connection, error: fetchError } = await supabase
      .from('store_connections')
      .select('id, platform, access_token, store_external_id, store_domain, store_id')
      .eq('id', connectionId)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching connection:', fetchError)
      return NextResponse.json(
        { error: 'Store connection not found', details: fetchError.message },
        { status: 404 }
      )
    }

    if (!connection) {
      console.error('Connection not found for ID:', connectionId)
      return NextResponse.json(
        { error: 'Store connection not found' },
        { status: 404 }
      )
    }

    // RLS policies ensure the user can only access connections for their stores
    // No need for additional access checks here

    if (!connection.access_token) {
      return NextResponse.json(
        { error: 'Access token not found. Please reconnect your store.' },
        { status: 400 }
      )
    }

    // Fetch products from platform API
    let products: any[] = []

    try {
      if (connection.platform === 'salla') {
        // Salla API: Get products
        const productsResponse = await fetch('https://api.salla.dev/admin/v2/products', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        if (!productsResponse.ok) {
          const errorText = await productsResponse.text()
          let errorDetails: any = { status: productsResponse.status, message: errorText }
          
          try {
            const errorJson = JSON.parse(errorText)
            errorDetails = { ...errorDetails, ...errorJson }
          } catch {
            // Not JSON, keep as text
          }

          return NextResponse.json(
            { 
              error: 'Failed to fetch products from Salla',
              details: errorDetails,
            },
            { status: productsResponse.status }
          )
        }

        const sallaData = await productsResponse.json()
        
        // Transform Salla products to our format
        if (sallaData?.data && Array.isArray(sallaData.data)) {
          products = sallaData.data.map((product: any) => ({
            id: product.id?.toString() || '',
            platformProductId: product.id?.toString() || '',
            name: product.name || '',
            nameEn: product.name || '',
            nameAr: product.name_ar || product.name || '',
            description: product.description || '',
            descriptionAr: product.description_ar || product.description || '',
            price: parseFloat(product.price?.amount || product.price || '0'),
            sku: product.sku || '',
            imageUrl: product.images?.[0]?.url || product.image?.url || null,
            isActive: product.status === 'active' || product.status === 'published',
            isAvailable: product.quantity > 0,
            inventory: product.quantity || 0,
          }))
        }
      } else if (connection.platform === 'zid') {
        // Zid API: Get products
        const productsResponse = await fetch('https://api.zid.sa/managers/store/products/v1', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        if (!productsResponse.ok) {
          const errorText = await productsResponse.text()
          return NextResponse.json(
            { 
              error: 'Failed to fetch products from Zid',
              details: errorText,
            },
            { status: productsResponse.status }
          )
        }

        const zidData = await productsResponse.json()
        
        // Transform Zid products to our format
        if (zidData?.products && Array.isArray(zidData.products)) {
          products = zidData.products.map((product: any) => ({
            id: product.id?.toString() || '',
            platformProductId: product.id?.toString() || '',
            name: product.name || '',
            nameEn: product.name || '',
            nameAr: product.name_ar || product.name || '',
            description: product.description || '',
            descriptionAr: product.description_ar || product.description || '',
            price: parseFloat(product.price || '0'),
            sku: product.sku || '',
            imageUrl: product.images?.[0] || product.image || null,
            isActive: product.status === 'active',
            isAvailable: (product.quantity || 0) > 0,
            inventory: product.quantity || 0,
          }))
        }
      } else if (connection.platform === 'shopify') {
        // Shopify API: Get products
        // Need to get shop domain from connection
        const shopDomain = connection.store_external_id || connection.store_domain
        
        if (!shopDomain) {
          return NextResponse.json(
            { error: 'Shop domain not found. Please refresh store info.' },
            { status: 400 }
          )
        }

        const cleanShop = shopDomain.replace(/\.myshopify\.com$/, '')
        const productsResponse = await fetch(`https://${cleanShop}.myshopify.com/admin/api/2024-01/products.json?limit=250`, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json',
          },
        })

        if (!productsResponse.ok) {
          const errorText = await productsResponse.text()
          return NextResponse.json(
            { 
              error: 'Failed to fetch products from Shopify',
              details: errorText,
            },
            { status: productsResponse.status }
          )
        }

        const shopifyData = await productsResponse.json()
        
        // Transform Shopify products to our format
        if (shopifyData?.products && Array.isArray(shopifyData.products)) {
          products = shopifyData.products.map((product: any) => {
            const variant = product.variants?.[0] || {}
            return {
              id: product.id?.toString() || '',
              platformProductId: product.id?.toString() || '',
              name: product.title || '',
              nameEn: product.title || '',
              nameAr: product.title || '',
              description: product.body_html || '',
              descriptionAr: product.body_html || '',
              price: parseFloat(variant.price || '0'),
              sku: variant.sku || '',
              imageUrl: product.images?.[0]?.src || null,
              isActive: product.status === 'active',
              isAvailable: variant.inventory_quantity > 0,
              inventory: variant.inventory_quantity || 0,
            }
          })
        }
      } else {
        return NextResponse.json(
          { error: `Platform ${connection.platform} is not supported for product preview` },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        products,
        count: products.length,
      })
    } catch (error: any) {
      console.error('Error fetching products from platform:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch products',
          details: error.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Exception in preview products:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

