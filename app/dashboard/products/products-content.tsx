'use client'

import * as React from 'react'
import { Package, Image as ImageIcon, ArrowUpDown } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'
// TODO: Sparkles and AnimateIcon removed - will be reimplemented with new architecture

interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  description_en: string | null
  description_ar: string | null
  price: number | null
  sku: string | null
  image_url: string | null
  is_available: boolean
  is_active: boolean
  created_at: string
  store_id: string
}

interface ProductsContentProps {
  initialProducts?: Product[]
  initialTotalCount?: number
  initialStoreMap?: Map<string, string>
}

export function ProductsContent({ 
  initialProducts = [], 
  initialTotalCount = 0,
  initialStoreMap = new Map()
}: ProductsContentProps) {
  const { selectedConnectionId, selectedConnection } = useStoreConnection()
  const [products, setProducts] = React.useState<Product[]>(initialProducts)
  const [totalCount, setTotalCount] = React.useState(initialTotalCount)
  const [storeMap, setStoreMap] = React.useState<Map<string, string>>(initialStoreMap)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasInitialized, setHasInitialized] = React.useState(false)
  const [connectionPlatform, setConnectionPlatform] = React.useState<string | null>(null)

  // TODO: Sync state removed - will be reimplemented with new architecture

  // Fetch connection platform if not available in context
  React.useEffect(() => {
    if (selectedConnectionId && !selectedConnection?.platform) {
      const fetchConnection = async () => {
        const { data } = await supabase
          .from('store_connections')
          .select('platform')
          .eq('id', selectedConnectionId)
          .maybeSingle()
        
        if (data?.platform) {
          setConnectionPlatform(data.platform)
        }
      }
      fetchConnection()
    } else if (selectedConnection?.platform) {
      setConnectionPlatform(selectedConnection.platform)
    } else {
      setConnectionPlatform(null)
    }
  }, [selectedConnectionId, selectedConnection?.platform])

  // Check if the selected connection is an external store (Salla, Zid, Shopify)
  const isExternalStore = React.useMemo(() => {
    const platform = (selectedConnection?.platform || connectionPlatform)?.toLowerCase()
    if (!platform) return false
    return ['salla', 'zid', 'shopify'].includes(platform)
  }, [selectedConnection?.platform, connectionPlatform])

  // Initialize on mount - preserve initial products until context loads
  React.useEffect(() => {
    // Give context time to load from localStorage
    const timer = setTimeout(() => {
      setHasInitialized(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Fetch products based on selected store connection
  React.useEffect(() => {
    // Don't fetch until context has had time to initialize
    if (!hasInitialized) {
      return
    }

    const fetchProducts = async () => {

      setIsLoading(true)
      try {
        let storeIds: string[] = []
        let newStoreMap = new Map<string, string>()

        if (selectedConnectionId) {
          // New structure: store_connections.store_id -> stores.id
          // First get the store_id from the connection
          const { data: connection, error: connectionError } = await supabase
            .from('store_connections')
            .select('store_id')
            .eq('id', selectedConnectionId)
            .maybeSingle()

          if (connectionError?.message && process.env.NODE_ENV === 'development') {
            console.error('Error fetching connection:', connectionError.message)
          }

          if (connection?.store_id) {
            // Fetch the store by its ID
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
              newStoreMap = new Map([[store.id, store.name]])
            } else {
              storeIds = []
              newStoreMap = new Map()
            }
          } else {
            // No store linked to this connection
            storeIds = []
            newStoreMap = new Map()
          }
        } else {
          // No connection selected - show all products for the business (fallback)
          const { data: allStores, error: storesError } = await supabase
            .from('stores')
            .select('id, name')
            .eq('is_active', true)

          if (storesError?.message) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching all stores:', storesError.message)
            }
            setProducts([])
            setTotalCount(0)
            setStoreMap(new Map())
            return
          }

          storeIds = allStores?.map(s => s.id) || []
          newStoreMap = new Map(allStores?.map(s => [s.id, s.name]) || [])
        }

        setStoreMap(newStoreMap)

        if (storeIds.length === 0) {
          setProducts([])
          setTotalCount(0)
          return
        }

        // Fetch products for these stores
        const { data: productsData, error: productsError, count } = await supabase
          .from('products')
          .select('id, name_en, name_ar, description_en, description_ar, price, sku, image_url, is_available, is_active, created_at, store_id', { count: 'exact' })
          .in('store_id', storeIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(100)

        if (productsError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching products:', productsError)
          }
          // If error is related to deleted_at or column doesn't exist, try without it
          if (productsError.message?.includes('deleted_at') || productsError.code === '42703' || productsError.code === 'PGRST116') {
            if (process.env.NODE_ENV === 'development') {
              console.log('Retrying query without deleted_at filter')
            }
            const { data: retryData, error: retryError, count: retryCount } = await supabase
              .from('products')
              .select('id, name_en, name_ar, description_en, description_ar, price, sku, image_url, is_available, is_active, created_at, store_id', { count: 'exact' })
              .in('store_id', storeIds)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(100)
            
            if (retryError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Error fetching products (retry):', retryError)
              }
              setProducts([])
              setTotalCount(0)
            } else {
              setProducts(retryData || [])
              setTotalCount(retryCount || 0)
            }
          } else {
            setProducts([])
            setTotalCount(0)
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('Fetched products:', {
              count: productsData?.length || 0,
              totalCount: count || 0,
              storeIds,
              selectedConnectionId
            })
          }
          setProducts(productsData || [])
          setTotalCount(count || 0)
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching products:', error)
        }
        setProducts([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [selectedConnectionId, hasInitialized])

  // TODO: Sync phrase rotation removed - will be reimplemented with new architecture

  // Refetch products function
  const refetchProducts = React.useCallback(async () => {
    if (!selectedConnectionId) return

    try {
      let storeIds: string[] = []
      let newStoreMap = new Map<string, string>()

      // New structure: store_connections.store_id -> stores.id
      const { data: connection } = await supabase
        .from('store_connections')
        .select('store_id')
        .eq('id', selectedConnectionId)
        .maybeSingle()

      if (!connection?.store_id) {
        return
      }

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('id', connection.store_id)
        .eq('is_active', true)
        .maybeSingle()

      if (storeError || !store) {
        return
      }

      storeIds = [store.id]
      newStoreMap = new Map([[store.id, store.name]])
      setStoreMap(newStoreMap)

      // Fetch products for these stores
      const { data: productsData, error: productsError, count } = await supabase
        .from('products')
        .select('id, name_en, name_ar, description_en, description_ar, price, sku, image_url, is_available, is_active, created_at, store_id', { count: 'exact' })
        .in('store_id', storeIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100)

      if (productsError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error refetching products:', productsError)
        }
      } else if (productsData) {
        setProducts(productsData)
        setTotalCount(count || 0)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refetching products:', error)
      }
    }
  }, [selectedConnectionId])

  // TODO: Sync event listeners and handleSync removed - will be reimplemented with new architecture

  const getProductName = (product: Product) => {
    return product.name_en || product.name_ar || 'Unnamed Product'
  }

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A'
    return `$${parseFloat(price.toString()).toFixed(2)}`
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'image_url',
      header: 'Image',
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={getProductName(product)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.innerHTML = '<div class="w-12 h-12 rounded-md bg-muted flex items-center justify-center"><svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>'
                  }
                }}
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'name_en',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full justify-between"
          >
            <span>Name</span>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="px-4">
            <div className="font-medium">{getProductName(product)}</div>
            {(product.description_en || product.description_ar) && (
              <div className="text-sm text-muted-foreground truncate max-w-md">
                {product.description_en || product.description_ar}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => {
        return (
          <span className="font-mono text-sm">
            {row.original.sku || 'N/A'}
          </span>
        )
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full justify-between"
          >
            <span>Price</span>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return (
          <span className="font-medium">{formatPrice(row.original.price)}</span>
        )
      },
    },
    {
      accessorKey: 'store_id',
      header: 'Store',
      cell: ({ row }) => {
        return (
          <span className="text-sm">
            {storeMap.get(row.original.store_id) || 'Unknown Store'}
          </span>
        )
      },
    },
    {
      accessorKey: 'is_available',
      header: 'Status',
      cell: ({ row }) => {
        const isAvailable = row.original.is_available
        return (
          <Badge
            variant={isAvailable ? 'default' : 'secondary'}
            className={cn(
              isAvailable
                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
            )}
          >
            {isAvailable ? 'Available' : 'Out of Stock'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full justify-between"
          >
            <span>Created</span>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? 'product' : 'products'} total
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg flex-1">
          <Package className="h-12 w-12 text-gray-300 mb-4 animate-pulse" />
          <p className="text-muted-foreground font-medium">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg flex-1">
          <Package className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-muted-foreground font-medium">No products found</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {selectedConnectionId 
              ? 'Sync products from your store to see them here'
              : 'Loading store information...'}
          </p>
          {/* TODO: Sync button removed - will be reimplemented with new architecture */}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden pb-8">
          <DataTable
            columns={columns}
            data={products}
            searchKey="name_en"
            searchPlaceholder="Search products..."
          />
        </div>
      )}
    </div>
  )
}
