"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Package, 
  TrendingDown,
  TrendingUp,
  ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  ArrowRightLeft,
  Building2,
  MapPin,
  AlertTriangle,
  History,
  SlidersHorizontal,
  GripVertical,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  Info,
  Settings
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { useLocale } from "@/i18n/context"
import { useHeader } from "@/lib/header-context"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { InventoryTransfer } from "@/components/inventory-transfer"

interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  sku: string | null
  image_url: string | null
  is_available: boolean
  price: number | null
  created_at: string
  track_inventory: boolean
  allow_backorder: boolean
  low_stock_threshold: number | null
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
  discount_value?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
}

interface InventoryItem {
  id: string
  product_id: string
  branch_id: string | null
  store_id: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  low_stock_threshold: number
  warehouse_location: string | null
  product: Product
  branch?: StoreBranch
}

interface StoreBranch {
  id: string
  store_id: string
  name: string
  name_ar: string | null
  code: string | null
  address: string | null
  city: string | null
  is_main_branch: boolean
  is_active: boolean
}

interface InventoryTransaction {
  id: string
  product_id: string
  transaction_type: string
  quantity_change: number
  quantity_before: number
  quantity_after: number
  notes: string | null
  created_at: string
  product: Product
  branch?: StoreBranch
}

type AdjustmentType = 'add' | 'remove' | 'set'

// Animated Tabs List Component
function AnimatedTabsList({ activeTab, branchesCount }: { activeTab: string; branchesCount: number }) {
  const tabsRef = React.useRef<(HTMLButtonElement | null)[]>([])
  const [tabDimensions, setTabDimensions] = React.useState({ left: 0, width: 0 })

  const tabs = [
    { value: 'stock', label: 'Stock Levels', icon: Package, count: null },
    { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft, count: null },
    { value: 'branches', label: 'Branches', icon: Building2, count: branchesCount },
    { value: 'history', label: 'History', icon: History, count: null },
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
  }, [activeTab, branchesCount])

  return (
    <TabsList className="flex-shrink-0 gap-1 p-1 relative bg-transparent">
      {/* Animated background */}
      <motion.div
        className="absolute h-[calc(100%-8px)] top-1 rounded-md bg-orange-50 dark:bg-orange-900/20"
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
      {tabs.map((tab, index) => (
        <TabsTrigger
          key={tab.value}
          ref={(el) => { tabsRef.current[index] = el }}
          value={tab.value}
          className="flex items-center gap-2 px-4 relative z-10 text-muted-foreground hover:text-[#F4610B] transition-colors data-[state=active]:bg-transparent data-[state=active]:text-[#F4610B] data-[state=active]:shadow-none"
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
          {tab.count !== null && tab.count > 0 && (
            <div className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-md bg-[#F4610B] text-white text-[10px] font-bold tabular-nums">
              {tab.count}
            </div>
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

export function InventoryContent() {
  const t = useTranslations()
  const { user } = useAuth()
  const { locale } = useLocale()
  const { setHeaderContent } = useHeader()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [products, setProducts] = React.useState<Product[]>([])
  const [inventory, setInventory] = React.useState<InventoryItem[]>([])
  const [branches, setBranches] = React.useState<StoreBranch[]>([])
  const [transactions, setTransactions] = React.useState<InventoryTransaction[]>([])
  const [storeId, setStoreId] = React.useState<string | null>(null)
  const [storeName, setStoreName] = React.useState<string>("")
  const [activeTab, setActiveTab] = React.useState("stock")
  
  // Transaction filter state
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [dateFilter, setDateFilter] = React.useState("all")
  
  // Transaction sorting state
  const [txSortColumn, setTxSortColumn] = React.useState<string | null>(null)
  const [txSortDirection, setTxSortDirection] = React.useState<"asc" | "desc">("desc")
  
  // Expanded rows state for stock table
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null)
  
  // Stock filter state
  const [stockStatusFilter, setStockStatusFilter] = React.useState("all")
  const [stockBranchFilter, setStockBranchFilter] = React.useState("all")
  
  // Stock sorting state
  const [stockSortColumn, setStockSortColumn] = React.useState<string | null>(null)
  const [stockSortDirection, setStockSortDirection] = React.useState<"asc" | "desc">("asc")
  
  // Column visibility state for stock table
  const [stockColumnVisibility, setStockColumnVisibility] = React.useState({
    onHand: true,
    reserved: true,
    available: true,
    status: true,
  })

  // Animation state for table rows
  const [shouldAnimateRows, setShouldAnimateRows] = React.useState(false)
  
  const toggleRowExpansion = (productId: string) => {
    setExpandedRow(prev => prev === productId ? null : productId)
  }
  
  // Helper functions for name display (needed for sorting)
  const getProductName = React.useCallback((product: Product | null | undefined) => {
    if (!product) return 'Unknown Product'
    if (locale === 'ar' && product.name_ar) return product.name_ar
    return product.name_en || 'Unnamed Product'
  }, [locale])

  const getBranchName = React.useCallback((branch: StoreBranch | null | undefined) => {
    if (!branch) return 'Main Branch'
    if (branch.is_main_branch) return 'Main Branch'
    const branchDisplayName = locale === 'ar' && branch.name_ar ? branch.name_ar : (branch.name || 'Unknown Branch')
    return branchDisplayName
  }, [locale])
  
  // Filtered and sorted products for stock table
  const filteredProducts = React.useMemo(() => {
    let filtered = products
    
    // Apply branch filter
    if (stockBranchFilter !== "all") {
      filtered = filtered.filter(product => {
        const productInventory = inventory.filter(i => i.product_id === product.id)
        if (stockBranchFilter === "main") {
          return productInventory.some(i => !i.branch_id || i.branch_id === null)
        }
        return productInventory.some(i => i.branch_id === stockBranchFilter)
      })
    }
    
    // Apply status filter
    if (stockStatusFilter !== "all") {
      filtered = filtered.filter(product => {
        const inv = inventory.filter(i => i.product_id === product.id)
        const totalAvailable = inv.reduce((sum, i) => sum + (i.available_quantity || 0), 0)
        const threshold = product.low_stock_threshold || 10
        
        switch (stockStatusFilter) {
          case "in-stock":
            return totalAvailable > threshold
          case "low-stock":
            return totalAvailable > 0 && totalAvailable <= threshold
          case "out-of-stock":
            return totalAvailable === 0
          default:
            return true
        }
      })
    }
    
    // Skip sorting if no column is selected (neutral state)
    if (!stockSortColumn) {
      return filtered
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      
      // Get inventory data for comparison
      const invA = inventory.filter(i => i.product_id === a.id)
      const invB = inventory.filter(i => i.product_id === b.id)
      const totalOnHandA = invA.reduce((sum, i) => sum + (i.quantity || 0), 0)
      const totalOnHandB = invB.reduce((sum, i) => sum + (i.quantity || 0), 0)
      const totalReservedA = invA.reduce((sum, i) => sum + (i.reserved_quantity || 0), 0)
      const totalReservedB = invB.reduce((sum, i) => sum + (i.reserved_quantity || 0), 0)
      const totalAvailableA = invA.reduce((sum, i) => sum + (i.available_quantity || 0), 0)
      const totalAvailableB = invB.reduce((sum, i) => sum + (i.available_quantity || 0), 0)
      
      switch (stockSortColumn) {
        case "product":
          comparison = getProductName(a).localeCompare(getProductName(b))
          break
        case "onHand":
          comparison = totalOnHandA - totalOnHandB
          break
        case "reserved":
          comparison = totalReservedA - totalReservedB
          break
        case "available":
          comparison = totalAvailableA - totalAvailableB
          break
        case "status":
          // Sort by status: Out of Stock < Low Stock < In Stock
          const getStatusOrder = (available: number, threshold: number) => {
            if (available === 0) return 0
            if (available <= threshold) return 1
            return 2
          }
          const statusA = getStatusOrder(totalAvailableA, a.low_stock_threshold || 10)
          const statusB = getStatusOrder(totalAvailableB, b.low_stock_threshold || 10)
          comparison = statusA - statusB
          break
        default:
          comparison = 0
      }
      
      return stockSortDirection === "asc" ? comparison : -comparison
    })
    
    return sorted
  }, [products, inventory, stockStatusFilter, stockBranchFilter, stockSortColumn, stockSortDirection])
  
  // Handle stock sorting - cycles through: null → asc → desc → null
  const handleStockSort = (column: string) => {
    if (stockSortColumn === column) {
      if (stockSortDirection === "asc") {
        setStockSortDirection("desc")
      } else {
        // Reset to neutral
        setStockSortColumn(null)
        setStockSortDirection("asc")
      }
    } else {
      setStockSortColumn(column)
      setStockSortDirection("asc")
    }
  }
  
  const hasActiveStockFilters = stockStatusFilter !== "all" || stockBranchFilter !== "all"
  const activeStockFilterCount = [
    stockStatusFilter !== "all",
    stockBranchFilter !== "all"
  ].filter(Boolean).length
  
  const clearAllStockFilters = () => {
    setStockStatusFilter("all")
    setStockBranchFilter("all")
  }

  // Trigger animation when filtered products change
  React.useEffect(() => {
    if (filteredProducts.length > 0 && !isLoading) {
      setShouldAnimateRows(true)
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setShouldAnimateRows(false)
      }, 1000) // Allow time for all rows to animate
      return () => clearTimeout(timer)
    }
  }, [filteredProducts.length, isLoading])
  
  // Filtered and sorted transactions
  const filteredTransactions = React.useMemo(() => {
    let filtered = transactions
    
    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(tx => tx.transaction_type === typeFilter)
    }
    
    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date()
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at)
        switch (dateFilter) {
          case "today":
            return txDate.toDateString() === now.toDateString()
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return txDate >= weekAgo
          case "month":
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
          default:
            return true
        }
      })
    }
    
    // Skip sorting if no column is selected (neutral state)
    if (!txSortColumn) {
      return filtered
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      
      switch (txSortColumn) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "product":
          comparison = getProductName(a.product).localeCompare(getProductName(b.product))
          break
        case "branch":
          comparison = getBranchName(a.branch).localeCompare(getBranchName(b.branch))
          break
        case "type":
          comparison = a.transaction_type.localeCompare(b.transaction_type)
          break
        case "change":
          comparison = a.quantity_change - b.quantity_change
          break
        case "notes":
          comparison = (a.notes || "").localeCompare(b.notes || "")
          break
        default:
          comparison = 0
      }
      
      return txSortDirection === "asc" ? comparison : -comparison
    })
    
    return sorted
  }, [transactions, typeFilter, dateFilter, txSortColumn, txSortDirection])
  
  // Handle transaction sorting - cycles through: null → asc → desc → null
  const handleTxSort = (column: string) => {
    if (txSortColumn === column) {
      if (txSortDirection === "asc") {
        setTxSortDirection("desc")
      } else {
        // Reset to neutral
        setTxSortColumn(null)
        setTxSortDirection("asc")
      }
    } else {
      setTxSortColumn(column)
      setTxSortDirection("asc")
    }
  }
  
  // Adjustment dialog state
  const [adjustmentDialog, setAdjustmentDialog] = React.useState(false)
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [selectedBranch, setSelectedBranch] = React.useState<string>("")
  const [adjustmentType, setAdjustmentType] = React.useState<AdjustmentType>("add")
  const [adjustmentQuantity, setAdjustmentQuantity] = React.useState("")
  const [adjustmentNotes, setAdjustmentNotes] = React.useState("")
  const [isAdjusting, setIsAdjusting] = React.useState(false)

  // Branch dialog state
  const [branchDialog, setBranchDialog] = React.useState(false)
  const [editingBranch, setEditingBranch] = React.useState<StoreBranch | null>(null)
  
  const [branchForm, setBranchForm] = React.useState({
    name: "",
    name_ar: "",
    code: "",
    address: "",
    city: "",
    is_main_branch: false
  })
  const [isSavingBranch, setIsSavingBranch] = React.useState(false)
  
  // Branch preview dialog state
  const [branchPreviewDialog, setBranchPreviewDialog] = React.useState(false)
  const [previewingBranch, setPreviewingBranch] = React.useState<StoreBranch | null>(null)

  const fetchData = React.useCallback(async () => {
    if (!user?.id) return

    try {
      // Get business profile and store
      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('id, store_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!businessProfile?.store_id) {
        setProducts([])
        setInventory([])
        setBranches([])
        return
      }

      setStoreId(businessProfile.store_id)

      // Fetch store name
      const { data: storeData } = await supabase
        .from('stores')
        .select('name')
        .eq('id', businessProfile.store_id)
        .maybeSingle()
      
      setStoreName(storeData?.name || "Store")

      // Fetch products with inventory columns
      // Try to fetch with classification fields first
      let productsData: any[] | null = null
      let productsError: any = null
      
      const { data: fullData, error: fullError } = await supabase
        .from('products')
        .select('id, name_en, name_ar, sku, image_url, is_available, price, created_at, track_inventory, allow_backorder, low_stock_threshold, product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels')
        .eq('store_id', businessProfile.store_id)
        .eq('is_active', true)
        .order('name_en', { ascending: true })

      if (fullError) {
        console.warn('Error fetching products with classification fields (migration may not be run yet):', fullError)
        // Fallback to basic columns if new columns don't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select('id, name_en, name_ar, sku, image_url, is_available, price, created_at, track_inventory, allow_backorder, low_stock_threshold, product_type, selling_method, selling_unit, fulfillment_type, requires_scheduling, subscription_interval, sales_channels')
          .eq('store_id', businessProfile.store_id)
          .eq('is_active', true)
          .order('name_en', { ascending: true })
        
        if (fallbackError) {
          console.error('Error fetching products (fallback also failed):', fallbackError)
          productsError = fallbackError
        } else {
          // Map fallback data with default classification values
          productsData = (fallbackData || []).map(p => ({
            ...p,
            product_type: 'physical' as const,
            selling_method: 'unit' as const,
            selling_unit: null,
            fulfillment_type: ['pickup'] as ('pickup' | 'delivery' | 'digital' | 'onsite')[],
            requires_scheduling: false,
            subscription_interval: null
          }))
        }
      } else {
        productsData = fullData || []
      }

      if (productsError) {
        console.error('Failed to fetch products:', productsError)
        setProducts([])
      } else {
        setProducts((productsData || []) as Product[])
      }

      // Fetch branches (table may not exist yet if migration hasn't run)
      try {
        const { data: branchesData, error: branchesError } = await supabase
          .from('store_branches')
          .select('*')
          .eq('store_id', businessProfile.store_id)
          .eq('is_active', true)
          .order('is_main_branch', { ascending: false })

        if (!branchesError) {
          setBranches(branchesData || [])
        }
      } catch {
        // Table doesn't exist yet - migration needs to be run
        setBranches([])
      }

      // Fetch inventory with product and branch info (table may not exist yet)
      try {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select(`
            *,
            product:products(id, name_en, name_ar, sku, image_url, is_available, price),
            branch:store_branches(id, name, name_ar, code, is_main_branch)
          `)
          .eq('store_id', businessProfile.store_id)

        if (!inventoryError && inventoryData) {
          setInventory(inventoryData as unknown as InventoryItem[])
        }
      } catch {
        // Table doesn't exist yet
        setInventory([])
      }

      // Fetch recent transactions (table may not exist yet)
      try {
        // First try simple query to check if table exists
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('inventory_transactions')
          .select('*')
          .eq('store_id', businessProfile.store_id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError.message || transactionsError.code || JSON.stringify(transactionsError))
          setTransactions([])
        } else {
          console.log('Fetched transactions:', transactionsData?.length || 0)
          
          // If we have transactions, fetch related product/branch data
          if (transactionsData && transactionsData.length > 0) {
            // Get unique product IDs
            const productIds = [...new Set(transactionsData.map(t => t.product_id))]
            const { data: productsData } = await supabase
              .from('products')
              .select('id, name_en, name_ar, sku, image_url')
              .in('id', productIds)
            
            // Get unique branch IDs (filter out nulls)
            const branchIds = [...new Set(transactionsData.map(t => t.branch_id).filter(Boolean))]
            let branchesData: any[] = []
            if (branchIds.length > 0) {
              const { data } = await supabase
                .from('store_branches')
                .select('id, name, name_ar, code')
                .in('id', branchIds)
              branchesData = data || []
            }
            
            // Map the data
            const mappedTransactions = transactionsData.map(t => ({
              ...t,
              product: productsData?.find(p => p.id === t.product_id) || null,
              branch: branchesData?.find(b => b.id === t.branch_id) || null
            }))
            
            setTransactions(mappedTransactions as unknown as InventoryTransaction[])
          } else {
            setTransactions([])
          }
        }
      } catch (err) {
        console.error('Transactions fetch failed:', err)
        setTransactions([])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user?.id])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = React.useCallback(() => {
    setIsRefreshing(true)
    fetchData()
  }, [fetchData])

  // Format quantity based on selling method
  const formatQuantity = (quantity: number, product: Product) => {
    if (!product.selling_method || product.selling_method === 'unit') {
      return quantity.toLocaleString()
    }
    const unit = product.selling_unit || ''
    return `${quantity.toLocaleString()} ${unit}`
  }

  // Get inventory for a product (aggregated across branches or per branch)
  // Now includes ALL branches, even those without inventory records (showing 0)
  const getProductInventory = (productId: string) => {
    const existingItems = inventory.filter(i => i.product_id === productId)
    const totalQuantity = existingItems.reduce((sum, i) => sum + (i.quantity || 0), 0)
    const totalReserved = existingItems.reduce((sum, i) => sum + (i.reserved_quantity || 0), 0)
    const totalAvailable = existingItems.reduce((sum, i) => sum + (i.available_quantity || 0), 0)
    
    // Create items for ALL branches, including those without inventory
    const items = branches.map(branch => {
      const existingItem = existingItems.find(i => i.branch_id === branch.id)
      if (existingItem) {
        return existingItem
      }
      // Return a placeholder for branches without inventory
      return {
        product_id: productId,
        branch_id: branch.id,
        branch: branch,
        quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0
      }
    })
    
    return { totalQuantity, totalReserved, totalAvailable, items }
  }

  // Calculate stats (only for products that track inventory)
  const stats = React.useMemo(() => {
    const total = products.length
    const trackedProducts = products.filter(p => p.track_inventory !== false)
    
    const withInventory = trackedProducts.filter(p => {
      const inv = getProductInventory(p.id)
      return inv.totalAvailable > 0
    }).length
    
    const lowStock = trackedProducts.filter(p => {
      const inv = getProductInventory(p.id)
      const threshold = p.low_stock_threshold || 10
      return inv.totalAvailable > 0 && inv.totalAvailable <= threshold
    }).length
    
    const outOfStock = trackedProducts.filter(p => {
      const inv = getProductInventory(p.id)
      return inv.totalAvailable === 0
    }).length

    return { total, withInventory, lowStock, outOfStock }
  }, [products, inventory])

  // Set header content
  React.useEffect(() => {
    setHeaderContent({
      title: 'Inventory Management',
      count: stats.total,
      searchPlaceholder: 'Search products...',
      searchValue: '',
      onSearch: () => {},
    })

    return () => {
      setHeaderContent(null)
    }
  }, [stats.total, setHeaderContent])

  // Get available quantity for selected product and branch
  const getAvailableQuantity = React.useCallback(() => {
    if (!selectedProduct) return 0
    
    const productInventoryItems = inventory.filter(inv => inv.product_id === selectedProduct.id)
    if (productInventoryItems.length === 0) return 0
    
    // If no branch selected, return main store quantity (where branch_id is null)
    if (!selectedBranch) {
      const mainItem = productInventoryItems.find(item => !item.branch_id)
      return mainItem?.available_quantity || 0
    }
    
    // Find the specific branch
    const branchItem = productInventoryItems.find(item => item.branch_id === selectedBranch)
    return branchItem?.available_quantity || 0
  }, [selectedProduct, selectedBranch, inventory])

  const availableQuantity = getAvailableQuantity()

  // Handle stock adjustment
  const handleAdjustStock = async () => {
    if (!selectedProduct || !storeId || !adjustmentQuantity) return

    setIsAdjusting(true)
    try {
      const quantity = parseInt(adjustmentQuantity)
      if (isNaN(quantity) || quantity <= 0) {
        alert('Please enter a valid quantity')
        setIsAdjusting(false)
        return
      }

      // Validate removal doesn't exceed available quantity
      if (adjustmentType === 'remove' && quantity > availableQuantity) {
        alert(`Cannot remove ${quantity} units. Only ${availableQuantity} units available in this branch.`)
        setIsAdjusting(false)
        return
      }

      let quantityChange = quantity
      if (adjustmentType === 'remove') {
        quantityChange = -quantity
      }

      const branchId = selectedBranch || null

      // Try to use the inventory system if migration has been run
      try {
        // First check if inventory table exists by trying to query it
        const { error: checkError } = await supabase
          .from('inventory')
          .select('id')
          .limit(1)

        if (checkError) {
          // Inventory table doesn't exist - use simple is_available toggle
          const newAvailable = adjustmentType === 'add' ? true : quantity === 0 ? false : selectedProduct.is_available
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ is_available: newAvailable })
            .eq('id', selectedProduct.id)

          if (updateError) {
            console.error('Error updating product:', updateError)
            alert('Failed to update product availability')
            return
          }
        } else {
          // Inventory table exists - try to use the RPC function
          const { error: rpcError } = await supabase.rpc('adjust_inventory', {
            p_product_id: selectedProduct.id,
            p_branch_id: branchId,
            p_store_id: storeId,
            p_quantity_change: quantityChange,
            p_transaction_type: adjustmentType === 'add' ? 'purchase' : 'adjustment',
            p_notes: adjustmentNotes || null
          })

          if (rpcError) {
            // RPC might not exist - try direct insert/update
            console.warn('RPC not available, using direct update:', rpcError)
            
            // Check if inventory record exists
            const { data: existingInv } = await supabase
              .from('inventory')
              .select('id, quantity')
              .eq('product_id', selectedProduct.id)
              .eq('store_id', storeId)
              .is('branch_id', branchId)
              .maybeSingle()

            let inventoryId = existingInv?.id
            const quantityBefore = existingInv?.quantity || 0
            const quantityAfter = Math.max(0, quantityBefore + quantityChange)

            if (existingInv) {
              // Update existing
              await supabase
                .from('inventory')
                .update({ quantity: quantityAfter })
                .eq('id', existingInv.id)
            } else {
              // Create new
              const { data: newInv } = await supabase
                .from('inventory')
                .insert({
                  product_id: selectedProduct.id,
                  branch_id: branchId,
                  store_id: storeId,
                  quantity: Math.max(0, quantityChange)
                })
                .select('id')
                .single()
              inventoryId = newInv?.id
            }

            // Create transaction record manually
            if (inventoryId) {
              await supabase
                .from('inventory_transactions')
                .insert({
                  inventory_id: inventoryId,
                  product_id: selectedProduct.id,
                  branch_id: branchId,
                  store_id: storeId,
                  transaction_type: adjustmentType === 'add' ? 'purchase' : 'adjustment',
                  quantity_change: quantityChange,
                  quantity_before: quantityBefore,
                  quantity_after: quantityAfter,
                  notes: adjustmentNotes || null,
                  performed_by: user?.id
                })
            }
          }
        }
      } catch {
        // Fallback: just update is_available
        const newAvailable = adjustmentType === 'add'
        await supabase
          .from('products')
          .update({ is_available: newAvailable })
          .eq('id', selectedProduct.id)
      }

      // Refresh data
      await fetchData()
      setAdjustmentDialog(false)
      resetAdjustmentForm()
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred')
    } finally {
      setIsAdjusting(false)
    }
  }

  const resetAdjustmentForm = () => {
    setSelectedProduct(null)
    setSelectedBranch("")
    setAdjustmentType("add")
    setAdjustmentQuantity("")
    setAdjustmentNotes("")
  }

  const openAdjustmentDialog = (product: Product) => {
    setSelectedProduct(product)
    // Set default branch to main branch or first branch
    const mainBranch = branches.find(b => b.is_main_branch) || branches[0]
    setSelectedBranch(mainBranch?.id || "")
    setAdjustmentDialog(true)
  }

  // Handle branch save
  const handleSaveBranch = async () => {
    if (!storeId || !branchForm.name) return

    setIsSavingBranch(true)
    try {
      if (editingBranch) {
        // Update existing branch
        const { error } = await supabase
          .from('store_branches')
          .update({
            name: branchForm.name,
            name_ar: branchForm.name_ar || null,
            code: branchForm.code || null,
            address: branchForm.address || null,
            city: branchForm.city || null,
            is_main_branch: branchForm.is_main_branch
          })
          .eq('id', editingBranch.id)

        if (error) throw error
      } else {
        // Create new branch
        const { error } = await supabase
          .from('store_branches')
          .insert({
            store_id: storeId,
            name: branchForm.name,
            name_ar: branchForm.name_ar || null,
            code: branchForm.code || null,
            address: branchForm.address || null,
            city: branchForm.city || null,
            is_main_branch: branchForm.is_main_branch
          })

        if (error) throw error
      }

      await fetchData()
      setBranchDialog(false)
      setEditingBranch(null)
      setBranchForm({ name: "", name_ar: "", code: "", address: "", city: "", is_main_branch: false })
    } catch (error: unknown) {
      console.error('Error saving branch:', error)
      // Check if it's a "table doesn't exist" error
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
        alert('Branch management requires running the database migration first. Please contact your administrator.')
      } else {
        alert('Failed to save branch')
      }
    } finally {
      setIsSavingBranch(false)
    }
  }

  const openBranchDialog = (branch?: StoreBranch) => {
    if (branch) {
      setEditingBranch(branch)
      setBranchForm({
        name: branch.name,
        name_ar: branch.name_ar || "",
        code: branch.code || "",
        address: branch.address || "",
        city: branch.city || "",
        is_main_branch: branch.is_main_branch
      })
    } else {
      setEditingBranch(null)
      setBranchForm({ name: "", name_ar: "", code: "", address: "", city: "", is_main_branch: false })
    }
    setBranchDialog(true)
  }

  const openBranchPreview = (branch: StoreBranch) => {
    setPreviewingBranch(branch)
    setBranchPreviewDialog(true)
  }

  const handleDeleteBranch = async (branch: StoreBranch) => {
    // Prevent deletion of main branch
    if (branch.is_main_branch) {
      alert('Cannot delete the main branch. Every store must have a main branch.')
      return
    }

    if (!confirm(`Are you sure you want to delete "${getBranchName(branch)}"? This action cannot be undone and all inventory for this branch will be removed.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('store_branches')
        .delete()
        .eq('id', branch.id)

      if (error) {
        // Handle the trigger-generated error
        if (error.message?.includes('main branch')) {
          alert('Cannot delete the main branch. Every store must have a main branch.')
          return
        }
        throw error
      }

      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error deleting branch:', error)
      alert('Failed to delete branch. It may have associated inventory.')
    }
  }

  // Get products with stock for a specific branch
  const getBranchProducts = React.useMemo(() => {
    if (!previewingBranch) return []
    
    return products.map(product => {
      const branchInventory = inventory.find(
        i => i.product_id === product.id && i.branch_id === previewingBranch.id
      )
      return {
        product,
        quantity: branchInventory?.quantity || 0,
        reserved: branchInventory?.reserved_quantity || 0,
        available: branchInventory?.available_quantity || 0
      }
    }).sort((a, b) => b.available - a.available)
  }, [previewingBranch, products, inventory])

  // Calculate branch stats
  const getBranchStats = React.useMemo(() => {
    if (!previewingBranch) return { total: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalQuantity: 0 }
    
    const branchProducts = getBranchProducts
    const total = branchProducts.length
    const inStock = branchProducts.filter(p => p.available > 0 && p.available > (p.product.low_stock_threshold || 10)).length
    const lowStock = branchProducts.filter(p => p.available > 0 && p.available <= (p.product.low_stock_threshold || 10)).length
    const outOfStock = branchProducts.filter(p => p.available === 0).length
    const totalQuantity = branchProducts.reduce((sum, p) => sum + p.quantity, 0)
    
    return { total, inStock, lowStock, outOfStock, totalQuantity }
  }, [getBranchProducts, previewingBranch])


  if (isLoading) {
    return (
      <div className="space-y-6 h-full flex flex-col min-h-0">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-4 flex-shrink-0 p-4 -m-4 mb-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-3xl bg-muted/40 p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex gap-2 flex-shrink-0 mb-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>

          {/* Table Skeleton */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Search and controls */}
            <div className="flex items-center py-4 flex-shrink-0">
              <Skeleton className="h-10 w-64" />
              <div className="ml-auto flex items-center gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index} className="border-0 hover:bg-transparent">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-12 w-12" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      {/* Tabs wrapping everything */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        {/* Tabs on the left */}
        <div className="flex items-center flex-shrink-0 pb-4">
          <AnimatedTabsList activeTab={activeTab} branchesCount={branches.length} />
        </div>

        {/* Stock Levels Tab */}
        <TabsContent value="stock" className="flex-1 min-h-0 overflow-visible flex flex-col mt-6 space-y-6">
          {/* Stats Cards - Only for Stock Levels */}
          <div className="grid gap-4 md:grid-cols-4 flex-shrink-0">
            <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Products</p>
                    <p className="text-3xl font-bold mt-1">{stats.total}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
                    <Package className="h-6 w-6 text-blue-400 group-hover:text-blue-500 transition-colors duration-200" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">In Stock</p>
                    <p className="text-3xl font-bold mt-1">{stats.withInventory}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-green-100 dark:group-hover:bg-green-900/30">
                    <TrendingUp className="h-6 w-6 text-green-400 group-hover:text-green-500 transition-colors duration-200" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Low Stock</p>
                    <p className="text-3xl font-bold mt-1">{stats.lowStock}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30">
                    <AlertTriangle className="h-6 w-6 text-amber-400 group-hover:text-amber-500 transition-colors duration-200" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 transition-all duration-200 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                    <p className="text-3xl font-bold mt-1">{stats.outOfStock}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-red-100 dark:group-hover:bg-red-900/30">
                    <TrendingDown className="h-6 w-6 text-red-400 group-hover:text-red-500 transition-colors duration-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stock Table */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-lg flex-1">
              <Package className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-muted-foreground font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">Add products to start tracking inventory</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col flex-1 min-h-0">
              {/* Header with Filters */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {/* Column Visibility Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 rounded-lg bg-gray-50 hover:bg-gray-100 border-0"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={stockColumnVisibility.onHand}
                        onCheckedChange={(checked) => setStockColumnVisibility(prev => ({ ...prev, onHand: checked }))}
                      >
                        On Hand
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={stockColumnVisibility.reserved}
                        onCheckedChange={(checked) => setStockColumnVisibility(prev => ({ ...prev, reserved: checked }))}
                      >
                        Reserved
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={stockColumnVisibility.available}
                        onCheckedChange={(checked) => setStockColumnVisibility(prev => ({ ...prev, available: checked }))}
                      >
                        Available
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={stockColumnVisibility.status}
                        onCheckedChange={(checked) => setStockColumnVisibility(prev => ({ ...prev, status: checked }))}
                      >
                        Status
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Status Filter */}
                  <div className="relative">
                    <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                      <SelectTrigger className={cn(
                        "h-10 w-[130px] rounded-lg border-0 text-sm font-medium hover:bg-gray-100 shadow-none",
                        stockStatusFilter !== "all" 
                          ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20 [&_svg]:!text-[#F4610B] [&_svg]:!opacity-100" 
                          : "bg-gray-50 text-gray-700"
                      )}>
                        <SelectValue>
                          {stockStatusFilter === "all" ? "All Status" :
                           stockStatusFilter === "in-stock" ? "In Stock" :
                           stockStatusFilter === "low-stock" ? "Low Stock" : "Out of Stock"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                        <SelectItem value="all" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">All Status</SelectItem>
                        <SelectItem value="in-stock" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">In Stock</SelectItem>
                        <SelectItem value="low-stock" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Low Stock</SelectItem>
                        <SelectItem value="out-of-stock" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    {stockStatusFilter !== "all" && (
                      <button
                        onClick={() => setStockStatusFilter("all")}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#F4610B] text-white flex items-center justify-center hover:bg-[#d9560a] transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  {/* Branch Filter */}
                  <div className="relative">
                    <Select value={stockBranchFilter} onValueChange={setStockBranchFilter}>
                      <SelectTrigger className={cn(
                        "h-10 w-[140px] rounded-lg border-0 text-sm font-medium hover:bg-gray-100 shadow-none",
                        stockBranchFilter !== "all" 
                          ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20 [&_svg]:!text-[#F4610B] [&_svg]:!opacity-100" 
                          : "bg-gray-50 text-gray-700"
                      )}>
                        <SelectValue>
                          {stockBranchFilter === "all" ? "All Branches" :
                           stockBranchFilter === "main" ? "Main Store" :
                           getBranchName(branches.find(b => b.id === stockBranchFilter))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                        <SelectItem value="all" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">All Branches</SelectItem>
                        <SelectItem value="main" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Main Store</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem 
                            key={branch.id} 
                            value={branch.id}
                            className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white"
                          >
                            {getBranchName(branch)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {stockBranchFilter !== "all" && (
                      <button
                        onClick={() => setStockBranchFilter("all")}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#F4610B] text-white flex items-center justify-center hover:bg-[#d9560a] transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  {/* Clear All Filters Button */}
                  {activeStockFilterCount > 1 && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllStockFilters}
                            className="h-10 w-10 p-0 rounded-lg border-0 bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B] hover:text-white transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                          Clear all filters
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className="h-10 w-10 p-0 rounded-lg bg-gray-50 hover:bg-gray-100 border-0"
                        >
                          <RefreshCw className={cn("h-4 w-4 text-gray-500", isRefreshing && "animate-spin")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                        Refresh
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              {/* Table */}
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="border-b border-gray-100 hover:bg-transparent">
                      <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12 w-12 rounded-tl-lg"></TableHead>
                      <TableHead className="bg-gray-50 h-12 p-1">
                        <div 
                          className={cn(
                            "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                            stockSortColumn === "product" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => handleStockSort("product")}
                        >
                          <GripVertical className={cn(
                            "h-4 w-4",
                            stockSortColumn === "product" ? "text-[#F4610B]" : "text-gray-300"
                          )} />
                          Product
                          {stockSortColumn === "product" ? (
                            stockSortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      {stockColumnVisibility.onHand && (
                        <TableHead className="bg-gray-50 h-12 p-1">
                          <div 
                            className={cn(
                              "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                              stockSortColumn === "onHand" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => handleStockSort("onHand")}
                          >
                            <GripVertical className={cn(
                              "h-4 w-4",
                              stockSortColumn === "onHand" ? "text-[#F4610B]" : "text-gray-300"
                            )} />
                            On Hand
                            {stockSortColumn === "onHand" ? (
                              stockSortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                              ) : (
                                <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                            )}
                          </div>
                        </TableHead>
                      )}
                      {stockColumnVisibility.reserved && (
                        <TableHead className="bg-gray-50 h-12 p-1">
                          <div 
                            className={cn(
                              "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                              stockSortColumn === "reserved" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => handleStockSort("reserved")}
                          >
                            <GripVertical className={cn(
                              "h-4 w-4",
                              stockSortColumn === "reserved" ? "text-[#F4610B]" : "text-gray-300"
                            )} />
                            Reserved
                            {stockSortColumn === "reserved" ? (
                              stockSortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                              ) : (
                                <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                            )}
                          </div>
                        </TableHead>
                      )}
                      {stockColumnVisibility.available && (
                        <TableHead className="bg-gray-50 h-12 p-1">
                          <div 
                            className={cn(
                              "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                              stockSortColumn === "available" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => handleStockSort("available")}
                          >
                            <GripVertical className={cn(
                              "h-4 w-4",
                              stockSortColumn === "available" ? "text-[#F4610B]" : "text-gray-300"
                            )} />
                            Available
                            {stockSortColumn === "available" ? (
                              stockSortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                              ) : (
                                <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                            )}
                          </div>
                        </TableHead>
                      )}
                      {stockColumnVisibility.status && (
                        <TableHead className="bg-gray-50 h-12 p-1">
                          <div 
                            className={cn(
                              "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                              stockSortColumn === "status" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                            )}
                            onClick={() => handleStockSort("status")}
                          >
                            <GripVertical className={cn(
                              "h-4 w-4",
                              stockSortColumn === "status" ? "text-[#F4610B]" : "text-gray-300"
                            )} />
                            Status
                            {stockSortColumn === "status" ? (
                              stockSortDirection === "asc" ? (
                                <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                              ) : (
                                <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                            )}
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="bg-gray-50 text-gray-600 font-medium text-sm h-12 rounded-tr-lg"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, index) => {
                      const inv = getProductInventory(product.id)
                      const threshold = product.low_stock_threshold || 10
                      const isLow = inv.totalAvailable > 0 && inv.totalAvailable <= threshold
                      const isOut = inv.totalAvailable === 0
                      const isExpanded = expandedRow === product.id
                      const hasBranches = branches.length > 0
                      
                      return (
                        <React.Fragment key={product.id}>
                          <TableRow 
                            className={cn(
                              "transition-colors cursor-pointer group",
                              isExpanded ? "bg-gray-50 hover:bg-gray-50 shadow-[inset_0_4px_8px_-4px_rgba(0,0,0,0.05)] border-b-0" : "border-b border-gray-50 hover:bg-gray-50",
                              shouldAnimateRows && "animate-tableRowFadeIn"
                            )}
                            style={shouldAnimateRows ? {
                              animationDelay: `${Math.min(index, 20) * 30}ms`,
                              opacity: 0
                            } : undefined}
                            onClick={() => hasBranches && toggleRowExpansion(product.id)}
                          >
                            {/* Expand Button */}
                            <TableCell className="py-4 w-12">
                              {hasBranches ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleRowExpansion(product.id); }}
                                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-6" />
                              )}
                            </TableCell>
                            
                            {/* Product */}
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 flex-shrink-0">
                                  {product.image_url ? (
                                    <img src={product.image_url} alt={getProductName(product)} className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{getProductName(product)}</div>
                                  {product.sku && <div className="text-sm text-gray-500 font-mono mt-0.5">{product.sku}</div>}
                                </div>
                              </div>
                            </TableCell>
                            
                            {/* On Hand */}
                            {stockColumnVisibility.onHand && (
                              <TableCell className="py-4">
                                <span className="font-semibold">
                                  {formatQuantity(inv.totalQuantity, product)}
                                </span>
                              </TableCell>
                            )}
                            
                            {/* Reserved */}
                            {stockColumnVisibility.reserved && (
                              <TableCell className="py-4">
                                <span className="text-gray-500">
                                  {formatQuantity(inv.totalReserved, product)}
                                </span>
                              </TableCell>
                            )}
                            
                            {/* Available */}
                            {stockColumnVisibility.available && (
                              <TableCell className="py-4">
                                <span className={cn(
                                  "font-semibold",
                                  isOut && "text-red-600",
                                  isLow && !isOut && "text-amber-600"
                                )}>
                                  {formatQuantity(inv.totalAvailable, product)}
                                </span>
                              </TableCell>
                            )}
                            
                            {/* Status */}
                            {stockColumnVisibility.status && (
                              <TableCell className="py-4">
                                {isOut ? (
                                  <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 rounded-full">Out of Stock</Badge>
                                ) : isLow ? (
                                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-full">Low Stock</Badge>
                                ) : (
                                  <Badge className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 rounded-full">In Stock</Badge>
                                )}
                              </TableCell>
                            )}
                            
                            {/* Actions */}
                            <TableCell className="py-4">
                              {/* Only show Edit Stock for physical products */}
                              {product.product_type !== 'digital' && product.product_type !== 'service' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); openAdjustmentDialog(product); }}
                                  className="rounded-lg border-[#F4610B] bg-[#F4610B] text-white transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-[#d9560a]"
                                >
                                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                                  Edit Stock
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Branch Details */}
                          <AnimatePresence>
                            {isExpanded && hasBranches && (
                              <TableRow className="bg-gray-50 hover:bg-gray-50 border-b-0 shadow-[inset_0_-4px_8px_-4px_rgba(0,0,0,0.05)]">
                                <TableCell colSpan={3 + Object.values(stockColumnVisibility).filter(Boolean).length} className="py-0 px-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                  >
                                    <div className="py-3 pl-[60px] pr-4">
                                      {/* Sort branches: in-stock first, then low stock, then out of stock */}
                                      {(() => {
                                        const sortedItems = [...inv.items].sort((a, b) => {
                                          const aStatus = a.available_quantity === 0 ? 2 : a.available_quantity <= threshold ? 1 : 0
                                          const bStatus = b.available_quantity === 0 ? 2 : b.available_quantity <= threshold ? 1 : 0
                                          return aStatus - bStatus
                                        })
                                        const maxStock = Math.max(...inv.items.map(i => i.quantity), 1)
                                        
                                        return (
                                          <div className="flex gap-3 overflow-visible">
                                            {sortedItems.map((item, index) => {
                                              const branchIsOut = item.available_quantity === 0
                                              const branchIsLow = item.available_quantity > 0 && item.available_quantity <= threshold
                                              const stockPercent = Math.round((item.available_quantity / maxStock) * 100)
                                              
                                              return (
                                                <div 
                                                  key={index} 
                                                  className="bg-white rounded-xl p-3 shadow-[0_18px_35px_rgba(15,23,42,0.04)] transition-all duration-200 min-w-[160px] flex-1 hover:-translate-y-1"
                                                >
                                                  {/* Header with branch name and available count */}
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <div className={cn(
                                                        "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0",
                                                        branchIsOut ? "bg-red-50" : branchIsLow ? "bg-amber-50" : "bg-green-50"
                                                      )}>
                                                        <Building2 className={cn(
                                                          "h-3.5 w-3.5",
                                                          branchIsOut ? "text-red-500" : branchIsLow ? "text-amber-500" : "text-green-500"
                                                        )} />
                                                      </div>
                                                      <span className="font-medium text-gray-900 truncate text-sm">{getBranchName(item.branch)}</span>
                                                    </div>
                                      <div className={cn(
                                        "text-lg font-bold flex-shrink-0",
                                        branchIsOut ? "text-red-600" : branchIsLow ? "text-amber-600" : "text-green-600"
                                      )}>
                                        {formatQuantity(item.available_quantity, product)}
                                      </div>
                                                  </div>
                                                  
                                                  {/* Stock Bar */}
                                                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-2">
                                                    <div 
                                                      className={cn(
                                                        "h-full rounded-full transition-all",
                                                        branchIsOut ? "bg-red-400" : branchIsLow ? "bg-amber-400" : "bg-green-400"
                                                      )}
                                                      style={{ width: `${stockPercent}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  </motion.div>
                                </TableCell>
                              </TableRow>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  {filteredProducts.length} of {products.length} products
                  {hasActiveStockFilters && " (filtered)"}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Transfer Tab */}
        <TabsContent value="transfer" className="flex-1 min-h-0 overflow-visible mt-6">
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-orange-500" />
                Inventory Transfer
              </CardTitle>
              <CardDescription className="mt-1">
                Transfer stock between branches with drag-and-drop
              </CardDescription>
            </CardHeader>
            <CardContent>
              {storeId && (
                <InventoryTransfer
                  storeId={storeId}
                  branches={branches}
                  inventory={inventory}
                  products={products}
                  onTransferComplete={fetchData}
                  locale={locale}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="flex-1 min-h-0 overflow-auto mt-4">
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-none">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-xl font-bold">Store Branches</CardTitle>
                <CardDescription className="mt-1">Manage your store locations</CardDescription>
              </div>
              <Button onClick={() => openBranchDialog()} className="w-fit flex-none">
                <Plus className="mr-2 h-4 w-4" />
                Add Branch
              </Button>
            </CardHeader>
            <CardContent>
              {branches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No branches yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add branches to track inventory by location
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {branches.map((branch) => (
                    <Card 
                      key={branch.id} 
                      className="group relative rounded-3xl border-0 shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-1 cursor-pointer" 
                      onClick={() => openBranchPreview(branch)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center transition-all duration-200 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30">
                              <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-orange-500 transition-colors duration-200" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{getBranchName(branch)}</p>
                              {branch.code && <p className="text-sm text-muted-foreground font-mono">{branch.code}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {branch.is_main_branch && (
                              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-0">Main</Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                                <DropdownMenuItem 
                                  onClick={() => openBranchDialog(branch)}
                                  className="rounded-lg cursor-pointer data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {!branch.is_main_branch && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteBranch(branch)}
                                      className="rounded-lg cursor-pointer text-red-600 data-[highlighted]:bg-red-500 data-[highlighted]:text-white [&:hover_svg]:text-white [&:focus_svg]:text-white"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {branch.address && (
                          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{branch.address}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 min-h-0 overflow-hidden flex flex-col mt-4">
              {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center justify-center py-12 text-center flex-1">
              <History className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-2">
                    Stock adjustments will appear here
                  </p>
                </div>
              ) : (
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col flex-1 min-h-0">
              {/* Header Toolbar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {/* Column Visibility Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 rounded-lg bg-gray-50 hover:bg-gray-100 border-0"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={true}
                        disabled
                      >
                        Date
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={true}
                        disabled
                      >
                        Product
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={true}
                        disabled
                      >
                        Branch
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={true}
                        disabled
                      >
                        Type
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={true}
                        disabled
                      >
                        Change
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="capitalize rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white focus:bg-[#F4610B] focus:text-white focus:[&_svg]:!text-white"
                        checked={true}
                        disabled
                      >
                        Notes
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Type Filter */}
                  <div className="relative">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className={cn(
                        "h-10 w-[130px] rounded-lg border-0 text-sm font-medium hover:bg-gray-100 shadow-none",
                        typeFilter !== "all" 
                          ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20 [&_svg]:!text-[#F4610B] [&_svg]:!opacity-100" 
                          : "bg-gray-50 text-gray-700"
                      )}>
                        <SelectValue>
                          {typeFilter === "all" ? "All Types" :
                           typeFilter === "purchase" ? "Purchase" :
                           typeFilter === "sale" ? "Sale" :
                           typeFilter === "adjustment" ? "Adjustment" : "Transfer"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                        <SelectItem value="all" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">All Types</SelectItem>
                        <SelectItem value="purchase" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Purchase</SelectItem>
                        <SelectItem value="sale" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Sale</SelectItem>
                        <SelectItem value="adjustment" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Adjustment</SelectItem>
                        <SelectItem value="transfer" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    {typeFilter !== "all" && (
                      <button
                        onClick={() => setTypeFilter("all")}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#F4610B] text-white flex items-center justify-center hover:bg-[#d9560a] transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Date Filter */}
                  <div className="relative">
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className={cn(
                        "h-10 w-[140px] rounded-lg border-0 text-sm font-medium hover:bg-gray-100 shadow-none",
                        dateFilter !== "all" 
                          ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20 [&_svg]:!text-[#F4610B] [&_svg]:!opacity-100" 
                          : "bg-gray-50 text-gray-700"
                      )}>
                        <SelectValue>
                          {dateFilter === "all" ? "All Time" :
                           dateFilter === "today" ? "Today" :
                           dateFilter === "week" ? "This Week" : "This Month"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                        <SelectItem value="all" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">All Time</SelectItem>
                        <SelectItem value="today" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">Today</SelectItem>
                        <SelectItem value="week" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">This Week</SelectItem>
                        <SelectItem value="month" className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                    {dateFilter !== "all" && (
                      <button
                        onClick={() => setDateFilter("all")}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#F4610B] text-white flex items-center justify-center hover:bg-[#d9560a] transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Clear All Filters Button - only show when 2+ filters are active */}
                  {typeFilter !== "all" && dateFilter !== "all" && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTypeFilter("all")
                              setDateFilter("all")
                            }}
                            className="h-10 w-10 p-0 rounded-lg border-0 bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B] hover:text-white transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                          Clear all filters
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className="h-10 w-10 p-0 rounded-lg bg-gray-50 hover:bg-gray-100 border-0"
                        >
                          <RefreshCw className={cn("h-4 w-4 text-gray-500", isRefreshing && "animate-spin")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                        Refresh
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="border-b border-gray-100 hover:bg-transparent">
                      <TableHead className="bg-gray-50 h-12 p-1 rounded-tl-lg">
                        <div 
                          className={cn(
                            "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                            txSortColumn === "date" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => handleTxSort("date")}
                        >
                          <GripVertical className={cn(
                            "h-4 w-4",
                            txSortColumn === "date" ? "text-[#F4610B]" : "text-gray-300"
                          )} />
                          Date
                          {txSortColumn === "date" ? (
                            txSortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="bg-gray-50 h-12 p-1">
                        <div 
                          className={cn(
                            "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                            txSortColumn === "product" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => handleTxSort("product")}
                        >
                          <GripVertical className={cn(
                            "h-4 w-4",
                            txSortColumn === "product" ? "text-[#F4610B]" : "text-gray-300"
                          )} />
                          Product
                          {txSortColumn === "product" ? (
                            txSortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="bg-gray-50 h-12 p-1">
                        <div 
                          className={cn(
                            "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                            txSortColumn === "branch" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => handleTxSort("branch")}
                        >
                          <GripVertical className={cn(
                            "h-4 w-4",
                            txSortColumn === "branch" ? "text-[#F4610B]" : "text-gray-300"
                          )} />
                          Branch
                          {txSortColumn === "branch" ? (
                            txSortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="bg-gray-50 h-12 p-1">
                        <div 
                          className={cn(
                            "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                            txSortColumn === "type" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => handleTxSort("type")}
                        >
                          <GripVertical className={cn(
                            "h-4 w-4",
                            txSortColumn === "type" ? "text-[#F4610B]" : "text-gray-300"
                          )} />
                          Type
                          {txSortColumn === "type" ? (
                            txSortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="bg-gray-50 h-12 p-1">
                        <div 
                          className={cn(
                            "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                            txSortColumn === "change" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => handleTxSort("change")}
                        >
                          <GripVertical className={cn(
                            "h-4 w-4",
                            txSortColumn === "change" ? "text-[#F4610B]" : "text-gray-300"
                          )} />
                          Change
                          {txSortColumn === "change" ? (
                            txSortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="bg-gray-50 h-12 p-1 rounded-tr-lg">
                        <div 
                          className={cn(
                            "flex items-center gap-2 px-3 h-10 rounded-lg font-medium text-sm cursor-pointer transition-colors",
                            txSortColumn === "notes" ? "bg-[#F4610B]/10 text-[#F4610B] hover:bg-[#F4610B]/20" : "text-gray-600 hover:bg-gray-100"
                          )}
                          onClick={() => handleTxSort("notes")}
                        >
                          <GripVertical className={cn(
                            "h-4 w-4",
                            txSortColumn === "notes" ? "text-[#F4610B]" : "text-gray-300"
                          )} />
                          Notes
                          {txSortColumn === "notes" ? (
                            txSortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4 ml-auto text-[#F4610B]" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-auto text-[#F4610B]" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 ml-auto text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <TableCell className="py-4">
                          {(() => {
                            const date = new Date(tx.created_at)
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
                          })()}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 flex-shrink-0">
                              {tx.product?.image_url ? (
                                <img src={tx.product.image_url} alt={getProductName(tx.product)} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{getProductName(tx.product)}</div>
                              {tx.product?.sku && <div className="text-sm text-gray-500 font-mono mt-0.5">{tx.product.sku}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{getBranchName(tx.branch)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "capitalize text-xs font-medium px-3 py-1 rounded-full",
                              tx.transaction_type === 'purchase' && "bg-green-50 text-green-700 border-green-200",
                              tx.transaction_type === 'sale' && "bg-blue-50 text-blue-700 border-blue-200",
                              tx.transaction_type === 'adjustment' && "bg-amber-50 text-amber-700 border-amber-200",
                              tx.transaction_type === 'transfer' && "bg-purple-50 text-purple-700 border-purple-200"
                            )}
                          >
                            {tx.transaction_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "font-semibold py-4",
                          tx.quantity_change > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                        </TableCell>
                        <TableCell className="text-sm text-gray-400 truncate max-w-[200px] py-4">
                          {tx.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  {transactions.length} transactions
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Stock Dialog */}
      <Dialog open={adjustmentDialog} onOpenChange={setAdjustmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
            {selectedProduct && (
              <div className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-xl">
                <div className="h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-gray-100">
                  {selectedProduct.image_url ? (
                    <img 
                      src={selectedProduct.image_url} 
                      alt={getProductName(selectedProduct)} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{getProductName(selectedProduct)}</p>
                  {selectedProduct.sku && (
                    <p className="text-xs text-gray-500 font-mono">SKU: {selectedProduct.sku}</p>
                  )}
                </div>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Branch Row */}
            {branches.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
                        <p>Choose the branch location<br />where you want to adjust stock</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Label>Branch</Label>
                </div>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="rounded-lg border-gray-200">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="border-0 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id} className="rounded-lg data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white [&[data-highlighted]_svg]:!text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{getBranchName(branch)}</span>
                          {branch.is_main_branch && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">Main</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Available Stock Indicator */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  availableQuantity === 0 ? "bg-red-100" : availableQuantity <= 10 ? "bg-amber-100" : "bg-green-100"
                )}>
                  <Package className={cn(
                    "h-4 w-4",
                    availableQuantity === 0 ? "text-red-600" : availableQuantity <= 10 ? "text-amber-600" : "text-green-600"
                  )} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Available in selected branch</p>
                  <p className={cn(
                    "font-bold text-lg",
                    availableQuantity === 0 ? "text-red-600" : availableQuantity <= 10 ? "text-amber-600" : "text-green-600"
                  )}>
                    {availableQuantity.toLocaleString()} units
                  </p>
                </div>
              </div>
              {availableQuantity === 0 && (
                <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
              )}
            </div>

            {/* Action Row */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[180px] text-center">
                      <p>Add stock for new inventory<br />Remove for damaged or sold</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Label>Action</Label>
              </div>
              <div className="flex gap-3">
                <div
                  onClick={() => setAdjustmentType('add')}
                  className={cn(
                    "flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    adjustmentType === 'add' 
                      ? "border-green-500 bg-green-50" 
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      adjustmentType === 'add' ? "bg-green-500 text-white" : "bg-green-100 text-green-600"
                    )}>
                      <Plus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn("font-medium text-sm", adjustmentType === 'add' ? "text-green-700" : "text-gray-700")}>Add Stock</p>
                      <p className="text-xs text-gray-500">New inventory received</p>
                    </div>
                  </div>
                </div>
                <div
                  onClick={() => availableQuantity > 0 && setAdjustmentType('remove')}
                  className={cn(
                    "flex-1 p-3 rounded-xl border-2 transition-all",
                    availableQuantity === 0 
                      ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                      : adjustmentType === 'remove' 
                        ? "border-red-500 bg-red-50 cursor-pointer" 
                        : "border-gray-200 hover:border-red-300 hover:bg-red-50/50 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      availableQuantity === 0 
                        ? "bg-gray-200 text-gray-400"
                        : adjustmentType === 'remove' ? "bg-red-500 text-white" : "bg-red-100 text-red-600"
                    )}>
                      <Minus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium text-sm", 
                        availableQuantity === 0 
                          ? "text-gray-400"
                          : adjustmentType === 'remove' ? "text-red-700" : "text-gray-700"
                      )}>Remove Stock</p>
                      <p className="text-xs text-gray-500">
                        {availableQuantity === 0 ? "No stock to remove" : "Damaged, lost, or sold"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[180px] text-center">
                      <p>Enter units to adjust<br />Use presets or type custom</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Label>Quantity</Label>
              </div>
              <div className="flex items-center gap-2">
                {/* Preset dialer */}
                <div className="flex gap-1">
                  {[1, 5, 10, 25, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAdjustmentQuantity(String(num))}
                      className={cn(
                        "h-10 w-10 rounded-full text-sm font-semibold transition-all active:scale-95",
                        parseInt(adjustmentQuantity) === num
                          ? "bg-[#F4610B] text-white shadow-md"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                
                {/* Stepper */}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(adjustmentQuantity) || 0
                      if (current > 1) setAdjustmentQuantity(String(current - 1))
                    }}
                    disabled={!adjustmentQuantity || parseInt(adjustmentQuantity) <= 1}
                    className="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center text-gray-700 font-bold text-lg active:scale-95"
                  >
                    −
                  </button>
                  
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={adjustmentQuantity}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setAdjustmentQuantity(val)
                    }}
                    placeholder="0"
                    className="h-10 w-16 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:border-[#F4610B] focus:ring-0 focus:outline-none transition-colors"
                  />
                  
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(adjustmentQuantity) || 0
                      setAdjustmentQuantity(String(current + 1))
                    }}
                    className="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center text-gray-700 font-bold text-lg active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Warning if removing more than available */}
              {adjustmentType === 'remove' && adjustmentQuantity && parseInt(adjustmentQuantity) > availableQuantity && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Cannot remove {adjustmentQuantity} units. Only {availableQuantity} available.</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[180px] text-center">
                      <p>Track why this change<br />was made (optional)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Label>Notes</Label>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              <Textarea
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="Reason for change..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdjustStock} 
              disabled={
                isAdjusting || 
                !adjustmentQuantity || 
                (adjustmentType === 'remove' && parseInt(adjustmentQuantity) > availableQuantity)
              }
            >
              {isAdjusting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Dialog */}
      <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
            <DialogDescription>
              {editingBranch ? 'Update branch details' : 'Create a new store branch'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name (English)</Label>
                <Input
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="Branch name"
                />
              </div>
              <div className="space-y-2">
                <Label>Name (Arabic)</Label>
                <Input
                  value={branchForm.name_ar}
                  onChange={(e) => setBranchForm({ ...branchForm, name_ar: e.target.value })}
                  placeholder="اسم الفرع"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Branch Code</Label>
              <Input
                value={branchForm.code}
                onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                placeholder="e.g., BR001"
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={branchForm.city}
                onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                placeholder="City"
              />
            </div>

            {/* Main branch checkbox - disabled if editing main branch */}
            {editingBranch?.is_main_branch ? (
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <Building2 className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-800">
                  This is the main branch. Every store must have a main branch.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_main_branch"
                  checked={branchForm.is_main_branch}
                  onChange={(e) => setBranchForm({ ...branchForm, is_main_branch: e.target.checked })}
                  className="rounded accent-[#F4610B]"
                  disabled={editingBranch?.is_main_branch}
                />
                <Label htmlFor="is_main_branch" className="text-sm">
                  Set as main branch
                  {branchForm.is_main_branch && !editingBranch && (
                    <span className="text-xs text-muted-foreground ml-1">(will replace current main branch)</span>
                  )}
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBranch} disabled={isSavingBranch || !branchForm.name}>
              {isSavingBranch ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Preview Dialog */}
      <Dialog open={branchPreviewDialog} onOpenChange={setBranchPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[#F4610B]/10 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-[#F4610B]" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{previewingBranch && getBranchName(previewingBranch)}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1">
                    {previewingBranch?.code && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{previewingBranch.code}</span>}
                    {previewingBranch?.is_main_branch && <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-0 text-xs">Main Branch</Badge>}
                  </DialogDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setBranchPreviewDialog(false)
                  if (previewingBranch) openBranchDialog(previewingBranch)
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </DialogHeader>
          
          {previewingBranch && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4 mt-4">
              {/* Branch Details */}
              {(previewingBranch.address || previewingBranch.city) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 rounded-lg px-4 py-3">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span>{[previewingBranch.address, previewingBranch.city].filter(Boolean).join(', ')}</span>
                </div>
              )}
              
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{getBranchStats.totalQuantity}</div>
                  <div className="text-xs text-blue-600 mt-1">Total Units</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{getBranchStats.inStock}</div>
                  <div className="text-xs text-green-600 mt-1">In Stock</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-700">{getBranchStats.lowStock}</div>
                  <div className="text-xs text-amber-600 mt-1">Low Stock</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{getBranchStats.outOfStock}</div>
                  <div className="text-xs text-red-600 mt-1">Out of Stock</div>
                </div>
              </div>
              
              {/* Products Table */}
              <div className="flex-1 overflow-auto border border-gray-100 rounded-xl">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-b border-gray-100">
                      <TableHead className="bg-gray-50 font-medium text-gray-600">Product</TableHead>
                      <TableHead className="bg-gray-50 font-medium text-gray-600 text-right">On Hand</TableHead>
                      <TableHead className="bg-gray-50 font-medium text-gray-600 text-right">Reserved</TableHead>
                      <TableHead className="bg-gray-50 font-medium text-gray-600 text-right">Available</TableHead>
                      <TableHead className="bg-gray-50 font-medium text-gray-600">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getBranchProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No products in this branch
                        </TableCell>
                      </TableRow>
                    ) : (
                      getBranchProducts.map(({ product, quantity, reserved, available }) => {
                        const threshold = product.low_stock_threshold || 10
                        const isOut = available === 0
                        const isLow = available > 0 && available <= threshold
                        
                        return (
                          <TableRow key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 flex-shrink-0">
                                  {product.image_url ? (
                                    <img src={product.image_url} alt={getProductName(product)} className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm truncate">{getProductName(product)}</div>
                                  {product.sku && <div className="text-xs text-gray-400 font-mono">{product.sku}</div>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-right font-semibold">{quantity}</TableCell>
                            <TableCell className="py-3 text-right text-gray-500">{reserved}</TableCell>
                            <TableCell className={cn(
                              "py-3 text-right font-semibold",
                              isOut && "text-red-600",
                              isLow && !isOut && "text-amber-600"
                            )}>
                              {available}
                            </TableCell>
                            <TableCell className="py-3">
                              {isOut ? (
                                <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 rounded-full text-xs">Out</Badge>
                              ) : isLow ? (
                                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-full text-xs">Low</Badge>
                              ) : (
                                <Badge className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 rounded-full text-xs">OK</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Footer */}
              <div className="text-sm text-gray-500 text-center">
                {getBranchStats.total} products • {getBranchStats.totalQuantity} total units
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

