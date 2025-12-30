'use client'

import * as React from 'react'
import { Package, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Plus, Pencil, Trash2, MoreHorizontal, Download, Globe, Store } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'
import { ProductForm } from '@/components/product-form'
import { useRouter } from 'next/navigation'
import { ConnectStoreModal } from '@/components/connect-store-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
// TODO: Sparkles and AnimateIcon removed - will be reimplemented with new architecture

interface Product {
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
  // Inventory fields (populated from inventory table)
  quantity?: number
  low_stock_threshold?: number
  // Classification fields
  product_type?: 'physical' | 'digital' | 'service' | 'bundle'
  selling_method?: 'unit' | 'weight' | 'length' | 'time' | 'subscription'
  selling_unit?: string | null
  fulfillment_type?: ('pickup' | 'delivery' | 'digital' | 'onsite')[]
  requires_scheduling?: boolean
  subscription_interval?: string | null
  // Sales channels
  sales_channels?: ('online' | 'in_store')[]
  // Pricing & Discounts
  compare_at_price?: number | null
  discount_type?: 'none' | 'percentage' | 'fixed_amount'
  // Inventory tracking
  track_inventory?: boolean
  allow_backorder?: boolean
  discount_value?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
}

interface InventoryData {
  product_id: string
  quantity: number
  available_quantity: number
  low_stock_threshold: number | null
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
  const router = useRouter()
  const { selectedConnectionId, selectedConnection, storeId } = useStoreConnection()
  const [products, setProducts] = React.useState<Product[]>(initialProducts)
  const [totalCount, setTotalCount] = React.useState(initialTotalCount)
  const [storeMap, setStoreMap] = React.useState<Map<string, string>>(initialStoreMap)
  const [inventoryMap, setInventoryMap] = React.useState<Map<string, InventoryData>>(new Map())
  // Initialize loading as true to show skeleton immediately (will be set to false after data loads)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasInitialized, setHasInitialized] = React.useState(false)
  const isNavigatingRef = React.useRef(false)
  const hasInitialProductsRef = React.useRef(initialProducts.length > 0)
  const [connectionPlatform, setConnectionPlatform] = React.useState<string | null>(null)
  const [currencyIcon, setCurrencyIcon] = React.useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = React.useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isConnectStoreModalOpen, setIsConnectStoreModalOpen] = React.useState(false)

  // Listen for navigation start event to show skeleton immediately
  React.useEffect(() => {
    const handleNavigationStart = (event: CustomEvent) => {
      const url = event.detail?.url
      // Only trigger if navigating to products page
      if (url && url.startsWith('/dashboard/products')) {
        isNavigatingRef.current = true
        setIsLoading(true)
      }
    }

    window.addEventListener('dashboard-navigation-start', handleNavigationStart as EventListener, true)
    return () => {
      window.removeEventListener('dashboard-navigation-start', handleNavigationStart as EventListener, true)
    }
  }, [])

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

  // Fetch store currency from country
  React.useEffect(() => {
    const fetchStoreCurrency = async () => {
      if (!storeId) {
        setCurrencyIcon(null)
        return
      }

      try {
        // First fetch the store's country ID
        const { data: storeData } = await supabase
          .from('stores')
          .select('country')
          .eq('id', storeId)
          .maybeSingle()

        if (storeData?.country) {
          // Then fetch the currency_icon from countries table
          const { data: countryData } = await supabase
            .from('countries')
            .select('currency_icon')
            .eq('id', storeData.country)
            .maybeSingle()

          setCurrencyIcon(countryData?.currency_icon || null)
        } else {
          setCurrencyIcon(null)
        }
      } catch (error) {
        console.error('Error fetching store currency:', error)
        setCurrencyIcon(null)
      }
    }

    fetchStoreCurrency()
  }, [storeId])

  // Check if the selected connection is an external store (Salla, Zid, Shopify)
  const isExternalStore = React.useMemo(() => {
    const platform = (selectedConnection?.platform || connectionPlatform)?.toLowerCase()
    if (!platform) return false
    return ['salla', 'zid', 'shopify'].includes(platform)
  }, [selectedConnection?.platform, connectionPlatform])

  // Initialize on mount - preserve initial products until context loads
  React.useEffect(() => {
    // If we have initial products from SSR, we can show them immediately
    // But if we're navigating, keep loading state true
    if (hasInitialProductsRef.current && !isNavigatingRef.current) {
      setIsLoading(false)
    }
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
          .select('id, name_en, name_ar, description_en, description_ar, price, compare_at_price, discount_type, discount_value, discount_start_date, discount_end_date, sku, barcode, barcode_type, image_url, is_available, is_active, is_published, created_at, store_id, product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels, track_inventory, allow_backorder, low_stock_threshold', { count: 'exact' })
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
              .select('id, name_en, name_ar, description_en, description_ar, price, compare_at_price, discount_type, discount_value, discount_start_date, discount_end_date, sku, barcode, barcode_type, image_url, is_available, is_active, is_published, created_at, store_id, product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels, track_inventory, allow_backorder, low_stock_threshold', { count: 'exact' })
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
          
          // Fetch inventory data for these products
          if (productsData && productsData.length > 0) {
            const productIds = productsData.map(p => p.id)
            try {
              const { data: inventoryData } = await supabase
                .from('inventory')
                .select('product_id, quantity, available_quantity, low_stock_threshold')
                .in('product_id', productIds)
              
              if (inventoryData) {
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
                setInventoryMap(invMap)
              }
            } catch {
              // Inventory table might not exist yet
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching products:', error)
        }
        setProducts([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
        isNavigatingRef.current = false
      }
    }

    fetchProducts()
  }, [selectedConnectionId, hasInitialized])

  // TODO: Sync phrase rotation removed - will be reimplemented with new architecture

  // Refetch products function - matches the initial fetch logic
  // silent: true = don't show full page loading skeleton (for refresh button)
  const refetchProducts = React.useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    try {
      let storeIds: string[] = []
      let newStoreMap = new Map<string, string>()

      if (selectedConnectionId) {
        // New structure: store_connections.store_id -> stores.id
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
      } else if (storeId) {
        // Use storeId from context if available
        const { data: store } = await supabase
          .from('stores')
          .select('id, name')
          .eq('id', storeId)
          .eq('is_active', true)
          .maybeSingle()

        if (store) {
          storeIds = [store.id]
          newStoreMap = new Map([[store.id, store.name]])
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
          setIsLoading(false)
          return
        }

        storeIds = allStores?.map(s => s.id) || []
        newStoreMap = new Map(allStores?.map(s => [s.id, s.name]) || [])
      }

      setStoreMap(newStoreMap)

      if (storeIds.length === 0) {
        setProducts([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      // Fetch products for these stores
      const { data: productsData, error: productsError, count } = await supabase
        .from('products')
        .select('id, name_en, name_ar, description_en, description_ar, price, compare_at_price, discount_type, discount_value, discount_start_date, discount_end_date, sku, barcode, barcode_type, image_url, is_available, is_active, is_published, created_at, store_id, product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels, track_inventory, allow_backorder, low_stock_threshold', { count: 'exact' })
        .in('store_id', storeIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100)

      if (productsError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error refetching products:', productsError)
        }
        // If error is related to deleted_at or column doesn't exist, try without it
        if (productsError.message?.includes('deleted_at') || productsError.code === '42703' || productsError.code === 'PGRST116') {
          if (process.env.NODE_ENV === 'development') {
            console.log('Retrying query without deleted_at filter')
          }
          const { data: retryData, error: retryError, count: retryCount } = await supabase
            .from('products')
            .select('id, name_en, name_ar, description_en, description_ar, price, compare_at_price, discount_type, discount_value, discount_start_date, discount_end_date, sku, barcode, barcode_type, image_url, is_available, is_active, is_published, created_at, store_id, product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels, track_inventory, allow_backorder, low_stock_threshold', { count: 'exact' })
            .in('store_id', storeIds)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100)
          
          if (retryError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error refetching products (retry):', retryError)
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
          console.log('Refetched products:', {
            count: productsData?.length || 0,
            totalCount: count || 0,
            storeIds,
            selectedConnectionId
          })
        }
        setProducts(productsData || [])
        setTotalCount(count || 0)
        
        // Fetch inventory data for these products
        if (productsData && productsData.length > 0) {
          const productIds = productsData.map(p => p.id)
          try {
            const { data: inventoryData } = await supabase
              .from('inventory')
              .select('product_id, quantity, available_quantity, low_stock_threshold')
              .in('product_id', productIds)
            
            if (inventoryData) {
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
              setInventoryMap(invMap)
            }
          } catch {
            // Inventory table might not exist yet
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refetching products:', error)
      }
      setProducts([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedConnectionId, storeId])

  // TODO: Sync event listeners and handleSync removed - will be reimplemented with new architecture

  const getProductName = (product: Product) => {
    return product.name_en || product.name_ar || 'Unnamed Product'
  }

  // Toggle product publish status
  const togglePublishStatus = async (productId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_published: newStatus })
        .eq('id', productId)
      
      if (error) {
        console.error('Error updating publish status:', error)
        return
      }
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_published: newStatus } : p
      ))
    } catch (err) {
      console.error('Error toggling publish status:', err)
    }
  }

  const formatPriceValue = (price: number | null) => {
    if (!price) return 'N/A'
    return parseFloat(price.toString()).toFixed(2)
  }

  const PriceDisplay = ({ price, className }: { price: number | null, className?: string }) => {
    if (!price) return <span className={className}>N/A</span>
    
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        {currencyIcon ? (
          <img src={currencyIcon} alt="currency" className="h-4 w-4 inline-block" />
        ) : (
          <span>$</span>
        )}
        {formatPriceValue(price)}
      </span>
    )
  }

  const renderProductCard = (product: Product) => {
    const inv = inventoryMap.get(product.id)
    const quantity = inv?.available_quantity ?? 0
    const threshold = inv?.low_stock_threshold ?? 10
    const isLowStock = quantity > 0 && quantity <= threshold
    const isOutOfStock = quantity === 0 || !product.is_available
    
    return (
      <div className="group relative bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-0 transition-all duration-300 cursor-pointer hover:-translate-y-1">
        {/* Image Container */}
        <div className="aspect-square bg-gray-50 p-3 relative overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={getProductName(product)}
              className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500 ease-out"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const parent = e.currentTarget.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center rounded-xl bg-gray-100"><svg class="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>'
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-xl bg-gray-100">
              <ImageIcon className="h-10 w-10 text-gray-300" />
            </div>
          )}
          
          
          {/* Draft Badge - Top Left */}
          {!product.is_published && (
            <div className="absolute top-3 left-3">
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                Draft
              </span>
            </div>
          )}
          
          {/* Quick Actions - Appear on Hover - Top Right */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                <DropdownMenuItem onClick={() => handleEdit(product)} className="rounded-lg hover:bg-[#F4610B] hover:text-white focus:bg-[#F4610B] focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(product)}
                  className="rounded-lg text-red-600 hover:bg-red-500 hover:text-white focus:bg-red-500 focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-[#F4610B] transition-colors duration-200">
              {getProductName(product)}
            </h3>
            {product.sku && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">{product.sku}</p>
            )}
            {/* Classification & Sales Channels Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {product.product_type && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 h-5",
                    product.product_type === 'physical' && "bg-blue-50 text-blue-700 border-blue-200",
                    product.product_type === 'digital' && "bg-purple-50 text-purple-700 border-purple-200",
                    product.product_type === 'service' && "bg-orange-50 text-orange-700 border-orange-200"
                  )}
                >
                  {product.product_type === 'physical' ? 'Physical' : 
                   product.product_type === 'digital' ? 'Digital' : 'Service'}
                </Badge>
              )}
              {product.selling_method && product.selling_method !== 'unit' && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0.5 h-5 bg-gray-50 text-gray-700 border-gray-200"
                >
                  {product.selling_method === 'weight' && `By ${product.selling_unit || 'weight'}`}
                  {product.selling_method === 'length' && `By ${product.selling_unit || 'length'}`}
                  {product.selling_method === 'time' && `By ${product.selling_unit || 'time'}`}
                  {product.selling_method === 'subscription' && 'Subscription'}
                </Badge>
              )}
              {/* Sales Channel Icons */}
              {product.sales_channels && product.sales_channels.length > 0 && (
                <div className="flex items-center gap-1 ml-auto">
                  {product.sales_channels.includes('online') && (
                    <div className="h-5 w-5 rounded-full bg-emerald-50 flex items-center justify-center" title="Online">
                      <Globe className="h-3 w-3 text-emerald-600" />
                    </div>
                  )}
                  {product.sales_channels.includes('in_store') && (
                    <div className="h-5 w-5 rounded-full bg-indigo-50 flex items-center justify-center" title="In-Store">
                      <Store className="h-3 w-3 text-indigo-600" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">
              <PriceDisplay price={product.price} />
            </span>
            <div className="relative w-[76px] h-[22px]">
              {/* Stock Badge - visible by default, hidden on hover */}
              <span
                className={cn(
                  'absolute inset-0 text-[10px] font-medium rounded-full transition-opacity duration-200 group-hover:opacity-0 flex items-center justify-center border',
                  isOutOfStock
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : isLowStock
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                )}
              >
                {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
              </span>
              {/* Qty Badge - hidden by default, visible on hover */}
              <span className={cn(
                "absolute inset-0 text-[10px] font-medium rounded-full flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 border",
                isOutOfStock 
                  ? "bg-red-50 text-red-700 border-red-200" 
                  : isLowStock 
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-green-50 text-green-700 border-green-200"
              )}>
                Qty: {quantity}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleDelete = (product: Product) => {
    setDeletingProduct(product)
  }

  const confirmDelete = async () => {
    if (!deletingProduct) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete product')
      }

      toast.success('Product deleted successfully')
      setDeletingProduct(null)
      refetchProducts()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast.error(error.message || 'Failed to delete product')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFormSuccess = () => {
    refetchProducts()
    // Dispatch event to update product count in sidebar
    window.dispatchEvent(new CustomEvent('productsUpdated'))
  }

  const handleAddProduct = () => {
    router.push('/dashboard/products/new')
  }

  const handleRowClick = (product: Product) => {
    setViewingProduct(product)
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name_en',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors",
              isSorted 
                ? "text-[#F4610B] bg-[#F4610B]/10 hover:bg-[#F4610B]/20" 
                : "hover:bg-gray-100"
            )}
          >
            <span>Product</span>
            {isSorted === 'asc' ? (
              <ArrowUp className="h-4 w-4 text-[#F4610B]" />
            ) : isSorted === 'desc' ? (
              <ArrowDown className="h-4 w-4 text-[#F4610B]" />
            ) : (
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="px-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
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
            <div className="flex-1 min-w-0">
              <div className="font-medium">{getProductName(product)}</div>
              {product.sku && (
                <div className="text-sm text-gray-500 font-mono mt-1">
                  {product.sku}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors",
              isSorted 
                ? "text-[#F4610B] bg-[#F4610B]/10 hover:bg-[#F4610B]/20" 
                : "hover:bg-gray-100"
            )}
          >
            <span>Price</span>
            {isSorted === 'asc' ? (
              <ArrowUp className="h-4 w-4 text-[#F4610B]" />
            ) : isSorted === 'desc' ? (
              <ArrowDown className="h-4 w-4 text-[#F4610B]" />
            ) : (
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        return (
          <PriceDisplay price={row.original.price} className="font-medium" />
        )
      },
    },
    {
      id: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => {
        const inv = inventoryMap.get(row.original.id)
        const quantity = inv?.available_quantity ?? 0
        const threshold = inv?.low_stock_threshold ?? 10
        const isLowStock = quantity > 0 && quantity <= threshold
        const isOutOfStock = quantity === 0
        
        return (
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium tabular-nums",
              isOutOfStock && "text-red-600",
              isLowStock && "text-amber-600"
            )}>
              {quantity}
            </span>
            {isLowStock && !isOutOfStock && (
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 text-[10px] px-1.5 py-0 rounded-full">
                Low
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'is_available',
      header: 'Status',
      cell: ({ row }) => {
        const inv = inventoryMap.get(row.original.id)
        const quantity = inv?.available_quantity ?? 0
        const threshold = inv?.low_stock_threshold ?? 10
        const isLowStock = quantity > 0 && quantity <= threshold
        const isOutOfStock = quantity === 0 || !row.original.is_available
        
        if (isOutOfStock) {
          return (
            <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 rounded-full">
              Out of Stock
            </Badge>
          )
        }
        if (isLowStock) {
          return (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-full">
              Low Stock
            </Badge>
          )
        }
        return (
          <Badge className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 rounded-full">
            In Stock
          </Badge>
        )
      },
    },
    {
      accessorKey: 'is_published',
      header: 'Visibility',
      cell: ({ row }) => {
        const isPublished = row.original.is_published
        return (
          <Badge
            className={cn(
              'cursor-pointer transition-colors',
              isPublished
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            onClick={async (e) => {
              e.stopPropagation()
              await togglePublishStatus(row.original.id, !isPublished)
            }}
          >
            {isPublished ? 'Published' : 'Draft'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors",
              isSorted 
                ? "text-[#F4610B] bg-[#F4610B]/10 hover:bg-[#F4610B]/20" 
                : "hover:bg-gray-100"
            )}
          >
            <span>Created</span>
            {isSorted === 'asc' ? (
              <ArrowUp className="h-4 w-4 text-[#F4610B]" />
            ) : isSorted === 'desc' ? (
              <ArrowDown className="h-4 w-4 text-[#F4610B]" />
            ) : (
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
        const formattedTime = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        return (
          <div className="text-sm">
            <div className="text-gray-900">{formattedDate}</div>
            <div className="text-gray-400 text-xs">{formattedTime}</div>
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const product = row.original
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)]">
                <DropdownMenuItem onClick={() => handleEdit(product)} className="rounded-lg hover:bg-[#F4610B] hover:text-white focus:bg-[#F4610B] focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(product)}
                  className="rounded-lg text-red-600 hover:bg-red-500 hover:text-white focus:bg-red-500 focus:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      enableSorting: false,
    },
  ]

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0">
      {isLoading ? (
        <>
          {/* Skeleton for page header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="space-y-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground mt-1">
              {totalCount} {totalCount === 1 ? 'product' : 'products'} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      onClick={handleAddProduct} 
                      disabled={isExternalStore || (!selectedConnectionId && !storeId)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </span>
                </TooltipTrigger>
                {isExternalStore && (
                  <TooltipContent>
                    <p>Cannot add products to external stores. Products must be synced from the platform.</p>
                  </TooltipContent>
                )}
                {!isExternalStore && !selectedConnectionId && !storeId && (
                  <TooltipContent>
                    <p>Please select a store connection or create a store to add products.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              onClick={() => setIsConnectStoreModalOpen(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Import Products
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* Skeleton for DataTable header */}
          <div className="flex items-center py-4 px-4 flex-shrink-0">
            <Skeleton className="h-10 w-64" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
          
          {/* Skeleton for DataTable */}
          <div className="rounded-md flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index} className="border-b-0 hover:bg-transparent">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-12 w-12 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Skeleton for pagination */}
          <div className="flex items-center justify-end space-x-2 py-4 flex-shrink-0">
            <Skeleton className="h-4 w-32" />
            <div className="space-x-2 flex">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-lg flex-1">
          <Package className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-muted-foreground font-medium">No products found</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4 text-center max-w-md">
            {isExternalStore 
              ? 'Products will be synced automatically from your external store. You can also add products manually using the "Add Product" button.'
              : selectedConnectionId
              ? 'Add your first product to get started, or sync products from your connected store.'
              : storeId
              ? 'Add your first product to get started.'
              : 'Create a store or connect to an external store to start adding products.'}
          </p>
          {/* TODO: Sync button removed - will be reimplemented with new architecture */}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <DataTable
            columns={columns}
            data={products}
            searchKey="name_en"
            searchPlaceholder="Search products..."
            onRowClick={handleRowClick}
            onRefresh={() => refetchProducts(true)}
            renderCard={renderProductCard}
            isRefreshing={isRefreshing}
            getStatus={(product) => {
              const inv = inventoryMap.get(product.id)
              const quantity = inv?.available_quantity ?? 0
              const threshold = inv?.low_stock_threshold ?? 10
              if (quantity === 0 || !product.is_available) return 'out-of-stock'
              if (quantity <= threshold) return 'low-stock'
              return 'in-stock'
            }}
            getVisibility={(product) => product.is_published ? 'published' : 'draft'}
            getCreatedAt={(product) => product.created_at}
          />
        </div>
      )}

      {/* Product Form Dialog */}
      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
        onSuccess={handleFormSuccess}
      />

      {/* Product Details Dialog */}
      <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View and manage product information
            </DialogDescription>
          </DialogHeader>
          {viewingProduct && (
            <div className="space-y-6">
              {/* Product Image */}
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {viewingProduct.image_url ? (
                    <img
                      src={viewingProduct.image_url}
                      alt={getProductName(viewingProduct)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-2xl font-bold">{getProductName(viewingProduct)}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      SKU: {viewingProduct.sku || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <PriceDisplay price={viewingProduct.price} className="ml-2 text-lg font-semibold" />
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full border",
                        viewingProduct.is_available
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50'
                      )}
                    >
                      {viewingProduct.is_available ? 'Available' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name (English)</label>
                  <p className="mt-1">{viewingProduct.name_en || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name (Arabic)</label>
                  <p className="mt-1" dir="rtl">{viewingProduct.name_ar || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Description (English)</label>
                  <p className="mt-1">{viewingProduct.description_en || 'No description'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Description (Arabic)</label>
                  <p className="mt-1" dir="rtl">{viewingProduct.description_ar || 'No description'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1">
                    {new Date(viewingProduct.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Product Classification */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Product Classification</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Product Type</label>
                    <p className="mt-1 capitalize">{viewingProduct.product_type || 'Physical'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Selling Method</label>
                    <p className="mt-1 capitalize">{viewingProduct.selling_method || 'Unit'}{viewingProduct.selling_unit ? ` (${viewingProduct.selling_unit})` : ''}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fulfillment</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(viewingProduct.fulfillment_type || ['pickup']).map((type) => (
                        <Badge key={type} variant="outline" className="capitalize">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sales Channels</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(viewingProduct.sales_channels || ['online', 'in_store']).map((channel) => (
                        <Badge key={channel} variant="outline" className="capitalize">
                          {channel === 'in_store' ? 'In-Store' : 'Online'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Discounts */}
              {(viewingProduct.compare_at_price || viewingProduct.discount_type !== 'none') && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Pricing & Discounts</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingProduct.compare_at_price && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Compare at Price</label>
                        <PriceDisplay price={viewingProduct.compare_at_price} className="mt-1 line-through text-muted-foreground" />
                      </div>
                    )}
                    {viewingProduct.discount_type && viewingProduct.discount_type !== 'none' && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Discount</label>
                          <p className="mt-1 text-green-600 font-medium">
                            {viewingProduct.discount_type === 'percentage' 
                              ? `${viewingProduct.discount_value}% off`
                              : `${currencyIcon || ''}${viewingProduct.discount_value} off`}
                          </p>
                        </div>
                        {(viewingProduct.discount_start_date || viewingProduct.discount_end_date) && (
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">Discount Period</label>
                            <p className="mt-1 text-sm">
                              {viewingProduct.discount_start_date && new Date(viewingProduct.discount_start_date).toLocaleDateString()}
                              {' - '}
                              {viewingProduct.discount_end_date ? new Date(viewingProduct.discount_end_date).toLocaleDateString() : 'No end date'}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Inventory */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Inventory</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stock Quantity</label>
                    <p className="mt-1 font-medium">
                      {inventoryMap.get(viewingProduct.id)?.quantity ?? 'Not tracked'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Low Stock Threshold</label>
                    <p className="mt-1">{viewingProduct.low_stock_threshold || inventoryMap.get(viewingProduct.id)?.low_stock_threshold || 10}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Track Inventory</label>
                    <p className="mt-1">{viewingProduct.track_inventory !== false ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Allow Backorders</label>
                    <p className="mt-1">{viewingProduct.allow_backorder ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewingProduct(null)
                    handleEdit(viewingProduct)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Product
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewingProduct(null)
                    handleDelete(viewingProduct)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Product
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Connect Store Modal */}
      <ConnectStoreModal
        open={isConnectStoreModalOpen}
        onOpenChange={setIsConnectStoreModalOpen}
        onSuccess={() => {
          // Refresh products after connecting
          refetchProducts()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the product "{deletingProduct ? getProductName(deletingProduct) : ''}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
