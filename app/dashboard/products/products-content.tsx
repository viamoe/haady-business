'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Package, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Plus, Pencil, Trash2, MoreHorizontal, Download, Globe, Store, FileEdit, Clock, X, CheckCircle2, Archive, LayoutList, Tag, DollarSign, Calendar, Loader2, TrendingUp, TrendingDown, MapPin, Truck, Building2, RotateCcw, History } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'
import { useHeader } from '@/lib/header-context'
import { useLocale } from '@/i18n/context'
import { Heart } from 'lucide-react'
import { ProductForm } from '@/components/product-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { ConnectStoreModal } from '@/components/connect-store-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
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
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useProductFetch,
  useProductState,
  useProductDialogs,
  useProductOperations,
  type Product,
  type InventoryData,
} from './hooks'
// TODO: Sparkles and AnimateIcon removed - will be reimplemented with new architecture

// Product type is now imported from hooks

interface LocalStorageDraft {
  nameEn: string
  nameAr: string
  descriptionEn: string
  price: string
  storeId: string
  lastSavedAt: string
}

// InventoryData type is now imported from hooks

interface ProductsContentProps {
  initialProducts?: Product[]
  initialTotalCount?: number
  initialStoreMap?: Map<string, string>
}

// Animated Status Tabs Component
type StatusTab = 'all' | 'active' | 'draft' | 'archived' | 'trash'

interface AnimatedStatusTabsProps {
  activeTab: StatusTab
  onTabChange: (tab: StatusTab) => void
  counts: Record<StatusTab, number>
}

function AnimatedStatusTabs({ activeTab, onTabChange, counts }: AnimatedStatusTabsProps) {
  const tabsRef = React.useRef<(HTMLButtonElement | null)[]>([])
  const [tabDimensions, setTabDimensions] = React.useState({ left: 0, width: 0 })

  const tabs = [
    { value: 'all' as StatusTab, label: 'All', icon: LayoutList },
    { value: 'active' as StatusTab, label: 'Published', icon: Globe },
    { value: 'draft' as StatusTab, label: 'Drafts', icon: FileEdit },
    { value: 'archived' as StatusTab, label: 'Archived', icon: Archive },
    { value: 'trash' as StatusTab, label: 'Trash', icon: Trash2 },
  ]

  React.useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.value === activeTab)
    const activeTabEl = tabsRef.current[activeIndex]
    
    if (activeTabEl) {
      setTabDimensions({
        left: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth,
      })
    }
  }, [activeTab, counts])

  const isTrashActive = activeTab === 'trash'
  
  return (
    <div className="flex items-center gap-1 relative">
      {/* Animated background */}
      <motion.div
        className={cn(
          "absolute h-full rounded-lg",
          isTrashActive ? "bg-red-50" : "bg-orange-50"
        )}
        initial={false}
        animate={{
          left: tabDimensions.left,
          width: tabDimensions.width,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.8
        }}
      />
      {tabs.map((tab, index) => {
        const Icon = tab.icon
        const count = counts[tab.value]
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            ref={(el) => { tabsRef.current[index] = el }}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "group flex items-center gap-2 px-4 h-10 rounded-lg relative z-10 text-sm font-medium transition-colors",
              isActive
                ? tab.value === 'trash'
                  ? "text-red-600"
                  : "text-[#F4610B]"
                : tab.value === 'trash'
                ? "text-gray-500 hover:text-red-600"
                : "text-gray-500 hover:text-[#F4610B]"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {count > 0 && (
              <div className={cn(
                "flex items-center justify-center h-5 min-w-5 px-1.5 rounded-md text-[10px] font-bold tabular-nums transition-colors",
                tab.value === 'trash'
                  ? isActive
                    ? "bg-red-600 text-white"
                    : "text-red-600 bg-transparent group-hover:bg-red-600 group-hover:text-white"
                  : isActive
                  ? "bg-[#F4610B] text-white"
                  : "text-[#F4610B] bg-transparent group-hover:bg-[#F4610B] group-hover:text-white"
              )}>
                {count}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function ProductsContent({ 
  initialProducts = [], 
  initialTotalCount = 0,
  initialStoreMap = new Map()
}: ProductsContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedConnectionId, selectedConnection, storeId } = useStoreConnection()
  const { setHeaderContent } = useHeader()
  
  // Custom hooks for state management
  const { fetchProducts: fetchProductsHook, isLoading: isFetchingProducts } = useProductFetch()
  const productState = useProductState(initialProducts)
  const dialogs = useProductDialogs()
  const operations = useProductOperations()
  
  // Local state
  const [products, setProducts] = React.useState<Product[]>(initialProducts)
  const [totalCount, setTotalCount] = React.useState(initialTotalCount)
  const [storeMap, setStoreMap] = React.useState<Map<string, string>>(initialStoreMap)
  const [inventoryMap, setInventoryMap] = React.useState<Map<string, InventoryData>>(new Map())
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasInitialized, setHasInitialized] = React.useState(false)
  const isNavigatingRef = React.useRef(false)
  const hasInitialProductsRef = React.useRef(initialProducts.length > 0)
  const [connectionPlatform, setConnectionPlatform] = React.useState<string | null>(null)
  const [currencyIcon, setCurrencyIcon] = React.useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [lovabilityStats, setLovabilityStats] = React.useState<{ average_rating: number; total_ratings: number } | null>(null)
  const [trashCount, setTrashCount] = React.useState<number>(0)
  
  // Get current locale for locale-aware currency symbols
  const { locale } = useLocale()
  
  // Destructure hooks for easier access
  const {
    allProducts,
    setAllProducts,
    trashedProducts,
    setTrashedProducts,
    selectedStatusTab,
    setSelectedStatusTab,
    searchValue,
    setSearchValue,
    localStorageDraft,
    setLocalStorageDraft,
    isDraftBannerDismissed,
    localStorageDraftAsProduct,
    statusCounts,
    filteredProducts,
    clearLocalStorageDraft,
    dismissDraftBanner,
  } = productState
  
  const {
    isFormOpen,
    editingProduct,
    openForm,
    closeForm,
    viewingProduct,
    productImages,
    setProductImages,
    currentImageIndex,
    setCurrentImageIndex,
    openViewDialog,
    closeViewDialog,
    editHistory,
    setEditHistory,
    isLoadingHistory,
    setIsLoadingHistory,
    isConnectStoreModalOpen,
    openConnectStoreModal,
    closeConnectStoreModal,
  } = dialogs
  
  const {
    deletingProduct,
    setDeletingProduct,
    isDeleting,
    setIsDeleting,
    bulkDeletingProducts,
    setBulkDeletingProducts,
    isBulkDeleting,
    setIsBulkDeleting,
    restoringProduct,
    setRestoringProduct,
    isRestoring,
    setIsRestoring,
    bulkRestoringProducts,
    setBulkRestoringProducts,
    isBulkRestoring,
    setIsBulkRestoring,
    permanentlyDeletingProduct,
    setPermanentlyDeletingProduct,
    isPermanentlyDeleting,
    setIsPermanentlyDeleting,
    bulkPermanentlyDeletingProducts,
    setBulkPermanentlyDeletingProducts,
    isBulkPermanentlyDeleting,
    setIsBulkPermanentlyDeleting,
    statusChangingProductId,
    setStatusChangingProductId,
    statusChangeProduct,
    setStatusChangeProduct,
    isChangingStatus,
    setIsChangingStatus,
    bulkStatusChange,
    setBulkStatusChange,
    isBulkChangingStatus,
    setIsBulkChangingStatus,
    isRefreshing,
    setIsRefreshing,
    refreshingMessage,
    setRefreshingMessage,
    clearSelectionCounter,
    clearSelection,
  } = operations
  
  // Get current user ID
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUser()
  }, [])

  // Initialize status tab from URL
  React.useEffect(() => {
    const initialTab = (searchParams.get('tab') as StatusTab) || 'all'
    if (['all', 'active', 'draft', 'archived', 'trash'].includes(initialTab)) {
      setSelectedStatusTab(initialTab)
    }
  }, [searchParams, setSelectedStatusTab])
  
  // Fetch lovability stats when viewing a product
  React.useEffect(() => {
    if (!viewingProduct?.id) {
      setLovabilityStats(null)
      return
    }

    const fetchLovabilityStats = async () => {
      try {
        const response = await fetch(`/api/products/${viewingProduct.id}/ratings?stats=true&limit=1`)
        if (response.ok) {
          const data = await response.json()
          if (data.stats) {
            setLovabilityStats({
              average_rating: data.stats.average_rating || 0,
              total_ratings: data.stats.total_ratings || 0
            })
          }
        }
      } catch (error) {
        console.error('Error fetching lovability stats:', error)
      }
    }

    fetchLovabilityStats()
  }, [viewingProduct?.id])

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

  // Fetch product images when viewing a product
  React.useEffect(() => {
    const fetchProductImages = async () => {
      if (viewingProduct?.id) {
        try {
          const response = await fetch(`/api/products/${viewingProduct.id}/images`)
          if (response.ok) {
            const data = await response.json()
            const images = (data.images || []).sort((a: any, b: any) => {
              // Sort by is_primary first, then display_order
              if (a.is_primary && !b.is_primary) return -1
              if (!a.is_primary && b.is_primary) return 1
              return (a.display_order || 0) - (b.display_order || 0)
            })
            setProductImages(images)
            setCurrentImageIndex(0)
          } else {
            setProductImages([])
            setCurrentImageIndex(0)
          }
        } catch (error) {
          console.error('Error fetching product images:', error)
          setProductImages([])
          setCurrentImageIndex(0)
        }
      } else {
        setProductImages([])
        setCurrentImageIndex(0)
      }
    }
    
    fetchProductImages()
  }, [viewingProduct?.id])

  // Fetch edit history when viewing a product
  React.useEffect(() => {
    const fetchEditHistory = async () => {
      if (viewingProduct?.id) {
        setIsLoadingHistory(true)
        try {
          const response = await fetch(`/api/products/${viewingProduct.id}/history`)
          if (response.ok) {
            const data = await response.json()
            setEditHistory(data.history || [])
          } else {
            setEditHistory([])
          }
        } catch (error) {
          console.error('Error fetching edit history:', error)
          setEditHistory([])
        } finally {
          setIsLoadingHistory(false)
        }
      } else {
        setEditHistory([])
      }
    }
    
    fetchEditHistory()
  }, [viewingProduct?.id])

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

    const loadProducts = async () => {
      setIsLoading(true)
      try {
        const result = await fetchProductsHook({
          selectedConnectionId,
          storeId,
          silent: false
        })
        
        setAllProducts(result.products)
        setProducts(result.products)
        setTotalCount(result.totalCount)
        setStoreMap(result.storeMap)
        setInventoryMap(result.inventoryMap)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching products:', error)
        }
        setAllProducts([])
        setProducts([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
        isNavigatingRef.current = false
      }
    }

    loadProducts()
  }, [selectedConnectionId, storeId, hasInitialized, fetchProductsHook])

  // Load localStorage draft on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('product_form_draft')
      if (saved) {
        const draft = JSON.parse(saved) as LocalStorageDraft
        // Only show if there's meaningful data and matches current store
        if ((draft.nameEn || draft.nameAr) && (!draft.storeId || draft.storeId === storeId)) {
          setLocalStorageDraft(draft)
        }
      }
    } catch (error) {
      console.error('Error loading localStorage draft:', error)
    }
  }, [storeId])

  // Fetch trash count
  const fetchTrashCount = React.useCallback(async () => {
    if (!storeId && !selectedConnectionId) {
      setTrashCount(0)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTrashCount(0)
        return
      }

      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!businessProfile) {
        setTrashCount(0)
        return
      }

      // Get all stores for the user's business
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('business_id', businessProfile.id)

      const storeIds = selectedConnectionId 
        ? [selectedConnectionId]
        : stores?.map(s => s.id) || (storeId ? [storeId] : [])

      if (storeIds.length === 0) {
        setTrashCount(0)
        return
      }

      // Count deleted products
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .in('store_id', storeIds)
        .not('deleted_at', 'is', null)

      if (error) {
        console.error('Error fetching trash count:', error)
        setTrashCount(0)
      } else {
        setTrashCount(count || 0)
      }
    } catch (error) {
      console.error('Error in fetchTrashCount:', error)
      setTrashCount(0)
    }
  }, [storeId, selectedConnectionId])

  // Fetch trash count on mount and when store changes
  React.useEffect(() => {
    if (hasInitialized) {
      fetchTrashCount()
    }
  }, [hasInitialized, fetchTrashCount])

  // Set header content
  React.useEffect(() => {
    const isExternalStore = connectionPlatform && connectionPlatform !== 'haady'
    
    setHeaderContent({
      title: 'Products',
      count: totalCount,
      searchPlaceholder: 'Search products...',
      searchValue: searchValue,
      onSearch: (value) => setSearchValue(value),
      rightActions: (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    onClick={() => router.push('/dashboard/products/new')} 
                    disabled={isExternalStore || (!selectedConnectionId && !storeId)}
                    size="sm"
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
            onClick={openConnectStoreModal}
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Import Products
          </Button>
        </>
      ),
    })

    return () => {
      setHeaderContent(null)
    }
  }, [totalCount, searchValue, connectionPlatform, selectedConnectionId, storeId, router, openConnectStoreModal, setHeaderContent])

  // Fetch trashed products
  const fetchTrashedProducts = React.useCallback(async () => {
    if (!storeId && !selectedConnectionId) {
      setTrashedProducts([])
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTrashedProducts([])
        return
      }

      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!businessProfile) {
        setTrashedProducts([])
        return
      }

      // Get all stores for the user's business
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('business_id', businessProfile.id)

      const storeIds = selectedConnectionId 
        ? [selectedConnectionId]
        : stores?.map(s => s.id) || (storeId ? [storeId] : [])

      if (storeIds.length === 0) {
        setTrashedProducts([])
        return
      }

      // Fetch trashed products
      const { data: productsData, error } = await supabase
        .from('products')
        .select('id, name_en, name_ar, description_en, description_ar, price, compare_at_price, discount_type, discount_value, discount_start_date, discount_end_date, sku, barcode, barcode_type, qr_code, qr_code_auto_generated, image_url, is_available, is_active, is_published, created_at, store_id, status, product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels, track_inventory, allow_backorder, low_stock_threshold, deleted_at, brand_id')
        .in('store_id', storeIds)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching trashed products:', error)
        setTrashedProducts([])
      } else {
        setTrashedProducts(productsData || [])
      }
    } catch (error) {
      console.error('Error in fetchTrashedProducts:', error)
      setTrashedProducts([])
    }
  }, [storeId, selectedConnectionId])

  // Fetch trashed products on initial load and when store changes
  React.useEffect(() => {
    if (hasInitialized) {
      // Always fetch trashed products to show count in tabs, not just when trash tab is selected
      fetchTrashedProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, storeId, selectedConnectionId])

  // dismissDraftBanner and clearLocalStorageDraft are now provided by useProductState hook

  // Continue editing localStorage draft
  const continueLocalDraft = React.useCallback(() => {
    router.push('/dashboard/products/new')
  }, [router])

  // TODO: Sync phrase rotation removed - will be reimplemented with new architecture

  // Refetch products function - uses the hook
  // silent: true = don't show full page loading skeleton (for refresh button)
  // message: optional message to display during refresh
  const refetchProducts = React.useCallback(async (silent = false, message?: string) => {
    if (silent) {
      setIsRefreshing(true)
      if (message) {
        setRefreshingMessage(message)
      }
    } else {
      setIsLoading(true)
    }
    
    try {
      const result = await fetchProductsHook({
        selectedConnectionId,
        storeId,
        silent
      })
      
      setAllProducts(result.products)
      setProducts(result.products)
      setTotalCount(result.totalCount)
      setStoreMap(result.storeMap)
      setInventoryMap(result.inventoryMap)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refetching products:', error)
      }
      setAllProducts([])
      setProducts([])
      setTotalCount(0)
    } finally {
      if (silent) {
        setIsRefreshing(false)
        setRefreshingMessage('')
      } else {
        setIsLoading(false)
      }
    }
  }, [selectedConnectionId, storeId, fetchProductsHook])

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

  // Helper function to format price with superscript decimals
  const formatPriceWithSuperscript = (price: number | string | null): React.ReactNode => {
    if (!price) return 'N/A'
    const num = parseFloat(price.toString())
    const integerPart = Math.floor(num)
    const decimalPart = Math.round((num - integerPart) * 100)
    const decimalStr = decimalPart.toString().padStart(2, '0')
    
    return (
      <span className="inline-flex items-baseline">
        <span>{integerPart.toLocaleString('en-US')}</span>
        <sup className="text-[0.8em] leading-none" style={{ fontSize: '0.8em', lineHeight: 0, verticalAlign: 'baseline', top: '-0.2em', marginLeft: '2px' }}>
          {decimalStr}
        </sup>
      </span>
    )
  }

  const formatPriceValue = (price: number | null) => {
    return formatPriceWithSuperscript(price)
  }

  const PriceDisplay = ({ price, className, showCurrency = true }: { price: number | null, className?: string, showCurrency?: boolean }) => {
    const [imageError, setImageError] = React.useState(false)
    
    // Check if currencyIcon is a valid URL
    const isValidUrl = currencyIcon && (currencyIcon.startsWith('http://') || currencyIcon.startsWith('https://'))
    
    // Check if URL is from sama.gov.sa (known to have redirect issues)
    const isProblematicUrl = isValidUrl && currencyIcon.includes('sama.gov.sa')
    
    // Generate fallback SVG as data URI
    const getFallbackSVG = (symbol: string) => {
      // Escape the symbol for use in SVG
      const escapedSymbol = symbol
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
      
      // Create a simple, well-formed SVG
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><text x="12" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" text-anchor="middle" fill="currentColor" dominant-baseline="middle">${escapedSymbol}</text></svg>`
      
      // Use base64 encoding for better browser compatibility
      if (typeof window !== 'undefined' && window.btoa) {
        try {
          return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
        } catch (e) {
          // Fallback to URL encoding if base64 fails
          return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
        }
      }
      // Server-side or if btoa is not available, use URL encoding
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    }
    
    // Determine fallback symbol
    // If currencyIcon is not a URL, it's already a symbol (use it)
    // Otherwise, use "SAR" as default
    const getLocaleAwareFallback = () => {
      if (currencyIcon && !isValidUrl) {
        // currencyIcon is already a symbol, use it
        return currencyIcon
      }
      // Always use "SAR" as fallback
      return 'SAR'
    }
    const fallbackSymbol = getLocaleAwareFallback()
    const fallbackDataUri = getFallbackSVG(fallbackSymbol)
    
    if (!price) return <span className={className}>N/A</span>
    
    // Skip proxy for problematic URLs, use fallback directly
    // Also use fallback if image failed to load
    const iconSrc = isValidUrl && !isProblematicUrl && !imageError
      ? `/api/currency-icon?url=${encodeURIComponent(currencyIcon)}`
      : null

    // Reset error when currencyIcon changes
    React.useEffect(() => {
      setImageError(false)
    }, [currencyIcon])

    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        {showCurrency && (
          <img 
            src={iconSrc || fallbackDataUri} 
            alt="currency" 
            className="h-4 w-4 inline-block object-contain" 
            onError={() => {
              // If image fails to load, switch to fallback
              setImageError(true)
            }}
          />
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
          
          
          {/* Status Badge - Top Left */}
          {product.status && product.status !== 'active' && (
            <div className="absolute top-3 left-3">
              <span className={cn(
                "text-[10px] font-semibold px-2 py-1 rounded-full",
                product.status === 'draft' && "bg-gray-200 text-gray-600",
                product.status === 'archived' && "bg-amber-100 text-amber-700"
              )}>
                {product.status === 'draft' ? 'Draft' : 'Archived'}
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
                  'absolute inset-0 text-[10px] font-medium rounded-full transition-opacity duration-200 group-hover:opacity-0 flex items-center justify-center gap-0.5 border',
                  isOutOfStock
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : isLowStock
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                )}
              >
                {isOutOfStock || isLowStock ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
                {isOutOfStock ? 'Out' : isLowStock ? 'Low' : 'In Stock'}
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

  // Split view resize state (hooks must be at component level)
  const [leftPanelWidth, setLeftPanelWidth] = React.useState(640)
  const [isResizing, setIsResizing] = React.useState(false)
  const splitViewContainerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !splitViewContainerRef.current) return
      
      const containerRect = splitViewContainerRef.current.getBoundingClientRect()
      const newWidth = e.clientX - containerRect.left
      const minWidth = 320
      const maxWidth = containerRect.width - 400 // Leave at least 400px for right panel
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setLeftPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Split/Master-Detail View Renderer
  const renderSplitView = (products: Product[], selectedProduct: Product | null, onSelect: (product: Product) => void) => {
    const selected = selectedProduct || products[0]
    const inv = selected ? inventoryMap.get(selected.id) : null
    const quantity = inv?.available_quantity ?? 0
    const threshold = inv?.low_stock_threshold ?? 10
    const isLowStock = quantity > 0 && quantity <= threshold
    const isOutOfStock = quantity === 0

    return (
      <div ref={splitViewContainerRef} className="flex h-full relative">
        {/* Left Panel - Product List */}
        <div className="border-r border-gray-100 flex flex-col flex-shrink-0" style={{ width: `${leftPanelWidth}px` }}>
          <div className="flex-1 overflow-y-auto">
            {products.map((product) => {
              const isSelected = selected?.id === product.id
              const prodInv = inventoryMap.get(product.id)
              const prodQty = prodInv?.available_quantity ?? 0
              
              return (
                <div
                  key={product.id}
                  onClick={() => onSelect(product)}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer border-b border-gray-50 transition-colors",
                    isSelected 
                      ? "bg-[#F4610B]/5 border-l-2 border-l-[#F4610B]" 
                      : "hover:bg-gray-50 border-l-2 border-l-transparent"
                  )}
                >
                  {/* Product Image */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={getProductName(product)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>'
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-medium text-sm truncate",
                      isSelected ? "text-gray-900" : "text-gray-700"
                    )}>
                      {getProductName(product)}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-gray-900">
                        <PriceDisplay price={product.price} />
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className={cn(
                        "text-xs",
                        prodQty === 0 ? "text-red-600" : prodQty <= 10 ? "text-amber-600" : "text-gray-500"
                      )}>
                        {prodQty} qty
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-200 hover:bg-[#F4610B] cursor-col-resize transition-colors flex-shrink-0 relative group"
          onMouseDown={(e) => {
            e.preventDefault()
            setIsResizing(true)
          }}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Right Panel - Product Details */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 min-w-0">
          {selected ? (
            <div className="p-6">
              {/* Product Header */}
              <div className="flex gap-6 mb-6">
                {/* Main Image */}
                <div className="w-48 h-48 rounded-2xl overflow-hidden bg-white flex-shrink-0">
                  {selected.image_url ? (
                    <img 
                      src={selected.image_url} 
                      alt={getProductName(selected)}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><svg class="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>'
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-500 font-mono mb-1">{selected.sku || 'No SKU'}</p>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {getProductName(selected)}
                      </h2>
                      {selected.name_ar && (
                        <p className="text-lg text-gray-500 mt-1" dir="rtl">{selected.name_ar}</p>
                      )}
                    </div>
                    <Badge className={cn(
                      "rounded-full",
                      selected.status === 'draft' ? "bg-gray-100 text-gray-600" :
                      selected.status === 'archived' ? "bg-amber-50 text-amber-700" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {selected.status === 'draft' ? 'Draft' : selected.status === 'archived' ? 'Archived' : 'Published'}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-3 mt-4">
                    <span className="text-3xl font-bold text-gray-900">
                      <PriceDisplay price={selected.price} />
                    </span>
                    {selected.compare_at_price && selected.price && selected.compare_at_price > selected.price && (
                      <span className="text-lg text-gray-400 line-through">
                        <PriceDisplay price={selected.compare_at_price} />
                      </span>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="flex items-center gap-2 mt-4">
                    <Badge className={cn(
                      "rounded-full",
                      isOutOfStock ? "bg-red-50 text-red-600" :
                      isLowStock ? "bg-amber-50 text-amber-600" :
                      "bg-green-50 text-green-600"
                    )}>
                      {isOutOfStock ? (
                        <><TrendingDown className="h-3 w-3 mr-1" /> Out of Stock</>
                      ) : isLowStock ? (
                        <><TrendingDown className="h-3 w-3 mr-1" /> Low Stock</>
                      ) : (
                        <><TrendingUp className="h-3 w-3 mr-1" /> In Stock</>
                      )}
                    </Badge>
                    <span className="text-sm text-gray-500">{quantity} available</span>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 mt-6">
                    <Button
                      size="sm"
                      onClick={() => handleEdit(selected)}
                      className="bg-[#F4610B] hover:bg-[#d9560a] text-white"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Product
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewDialog(selected)}
                    >
                      Full Preview
                    </Button>
                  </div>
                </div>
              </div>

              {/* Description */}
              {(selected.description_en || selected.description_ar) && (
                <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                  {selected.description_en && (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selected.description_en}</p>
                  )}
                  {selected.description_ar && (
                    <p className="text-sm text-gray-500 mt-2" dir="rtl">{selected.description_ar}</p>
                  )}
                </div>
              )}

              {/* Product Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Product Type</h3>
                  <p className="text-sm font-medium text-gray-900 capitalize">{selected.product_type || 'Physical'}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Selling Method</h3>
                  <p className="text-sm font-medium text-gray-900 capitalize">{selected.selling_method || 'Unit'}</p>
                </div>
                {selected.barcode && (
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Barcode</h3>
                    <p className="text-sm font-mono text-gray-900">{selected.barcode}</p>
                  </div>
                )}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sales Channels</h3>
                  <div className="flex gap-2">
                    {(selected.sales_channels || ['online']).map((channel: string) => (
                      <Badge key={channel} variant="secondary" className="text-xs capitalize">
                        {channel === 'in_store' ? 'In-Store' : channel}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Package className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a product</p>
              <p className="text-sm">Choose a product from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleEdit = (product: Product) => {
    // For draft products, navigate to the full edit page
    if (product.status === 'draft') {
      router.push(`/dashboard/products/new?edit=${product.id}`)
      return
    }
    // For other products, open the edit dialog
    openForm(product)
  }

  const handleDelete = (product: Product) => {
    setDeletingProduct(product)
  }

  const confirmRestore = async () => {
    if (!restoringProduct) return

    setIsRestoring(true)
    try {
      const response = await fetch(`/api/products/${restoringProduct.id}/restore`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to restore product')
      }

      const productName = getProductName(restoringProduct)
      toast.success('restored to archived successfully', {
        productImage: restoringProduct.image_url,
        productName: productName
      })
      
      // Remove from trashed products list
      setTrashedProducts(prev => prev.filter(p => p.id !== restoringProduct.id))
      // Silent refresh - only update table data, no full page skeleton
      refetchProducts(true, 'Restoring product to archived...')
      // Update trash count
      fetchTrashCount()
      setRestoringProduct(null)
      // Navigate to archived tab to show the restored product
      setSelectedStatusTab('archived')
      // Dispatch event to update product count in sidebar
      window.dispatchEvent(new CustomEvent('productsUpdated'))
    } catch (error: any) {
      console.error('Error restoring product:', error)
      toast.error(error.message || 'Failed to restore product')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleRestore = (product: Product) => {
    setRestoringProduct(product)
  }

  const handlePermanentDelete = async (product: Product) => {
    setPermanentlyDeletingProduct(product)
    setIsPermanentlyDeleting(true)
    try {
      const response = await fetch(`/api/products/${product.id}?permanent=true`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to permanently delete product')
      }

      const productName = getProductName(product)
      toast.success('permanently deleted', {
        productImage: product.image_url,
        productName: productName
      })
      
      // Remove from trashed products list
      setTrashedProducts(prev => prev.filter(p => p.id !== product.id))
      // Update trash count
      fetchTrashCount()
      setPermanentlyDeletingProduct(null)
    } catch (error: any) {
      console.error('Error permanently deleting product:', error)
      toast.error(error.message || 'Failed to permanently delete product')
    } finally {
      setIsPermanentlyDeleting(false)
    }
  }

  const handleBulkRestore = async (products: Product[]) => {
    // Show confirmation dialog
    setBulkRestoringProducts(products)
  }

  const confirmBulkRestore = async () => {
    const products = bulkRestoringProducts
    if (products.length === 0) return

    setIsBulkRestoring(true)
    try {
      const results = await Promise.allSettled(
        products.map(product =>
          fetch(`/api/products/${product.id}/restore`, {
            method: 'POST',
          })
        )
      )

      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
      
      if (failed.length > 0) {
        throw new Error(`Failed to restore ${failed.length} product(s)`)
      }

      toast.success(`${products.length} product(s) restored to archived successfully`)
      
      // Silent refresh - only update table data, no full page skeleton
      refetchProducts(true, `Restoring ${products.length} product(s) to archived...`)
      fetchTrashedProducts()
      fetchTrashCount()
      setBulkRestoringProducts([])
      // Navigate to archived tab to show the restored products
      setSelectedStatusTab('archived')
      // Dispatch event to update product count in sidebar
      window.dispatchEvent(new CustomEvent('productsUpdated'))
    } catch (error: any) {
      console.error('Error restoring products:', error)
      toast.error(error.message || 'Failed to restore products')
      // Refresh to ensure consistency
      fetchTrashedProducts()
    } finally {
      setIsBulkRestoring(false)
    }
  }

  const handleBulkPermanentDelete = async (products: Product[]) => {
    // Show confirmation dialog
    setBulkPermanentlyDeletingProducts(products)
  }

  const confirmBulkPermanentDelete = async () => {
    const products = bulkPermanentlyDeletingProducts
    if (products.length === 0) return

    setIsBulkPermanentlyDeleting(true)
    try {
      const results = await Promise.allSettled(
        products.map(product =>
          fetch(`/api/products/${product.id}?permanent=true`, {
            method: 'DELETE',
          })
        )
      )

      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
      
      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} product(s)`)
      }

      toast.success(`${products.length} product(s) permanently deleted`)
      
      // Refresh trash list and count
      fetchTrashedProducts()
      fetchTrashCount()
      setBulkPermanentlyDeletingProducts([])
      // Dispatch event to update product count in sidebar
      window.dispatchEvent(new CustomEvent('productsUpdated'))
    } catch (error: any) {
      console.error('Error permanently deleting products:', error)
      toast.error(error.message || 'Failed to permanently delete products')
      // Refresh to ensure consistency
      fetchTrashedProducts()
    } finally {
      setIsBulkPermanentlyDeleting(false)
    }
  }

  const handleBulkStatusChange = (products: Product[], newStatus: 'active' | 'draft' | 'archived') => {
    // Show confirmation dialog
    setBulkStatusChange({ products, newStatus })
  }

  const confirmBulkStatusChange = async () => {
    if (!bulkStatusChange) return

    const { products, newStatus } = bulkStatusChange
    setIsBulkChangingStatus(true)
    
    try {
      // Update all products
      const results = await Promise.allSettled(
        products.map(product =>
          fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      )

      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
      
      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} product(s)`)
      }

      const statusLabel = newStatus === 'active' ? 'published' : newStatus
      toast.success(`${products.length} product(s) ${statusLabel} successfully`)
      
      // Silent refresh - only update table data, no full page skeleton
      refetchProducts(true, `Updating ${products.length} product(s) status...`)
      // Dispatch event to update product count in sidebar
      window.dispatchEvent(new CustomEvent('productsUpdated'))
      
      setBulkStatusChange(null)
      // Clear row selection after status change
      clearSelection()
    } catch (error: any) {
      console.error('Error updating product status:', error)
      toast.error(error.message || 'Failed to update product status')
      // Refresh to revert optimistic updates
      refetchProducts(true, 'Reverting changes...')
    } finally {
      setIsBulkChangingStatus(false)
    }
  }

  const handleStatusChange = (product: Product, newStatus: 'active' | 'draft' | 'archived') => {
    // Show confirmation dialog
    setStatusChangeProduct({ product, newStatus })
  }

  const confirmStatusChange = async () => {
    if (!statusChangeProduct) return

    const { product, newStatus } = statusChangeProduct
    setIsChangingStatus(true)
    setStatusChangingProductId(product.id)

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to update status'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Response body might be empty
        }
        throw new Error(errorMessage)
      }

      toast.success(`Product status changed to ${newStatus === 'active' ? 'published' : newStatus}`)
      // Silent refresh - only update table data, no full page skeleton
      refetchProducts(true, 'Updating product status...')
      // Dispatch event to update product count in sidebar
      window.dispatchEvent(new CustomEvent('productsUpdated'))
      
      setStatusChangeProduct(null)
      // Clear row selection after status change
      clearSelection()
    } catch (error: any) {
      console.error('Error updating product status:', error)
      toast.error(error.message || 'Failed to update status')
    } finally {
      setIsChangingStatus(false)
      setStatusChangingProductId(null)
    }
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

      const productName = deletingProduct.name_en || deletingProduct.name_ar || 'Product'
      const productImage = deletingProduct.image_url
      
      toast.success('moved to trash successfully', {
        productImage: productImage,
        productName: productName
      })
      setDeletingProduct(null)
      // Silent refresh - only update table data, no full page skeleton
      refetchProducts(true, 'Moving product to trash...')
      // Always fetch trashed products to update trash count and list
      fetchTrashedProducts()
      fetchTrashCount()
      // Dispatch event to update product count in sidebar
      window.dispatchEvent(new CustomEvent('productsUpdated'))
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast.error(error.message || 'Failed to delete product')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = (products: Product[]) => {
    // Show confirmation dialog
    setBulkDeletingProducts(products)
  }

  const confirmBulkDelete = async () => {
    const products = bulkDeletingProducts
    if (products.length === 0) return

    setIsBulkDeleting(true)
    try {
      const results = await Promise.allSettled(
        products.map(product =>
          fetch(`/api/products/${product.id}`, {
            method: 'DELETE',
          })
        )
      )

      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))
      
      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} product(s)`)
      }

      toast.success(`${products.length} product(s) moved to trash successfully`)
      
      // Silent refresh - only update table data, no full page skeleton
      refetchProducts(true, `Moving ${products.length} product(s) to trash...`)
      // Always fetch trashed products to update trash count and list
      fetchTrashedProducts()
      fetchTrashCount()
      setBulkDeletingProducts([])
      // Dispatch event to update product count in sidebar
      window.dispatchEvent(new CustomEvent('productsUpdated'))
    } catch (error: any) {
      console.error('Error deleting products:', error)
      toast.error(error.message || 'Failed to delete products')
      // Refresh to ensure consistency
      refetchProducts()
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleFormSuccess = () => {
    // Silent refresh - only update table data, no full page skeleton
    refetchProducts(true, 'Refreshing products...')
    // Dispatch event to update product count in sidebar
    window.dispatchEvent(new CustomEvent('productsUpdated'))
  }

  const handleAddProduct = () => {
    router.push('/dashboard/products/new')
  }

  const handleRowClick = (product: Product) => {
    // In trash tab, toggle row selection instead of editing
    if (selectedStatusTab === 'trash') {
      return false // Return false to indicate selection should be toggled
    }
    // If clicking on the local draft, continue editing it
    if (product.id === 'local-draft') {
      continueLocalDraft()
      return true
    }
    // Open edit (handles both drafts and regular products)
    handleEdit(product)
    return true
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name_en',
      size: 400,
      minSize: 300,
      header: ({ column, table }) => {
        const isSorted = column.getIsSorted()
        const hasSelectedRows = table.getSelectedRowModel().rows.length > 0
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (hasSelectedRows) return
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors h-full min-h-[40px]",
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
          <div className="flex items-center gap-3 w-full max-w-full overflow-hidden">
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
            <div className="flex-1 min-w-0 overflow-hidden">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-medium line-clamp-2 break-words cursor-default">
                      {getProductName(product)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-md">
                    <p className="text-sm">{getProductName(product)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {product.sku && (
                <div className="text-sm text-gray-500 font-mono mt-1 truncate" title={product.sku}>
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
      size: 120,
      minSize: 100,
      header: ({ column, table }) => {
        const isSorted = column.getIsSorted()
        const hasSelectedRows = table.getSelectedRowModel().rows.length > 0
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (hasSelectedRows) return
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors h-full min-h-[40px]",
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
      size: 110,
      minSize: 90,
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
      size: 140,
      minSize: 120,
      header: 'Availability',
      cell: ({ row }) => {
        const inv = inventoryMap.get(row.original.id)
        const quantity = inv?.available_quantity ?? 0
        const threshold = inv?.low_stock_threshold ?? 10
        const isLowStock = quantity > 0 && quantity <= threshold
        const isOutOfStock = quantity === 0 || !row.original.is_available
        
        if (isOutOfStock) {
          return (
            <Badge className="bg-red-50 text-red-600 border-transparent rounded-full">
              <TrendingDown className="h-3 w-3 mr-1" />
              Out of Stock
            </Badge>
          )
        }
        if (isLowStock) {
          return (
            <Badge className="bg-amber-50 text-amber-600 border-transparent rounded-full">
              <TrendingDown className="h-3 w-3 mr-1" />
              Low Stock
            </Badge>
          )
        }
        return (
          <Badge className="bg-green-50 text-green-600 border-transparent rounded-full">
            <TrendingUp className="h-3 w-3 mr-1" />
            In Stock
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      size: 120,
      minSize: 100,
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'active'
        const statusConfig = {
          active: { label: 'Published', className: 'bg-blue-50 text-blue-600 border-transparent' },
          draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-transparent' },
          archived: { label: 'Archived', className: 'bg-amber-50 text-amber-700 border-transparent' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
        return (
          <Badge className={cn('border', config.className)}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      size: 150,
      minSize: 130,
      header: ({ column, table }) => {
        const isSorted = column.getIsSorted()
        const hasSelectedRows = table.getSelectedRowModel().rows.length > 0
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (hasSelectedRows) return
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors h-full min-h-[40px]",
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
  ]

  // Trash-specific columns - use same structure as regular columns for consistency
  const trashColumns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name_en',
      size: 400,
      minSize: 300,
      header: ({ column, table }) => {
        const isSorted = column.getIsSorted()
        const hasSelectedRows = table.getSelectedRowModel().rows.length > 0
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (hasSelectedRows) return
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors h-full min-h-[40px]",
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
          <div className="flex items-center gap-3 w-full max-w-full overflow-hidden">
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
            <div className="flex-1 min-w-0 overflow-hidden">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-medium line-clamp-2 break-words cursor-default">
                      {getProductName(product)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-md">
                    <p className="text-sm">{getProductName(product)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {product.sku && (
                <div className="text-sm text-gray-500 font-mono mt-1 truncate" title={product.sku}>
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
      size: 120,
      minSize: 100,
      header: ({ column, table }) => {
        const isSorted = column.getIsSorted()
        const hasSelectedRows = table.getSelectedRowModel().rows.length > 0
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (hasSelectedRows) return
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors h-full min-h-[40px]",
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
      size: 110,
      minSize: 90,
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
      size: 140,
      minSize: 120,
      header: 'Availability',
      cell: ({ row }) => {
        const inv = inventoryMap.get(row.original.id)
        const quantity = inv?.available_quantity ?? 0
        const threshold = inv?.low_stock_threshold ?? 10
        const isLowStock = quantity > 0 && quantity <= threshold
        const isOutOfStock = quantity === 0 || !row.original.is_available
        
        if (isOutOfStock) {
          return (
            <Badge className="bg-red-50 text-red-600 border-transparent rounded-full">
              <TrendingDown className="h-3 w-3 mr-1" />
              Out of Stock
            </Badge>
          )
        }
        if (isLowStock) {
          return (
            <Badge className="bg-amber-50 text-amber-600 border-transparent rounded-full">
              <TrendingDown className="h-3 w-3 mr-1" />
              Low Stock
            </Badge>
          )
        }
        return (
          <Badge className="bg-green-50 text-green-600 border-transparent rounded-full">
            <TrendingUp className="h-3 w-3 mr-1" />
            In Stock
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      size: 120,
      minSize: 100,
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'active'
        const statusConfig = {
          active: { label: 'Published', className: 'bg-blue-50 text-blue-600 border-transparent' },
          draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-transparent' },
          archived: { label: 'Archived', className: 'bg-amber-50 text-amber-700 border-transparent' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
        return (
          <Badge className={cn('border', config.className)}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'deleted_at',
      size: 150,
      minSize: 130,
      header: ({ column, table }) => {
        const isSorted = column.getIsSorted()
        const hasSelectedRows = table.getSelectedRowModel().rows.length > 0
        return (
          <Button
            variant="ghost"
            onClick={() => {
              if (hasSelectedRows) return
              if (!isSorted) {
                column.toggleSorting(false) // asc
              } else if (isSorted === 'asc') {
                column.toggleSorting(true) // desc
              } else {
                column.clearSorting() // neutral
              }
            }}
            className={cn(
              "w-full justify-between font-medium transition-colors h-full min-h-[40px]",
              isSorted 
                ? "text-[#F4610B] bg-[#F4610B]/10 hover:bg-[#F4610B]/20" 
                : "hover:bg-gray-100"
            )}
          >
            <span>Deleted</span>
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
        const deletedAt = row.original.deleted_at ? new Date(row.original.deleted_at) : null
        if (!deletedAt) return null
        const formattedDate = deletedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
        const formattedTime = deletedAt.toLocaleTimeString('en-US', {
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
  ]

  // Use trash columns when trash tab is selected, otherwise use regular columns
  const displayColumns = selectedStatusTab === 'trash' ? trashColumns : columns

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
      ) : null}


      {/* Unsaved LocalStorage Draft Banner - Only show when there's an unsaved draft and not dismissed */}
      {!isLoading && localStorageDraft && !isDraftBannerDismissed && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-[#F4610B]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-gray-900">
                    {localStorageDraft.nameEn || localStorageDraft.nameAr || 'Untitled Draft'}
                  </p>
                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#F4610B] bg-orange-50 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F4610B] animate-pulse" />
                    Unsaved
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Last edited {localStorageDraft.lastSavedAt ? new Date(localStorageDraft.lastSavedAt).toLocaleString() : 'just now'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={dismissDraftBanner}
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
              <Button
                size="sm"
                className="bg-[#F4610B] hover:bg-[#E5550A] text-white shadow-sm"
                onClick={continueLocalDraft}
              >
                Continue Editing
              </Button>
            </div>
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
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <DataTable
            columns={displayColumns}
            data={filteredProducts}
            searchKey="name_en"
            searchPlaceholder="Search products..."
            onRowClick={handleRowClick}
            onRefresh={() => refetchProducts(true)}
            renderCard={renderProductCard}
            renderSplitView={renderSplitView}
            isRefreshing={isRefreshing}
            refreshingMessage={refreshingMessage}
            enableRowSelection={true}
            clearSelectionTrigger={`${selectedStatusTab}-${clearSelectionCounter}`}
            bulkActions={
              selectedStatusTab === 'trash'
                ? [
                    {
                      label: 'Restore',
                      icon: RotateCcw,
                      onClick: (selectedProducts: Product[]) => {
                        handleBulkRestore(selectedProducts)
                      },
                    },
                    {
                      label: 'Delete Permanently',
                      icon: Trash2,
                      onClick: (selectedProducts: Product[]) => {
                        handleBulkPermanentDelete(selectedProducts)
                      },
                      variant: 'destructive' as const,
                    },
                  ]
                : [
                    {
                      label: (selectedProducts: Product[]) => {
                        const count = selectedProducts.length
                        return `Publish ${count} ${count === 1 ? 'Product' : 'Products'}`
                      },
                      icon: Globe,
                      onClick: (selectedProducts: Product[]) => {
                        handleBulkStatusChange(selectedProducts, 'active')
                      },
                      status: 'active' as const,
                    },
                    {
                      label: (selectedProducts: Product[]) => {
                        const count = selectedProducts.length
                        return `Draft ${count} ${count === 1 ? 'Product' : 'Products'}`
                      },
                      icon: FileEdit,
                      onClick: (selectedProducts: Product[]) => {
                        handleBulkStatusChange(selectedProducts, 'draft')
                      },
                      status: 'draft' as const,
                    },
                    {
                      label: (selectedProducts: Product[]) => {
                        const count = selectedProducts.length
                        return `Archive ${count} ${count === 1 ? 'Product' : 'Products'}`
                      },
                      icon: Archive,
                      onClick: (selectedProducts: Product[]) => {
                        handleBulkStatusChange(selectedProducts, 'archived')
                      },
                      status: 'archived' as const,
                    },
                    {
                      label: (selectedProducts: Product[]) => {
                        const count = selectedProducts.length
                        return `Delete ${count} ${count === 1 ? 'Product' : 'Products'}`
                      },
                      icon: Trash2,
                      onClick: (selectedProducts: Product[]) => {
                        // Handle bulk delete
                        if (selectedProducts.length === 1) {
                          handleDelete(selectedProducts[0])
                        } else {
                          // For multiple products, show bulk delete confirmation dialog
                          handleBulkDelete(selectedProducts)
                        }
                      },
                      variant: 'destructive' as const,
                    },
                  ].filter(action => {
                    // Hide the action that matches the current status tab
                    if ('status' in action) {
                      if (selectedStatusTab === 'active' && action.status === 'active') return false
                      if (selectedStatusTab === 'draft' && action.status === 'draft') return false
                      if (selectedStatusTab === 'archived' && action.status === 'archived') return false
                    }
                    return true
                  })
            }
            getStatus={(product) => {
              const inv = inventoryMap.get(product.id)
              const quantity = inv?.available_quantity ?? 0
              const threshold = inv?.low_stock_threshold ?? 10
              if (quantity === 0 || !product.is_available) return 'out-of-stock'
              if (quantity <= threshold) return 'low-stock'
              return 'in-stock'
            }}
            customTabs={
              <AnimatedStatusTabs
                activeTab={selectedStatusTab}
                onTabChange={setSelectedStatusTab}
                counts={statusCounts}
              />
            }
            emptyState={
              selectedStatusTab === 'active'
                ? {
                    icon: Globe,
                    title: "You don't have any published products yet",
                    description: "Create your first product to get started"
                  }
                : selectedStatusTab === 'draft'
                ? {
                    icon: FileEdit,
                    title: "You don't have any draft products",
                    description: "Start creating a product to save it as a draft"
                  }
                : selectedStatusTab === 'archived'
                ? {
                    icon: Archive,
                    title: "You don't have any archived products",
                    description: "Archived products will appear here"
                  }
                : selectedStatusTab === 'trash'
                ? {
                    icon: Trash2,
                    title: "Trash is empty",
                    description: "Deleted products will appear here"
                  }
                : filteredProducts.length === 0
                ? {
                    icon: Package,
                    title: "No products found",
                    description: isExternalStore 
                      ? 'Products will be synced automatically from your external store. You can also add products manually using the "Add Product" button.'
                      : selectedConnectionId
                      ? 'Add your first product to get started, or sync products from your connected store.'
                      : storeId
                      ? 'Add your first product to get started.'
                      : 'Create a store or connect to an external store to start adding products.'
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* Product Form Dialog */}
      <ProductForm
        open={isFormOpen}
        onOpenChange={(open) => !open && closeForm()}
        product={editingProduct}
        onSuccess={handleFormSuccess}
        onPreview={(product) => {
          closeForm()
          openViewDialog(product as Product)
        }}
      />

      {/* Product Details Dialog - E-commerce Style Preview */}
      <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && closeViewDialog()}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0 gap-0 bg-[#FAFAFA]">
          <DialogTitle className="sr-only">Product Details</DialogTitle>
          {viewingProduct && (
            <div className="flex flex-col h-full max-h-[92vh]">
              {/* E-commerce Style Content */}
              <div className="flex-1 overflow-hidden">
                <div className="grid grid-cols-[1.1fr_1fr] h-full items-start">
                  {/* Left - Product Image Gallery */}
                  <div className="relative bg-white p-8 flex flex-col h-full overflow-hidden">
                    {/* Edit Button - Floating */}
                    <div className="absolute top-6 right-6 z-10">
                      <Button
                        size="sm"
                        className="h-9 bg-[#F4610B] hover:bg-[#E5550A] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300 rounded-lg"
                        onClick={() => {
                          closeViewDialog()
                          handleEdit(viewingProduct)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Product
                      </Button>
                    </div>

                    {/* Main Product Image + Gallery */}
                    <div className="flex flex-col items-center relative mt-16">
                      <div className="w-full max-w-[420px] flex flex-col items-center gap-0">
                        <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
                          {(() => {
                            const currentImageUrl = productImages.length > 0
                              ? productImages[currentImageIndex]?.url
                              : viewingProduct.image_url

                            if (currentImageUrl) {
                              return (
                                <motion.img
                                  key={currentImageUrl}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                  src={currentImageUrl}
                                  alt={getProductName(viewingProduct)}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )
                            }

                            return (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                <ImageIcon className="h-24 w-24 mb-4" strokeWidth={1} />
                                <span className="text-sm font-medium text-gray-400">No image available</span>
                              </div>
                            )
                          })()}
                        </div>

                        {/* Thumbnails gallery */}
                        {productImages.length > 1 && (
                          <div className="mt-4 w-full">
                            <div className="grid grid-cols-5 gap-3 w-full" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                              {productImages.map((img, idx) => (
                                <div key={img.id || `${img.url}-${idx}`} className="w-full min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => setCurrentImageIndex(idx)}
                                    className={`relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 border transition-all duration-200 ${
                                      idx === currentImageIndex
                                        ? 'ring-2 ring-[#F4610B] ring-offset-2 border-transparent'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    title={`View image ${idx + 1}${img.is_primary ? ' (Featured)' : ''}`}
                                  >
                                    <ImageWithSkeleton
                                      src={img.url}
                                      alt={`Thumbnail ${idx + 1}`}
                                      className="absolute inset-0 w-full h-full object-cover"
                                      skeletonClassName="w-full h-full"
                                      containerClassName="absolute inset-0 w-full h-full"
                                      objectFit="cover"
                                    />
                                    {img.is_primary && (
                                      <div className="absolute top-1 right-1 bg-[#F4610B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
                                        ★
                                      </div>
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right - Product Details */}
                  <div className="bg-[#FAFAFA] p-8 pr-10 flex flex-col h-full overflow-hidden">
                    {/* Fixed Header Section */}
                    <div className="flex-shrink-0 pb-8 border-b border-gray-200 mb-6">
                      {/* SKU */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-mono text-gray-600 font-semibold">
                          {viewingProduct.sku || 'No SKU'}
                        </span>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 mb-4">
                        {(() => {
                          const status = viewingProduct.status || 'active'
                          const statusConfig = {
                            draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
                            archived: { label: 'Archived', className: 'bg-amber-50 text-amber-700' },
                            active: { label: 'Published', className: 'bg-blue-50 text-blue-600' },
                          }
                          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
                          return (
                            <>
                              <Badge className={cn('border rounded-full', config.className)}>
                                {config.label}
                              </Badge>
                              {(() => {
                                const inv = inventoryMap.get(viewingProduct.id)
                                const quantity = inv?.available_quantity ?? 0
                                const threshold = inv?.low_stock_threshold ?? 10
                                const isLowStock = quantity > 0 && quantity <= threshold
                                const isOutOfStock = quantity === 0 || !viewingProduct.is_available
                                
                                if (isOutOfStock) {
                                  return (
                                    <Badge className="bg-red-50 text-red-600 border-transparent rounded-full">
                                      <TrendingDown className="h-3 w-3 mr-1" />
                                      Out of Stock
                                    </Badge>
                                  )
                                }
                                if (isLowStock) {
                                  return (
                                    <Badge className="bg-amber-50 text-amber-600 border-transparent rounded-full">
                                      <TrendingDown className="h-3 w-3 mr-1" />
                                      Low Stock
                                    </Badge>
                                  )
                                }
                                return (
                                  <Badge className="bg-green-50 text-green-600 border-transparent rounded-full">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    In Stock
                                  </Badge>
                                )
                              })()}
                            </>
                          )
                        })()}
                      </div>

                      {/* Product Name */}
                      <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2 tracking-tight">
                        {getProductName(viewingProduct)}
                      </h1>

                      {/* Arabic Name (if different) */}
                      {viewingProduct.name_ar && (
                        <p className="text-lg text-gray-500 mb-4" dir="rtl">
                          {viewingProduct.name_ar}
                        </p>
                      )}

                      {/* Price Section */}
                      <div className="flex items-baseline gap-3">
                        <PriceDisplay price={viewingProduct.price} className="text-2xl font-bold text-gray-900" />
                        {viewingProduct.compare_at_price && (
                          <PriceDisplay price={viewingProduct.compare_at_price} className="text-xl text-gray-400 line-through" showCurrency={false} />
                        )}
                        {viewingProduct.discount_type && viewingProduct.discount_type !== 'none' && (
                          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                            Save {viewingProduct.discount_type === 'percentage' 
                              ? `${viewingProduct.discount_value}%`
                              : `${currencyIcon || ''}${viewingProduct.discount_value}`}
                          </span>
                        )}
                      </div>

                      {/* Lovability Display */}
                      {lovabilityStats && lovabilityStats.total_ratings > 0 && (
                        <div className="mt-4 flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <Heart
                                key={level}
                                className={cn(
                                  'h-4 w-4 transition-colors',
                                  level <= Math.round(lovabilityStats.average_rating)
                                    ? 'fill-rose-500 text-rose-500'
                                    : 'fill-gray-200 text-gray-200'
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-rose-600">
                            {lovabilityStats.average_rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({lovabilityStats.total_ratings} {lovabilityStats.total_ratings === 1 ? 'love' : 'loves'})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scrollable Content Section */}
                    <div className="flex-1 overflow-y-auto pr-4">
                      {/* Description */}
                    {(viewingProduct.description_en || viewingProduct.description_ar) && (
                      <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Description</h3>
                        {viewingProduct.description_en ? (
                          <div 
                            className="text-gray-600 leading-relaxed text-[15px] prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
                            dangerouslySetInnerHTML={{ __html: viewingProduct.description_en }}
                          />
                        ) : (
                          <p className="text-gray-600 leading-relaxed text-[15px]">No description available</p>
                        )}
                        {viewingProduct.description_ar && (
                          <div 
                            className="text-gray-500 leading-relaxed text-[15px] mt-4 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5" 
                            dir="rtl"
                            dangerouslySetInnerHTML={{ __html: viewingProduct.description_ar }}
                          />
                        )}
                      </div>
                    )}

                    {/* Product Details Grid */}
                    <div className="space-y-4 mb-6">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Details</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Barcode</div>
                          <div className="text-sm font-mono text-gray-900">
                            {viewingProduct.barcode || '—'}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Created</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {new Date(viewingProduct.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fulfillment & Channels */}
                    <div className="space-y-4 mb-6">
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Fulfillment Options</h3>
                        <div className="flex flex-wrap gap-3">
                          {(viewingProduct.fulfillment_type || ['pickup']).map((type) => {
                            const fulfillmentConfig = {
                              pickup: { label: 'Pickup', desc: 'Store Pickup', icon: MapPin },
                              delivery: { label: 'Delivery', desc: 'Home Delivery', icon: Truck },
                              digital: { label: 'Digital', desc: 'Download', icon: Download },
                              onsite: { label: 'On-Site', desc: 'At Location', icon: Building2 },
                            }
                            const config = fulfillmentConfig[type as keyof typeof fulfillmentConfig] || fulfillmentConfig.pickup
                            const Icon = config.icon
                            return (
                              <div
                                key={type}
                                className="flex items-center gap-2 px-3 py-2 bg-[#F4610B]/5 border border-[#F4610B] rounded-lg"
                              >
                                <div className="h-8 w-8 rounded-lg bg-[#F4610B]/10 flex items-center justify-center flex-shrink-0">
                                  <Icon className="h-4 w-4 text-[#F4610B]" />
                                </div>
                                <div className="flex flex-col">
                                  <div className="font-medium text-sm text-gray-900">
                                    {config.label}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {config.desc}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sales Channels</h3>
                        <div className="flex flex-wrap gap-3">
                          {(viewingProduct.sales_channels || ['online', 'in_store']).map((channel) => {
                            const isOnline = channel === 'online'
                            const Icon = isOnline ? Globe : Store
                            return (
                              <div
                                key={channel}
                                className="flex items-center gap-2 px-3 py-2 bg-[#F4610B]/5 border border-[#F4610B] rounded-lg"
                              >
                                <div className="h-8 w-8 rounded-lg bg-[#F4610B]/10 flex items-center justify-center flex-shrink-0">
                                  <Icon className="h-4 w-4 text-[#F4610B]" />
                                </div>
                                <div className="flex flex-col">
                                  <div className="font-medium text-sm text-gray-900">
                                    {isOnline ? 'Online' : 'In-Store'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {isOnline ? 'Website & Apps' : 'POS & Physical'}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Discount Period (if applicable) */}
                    {viewingProduct.discount_type && viewingProduct.discount_type !== 'none' && 
                     (viewingProduct.discount_start_date || viewingProduct.discount_end_date) && (
                      <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl p-4 border border-rose-100 mb-6">
                        <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                          <Calendar className="h-4 w-4" />
                          <span>Sale Period:</span>
                          <span className="font-normal text-rose-600">
                            {viewingProduct.discount_start_date && new Date(viewingProduct.discount_start_date).toLocaleDateString()}
                            {' → '}
                            {viewingProduct.discount_end_date ? new Date(viewingProduct.discount_end_date).toLocaleDateString() : 'Ongoing'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Edit History Section */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-gray-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Edit History</h3>
                      </div>
                      {isLoadingHistory ? (
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-sm text-gray-500">Loading history...</span>
                          </div>
                        </div>
                      ) : editHistory.length === 0 ? (
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <p className="text-sm text-gray-500">No edit history available</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {editHistory.map((entry) => (
                            <div key={entry.id} className="bg-white rounded-xl p-4 border border-gray-100">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-500">
                                    {new Date(entry.createdAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  {entry.editType && (
                                    <Badge variant="outline" className="text-xs">
                                      {entry.editType === 'draft_save' ? 'Draft Save' : entry.editType}
                                    </Badge>
                                  )}
                                </div>
                                {entry.editedBy && (
                                  <span className="text-xs text-gray-400">
                                    by {entry.editedBy.name}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1.5 mt-3">
                                {Object.entries(entry.changes).map(([field, change]) => (
                                  <div key={field} className="text-xs">
                                    <span className="font-semibold text-gray-700 capitalize">
                                      {field.replace(/_/g, ' ')}:
                                    </span>{' '}
                                    <span className="text-gray-500 line-through">
                                      {change.old_value !== null && change.old_value !== undefined 
                                        ? String(change.old_value).substring(0, 50)
                                        : '—'}
                                    </span>
                                    {' → '}
                                    <span className="text-gray-900 font-medium">
                                      {change.new_value !== null && change.new_value !== undefined 
                                        ? String(change.new_value).substring(0, 50)
                                        : '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Connect Store Modal */}
      <ConnectStoreModal
        open={isConnectStoreModalOpen}
        onOpenChange={(open) => !open && closeConnectStoreModal()}
        onSuccess={() => {
          // Refresh products after connecting
          refetchProducts()
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash</AlertDialogTitle>
            <div className="space-y-4">
              {deletingProduct && (
                <div className="flex items-center gap-4 py-2 w-full">
                  {deletingProduct.image_url && (
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={deletingProduct.image_url} 
                        alt={getProductName(deletingProduct)} 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 w-0 max-w-[200px]">
                    <p className="font-semibold text-gray-900 truncate" title={getProductName(deletingProduct)}>
                      {getProductName(deletingProduct)}
                    </p>
                    {deletingProduct.sku && (
                      <p className="text-xs text-gray-500 font-mono mt-1 truncate">
                        {deletingProduct.sku}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <AlertDialogDescription>
                This product will be moved to trash and hidden from your products list. You can restore it later from the trash view, or permanently delete it there.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setDeletingProduct(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving to Trash...
                </>
              ) : (
                'Move to Trash'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoringProduct} onOpenChange={(open) => !open && setRestoringProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Product</AlertDialogTitle>
            <div className="space-y-4">
              {restoringProduct && (
                <div className="flex items-center gap-4 py-2 w-full">
                  {restoringProduct.image_url && (
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={restoringProduct.image_url} 
                        alt={getProductName(restoringProduct)} 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 w-0 max-w-[200px]">
                    <p className="font-semibold text-gray-900 truncate" title={getProductName(restoringProduct)}>
                      {getProductName(restoringProduct)}
                    </p>
                    {restoringProduct.sku && (
                      <p className="text-xs text-gray-500 font-mono mt-1 truncate">
                        {restoringProduct.sku}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <AlertDialogDescription>
                This product will be restored from trash and moved to the archived section. You can change its status later if needed.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring} onClick={() => setRestoringProduct(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              disabled={isRestoring}
              className="bg-[#F4610B] hover:bg-[#d9560a] text-white"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore to Archived'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Restore Confirmation Dialog */}
      <AlertDialog open={bulkRestoringProducts.length > 0} onOpenChange={(open) => !open && setBulkRestoringProducts([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore {bulkRestoringProducts.length} product{bulkRestoringProducts.length > 1 ? 's' : ''} to archived? They will be moved from trash to the archived section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkRestoring} onClick={() => setBulkRestoringProducts([])}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkRestore}
              disabled={isBulkRestoring}
              className="bg-[#F4610B] hover:bg-[#d9560a] text-white"
            >
              {isBulkRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore to Archived'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Permanent Delete Confirmation Dialog */}
      <AlertDialog open={bulkPermanentlyDeletingProducts.length > 0} onOpenChange={(open) => !open && setBulkPermanentlyDeletingProducts([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {bulkPermanentlyDeletingProducts.length} product{bulkPermanentlyDeletingProducts.length > 1 ? 's' : ''}? This action cannot be undone. All associated data including images, inventory records, and ratings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkPermanentlyDeleting} onClick={() => setBulkPermanentlyDeletingProducts([])}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkPermanentDelete}
              disabled={isBulkPermanentlyDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isBulkPermanentlyDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Permanently Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeletingProducts.length > 0} onOpenChange={(open) => !open && setBulkDeletingProducts([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move {bulkDeletingProducts.length} product{bulkDeletingProducts.length > 1 ? 's' : ''} to trash? They will be moved from the current section to the trash. You can restore them later from the Trash tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting} onClick={() => setBulkDeletingProducts([])}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Moving to trash...
                </>
              ) : (
                'Move to Trash'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={!!statusChangeProduct} onOpenChange={(open) => !open && setStatusChangeProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Product Status</AlertDialogTitle>
            <div className="space-y-4">
              {statusChangeProduct && (
                <div className="flex items-center gap-4 py-2 w-full">
                  {statusChangeProduct.product.image_url ? (
                    <img
                      src={statusChangeProduct.product.image_url}
                      alt={getProductName(statusChangeProduct.product)}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2">
                      {getProductName(statusChangeProduct.product)}
                    </p>
                    {statusChangeProduct.product.sku && (
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {statusChangeProduct.product.sku}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <AlertDialogDescription>
                This product's status will be changed to{' '}
                <span className={cn(
                  "font-semibold inline-flex items-center gap-1.5",
                  (statusChangeProduct?.newStatus === 'draft' || statusChangeProduct?.newStatus === 'active' || statusChangeProduct?.newStatus === 'archived') && "text-[#F4610B]"
                )}>
                  {statusChangeProduct?.newStatus === 'active' ? (
                    <>
                      <Globe className="h-4 w-4" />
                      Published
                    </>
                  ) : statusChangeProduct?.newStatus === 'draft' ? (
                    <>
                      <FileEdit className="h-4 w-4" />
                      Draft
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4" />
                      Archived
                    </>
                  )}
                </span>
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingStatus} onClick={() => setStatusChangeProduct(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={isChangingStatus}
              className="bg-[#F4610B] hover:bg-[#d9560a] text-white"
            >
              {isChangingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Confirmation Dialog */}
      <AlertDialog open={!!bulkStatusChange} onOpenChange={(open) => !open && setBulkStatusChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Product Status</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkStatusChange?.products.length || 0} product{bulkStatusChange?.products.length !== 1 ? 's' : ''} will be moved to{' '}
              <span className={cn(
                "font-semibold inline-flex items-center gap-1.5",
                (bulkStatusChange?.newStatus === 'draft' || bulkStatusChange?.newStatus === 'active' || bulkStatusChange?.newStatus === 'archived') && "text-[#F4610B]"
              )}>
                {bulkStatusChange?.newStatus === 'active' ? (
                  <>
                    <Globe className="h-4 w-4" />
                    Published
                  </>
                ) : bulkStatusChange?.newStatus === 'draft' ? (
                  <>
                    <FileEdit className="h-4 w-4" />
                    Draft
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Archived
                  </>
                )}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkChangingStatus} onClick={() => setBulkStatusChange(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkStatusChange}
              disabled={isBulkChangingStatus}
              className="bg-[#F4610B] hover:bg-[#d9560a] text-white"
            >
              {isBulkChangingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
