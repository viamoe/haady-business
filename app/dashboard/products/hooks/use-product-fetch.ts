import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  description_en: string | null
  description_ar: string | null
  price: number | null
  sku: string | null
  barcode: string | null
  barcode_type: string | null
  image_url: string | null
  is_available: boolean
  is_active: boolean
  is_published: boolean
  created_at: string
  store_id: string
  deleted_at?: string | null
  status?: 'draft' | 'active' | 'archived' | 'scheduled'
  quantity?: number
  low_stock_threshold?: number
  product_type?: 'physical' | 'digital' | 'service' | 'bundle'
  selling_method?: 'unit' | 'weight' | 'length' | 'time' | 'subscription'
  selling_unit?: string | null
  fulfillment_type?: ('pickup' | 'delivery' | 'digital' | 'onsite')[]
  requires_scheduling?: boolean
  subscription_interval?: string | null
  sales_channels?: ('online' | 'in_store')[]
  compare_at_price?: number | null
  discount_type?: 'none' | 'percentage' | 'fixed_amount'
  track_inventory?: boolean
  allow_backorder?: boolean
  discount_value?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
  brand_id?: string | null
}

export interface InventoryData {
  product_id: string
  quantity: number
  available_quantity: number
  low_stock_threshold: number | null
}

interface FetchProductsResult {
  products: Product[]
  totalCount: number
  storeMap: Map<string, string>
  inventoryMap: Map<string, InventoryData>
}

interface FetchProductsOptions {
  selectedConnectionId?: string | null
  storeId?: string | null
  silent?: boolean
}

/**
 * Custom hook for fetching products with inventory data
 * Consolidates duplicate fetching logic from ProductsContent component
 */
export function useProductFetch() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Fetches store IDs and names based on connection or store ID
   */
  const fetchStoreInfo = useCallback(async (
    selectedConnectionId?: string | null,
    storeId?: string | null
  ): Promise<{ storeIds: string[]; storeMap: Map<string, string> }> => {
    let storeIds: string[] = []
    let storeMap = new Map<string, string>()

    if (selectedConnectionId) {
      // Get store_id from connection
      const { data: connection, error: connectionError } = await supabase
        .from('store_connections')
        .select('store_id')
        .eq('id', selectedConnectionId)
        .maybeSingle()

      if (connectionError?.message && process.env.NODE_ENV === 'development') {
        console.error('Error fetching connection:', connectionError.message)
      }

      if (connection?.store_id) {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id, name')
          .eq('id', connection.store_id)
          .eq('is_active', true)
          .maybeSingle()

        if (storeError?.message && process.env.NODE_ENV === 'development') {
          console.error('Error fetching store:', storeError.message)
        }

        if (store) {
          storeIds = [store.id]
          storeMap = new Map([[store.id, store.name]])
        }
      }
    } else if (storeId) {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('id', storeId)
        .eq('is_active', true)
        .maybeSingle()

      if (storeError?.message && process.env.NODE_ENV === 'development') {
        console.error('Error fetching store:', storeError.message)
      }

      if (store) {
        storeIds = [store.id]
        storeMap = new Map([[store.id, store.name]])
      }
    }

    return { storeIds, storeMap }
  }, [])

  /**
   * Fetches inventory data for a list of products
   */
  const fetchInventoryData = useCallback(async (
    productIds: string[]
  ): Promise<Map<string, InventoryData>> => {
    if (productIds.length === 0) {
      return new Map()
    }

    try {
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('product_id, quantity, available_quantity, low_stock_threshold')
        .in('product_id', productIds)

      if (!inventoryData) {
        return new Map()
      }

      // Aggregate inventory by product (sum across branches)
      const invMap = new Map<string, InventoryData>()
      inventoryData.forEach(inv => {
        const existing = invMap.get(inv.product_id)
        if (existing) {
          existing.quantity += inv.quantity || 0
          existing.available_quantity += inv.available_quantity || 0
        } else {
          invMap.set(inv.product_id, {
            product_id: inv.product_id,
            quantity: inv.quantity || 0,
            available_quantity: inv.available_quantity || 0,
            low_stock_threshold: inv.low_stock_threshold || 10
          })
        }
      })

      return invMap
    } catch {
      // Inventory table might not exist yet
      return new Map()
    }
  }, [])

  /**
   * Main function to fetch products with all related data
   */
  const fetchProducts = useCallback(async (
    options: FetchProductsOptions
  ): Promise<FetchProductsResult> => {
    const { selectedConnectionId, storeId, silent = false } = options

    if (!silent) {
      setIsLoading(true)
    }
    setError(null)

    try {
      // Fetch store information
      const { storeIds, storeMap } = await fetchStoreInfo(selectedConnectionId, storeId)

      if (storeIds.length === 0) {
        return {
          products: [],
          totalCount: 0,
          storeMap: new Map(),
          inventoryMap: new Map()
        }
      }

      // Fetch products
      const productFields = [
        'id', 'name_en', 'name_ar', 'description_en', 'description_ar',
        'price', 'compare_at_price', 'discount_type', 'discount_value',
        'discount_start_date', 'discount_end_date', 'sku', 'barcode',
        'barcode_type', 'qr_code', 'qr_code_auto_generated', 'image_url', 
        'is_available', 'is_active', 'is_published', 'created_at', 'store_id', 
        'status', 'product_type', 'selling_method', 'selling_unit', 'fulfillment_type',
        'requires_scheduling', 'subscription_interval', 'sales_channels',
        'track_inventory', 'allow_backorder', 'low_stock_threshold',
        'deleted_at', 'brand_id'
      ].join(', ')

      let productsData: Product[] | null = null
      let totalCount = 0
      let productsError: any = null

      // Try with deleted_at filter first
      const { data, error, count } = await supabase
        .from('products')
        .select(productFields, { count: 'exact' })
        .in('store_id', storeIds)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        productsError = error
        // If error is related to deleted_at, retry without it
        if (error.message?.includes('deleted_at') || error.code === '42703' || error.code === 'PGRST116') {
          if (process.env.NODE_ENV === 'development') {
            console.log('Retrying query without deleted_at filter')
          }

          const { data: retryData, error: retryError, count: retryCount } = await supabase
            .from('products')
            .select(productFields.replace(', deleted_at', ''), { count: 'exact' })
            .in('store_id', storeIds)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100)

          if (retryError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching products (retry):', retryError)
            }
            throw new Error(`Failed to fetch products: ${retryError.message}`)
          }

          productsData = (retryData || []) as unknown as Product[]
          totalCount = retryCount || 0
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching products:', error)
          }
          throw new Error(`Failed to fetch products: ${error.message}`)
        }
      } else {
        productsData = (data || []) as unknown as Product[]
        totalCount = count || 0
      }

      // Fetch inventory data
      const inventoryMap = productsData && productsData.length > 0
        ? await fetchInventoryData(productsData.map(p => p.id))
        : new Map()

      if (process.env.NODE_ENV === 'development') {
        console.log('Fetched products:', {
          count: productsData?.length || 0,
          totalCount,
          storeIds,
          selectedConnectionId
        })
      }

      return {
        products: productsData || [],
        totalCount,
        storeMap,
        inventoryMap
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error fetching products')
      setError(error)
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching products:', error)
      }
      return {
        products: [],
        totalCount: 0,
        storeMap: new Map(),
        inventoryMap: new Map()
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [fetchStoreInfo, fetchInventoryData])

  return {
    fetchProducts,
    isLoading,
    error
  }
}

