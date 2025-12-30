'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { 
  Package, 
  ShoppingBag, 
  Store, 
  TrendingUp, 
  ArrowRight, 
  ArrowUpRight,
  CheckCircle2,
  Check,
  Circle,
  Plus,
  Sparkles,
  BarChart3,
  Users,
  CreditCard,
  Truck,
  ExternalLink,
  ChevronDown,
  Clock,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { OnboardingPanel } from '@/components/onboarding-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from '@/lib/toast'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'
import { useLocale } from '@/i18n/context'
import { DateRangePicker } from '@/components/date-range-picker'
import type { DateRange } from 'react-day-picker'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'

interface StoreConnection {
  id: string
  platform: string
  store_external_id: string | null
  store_name?: string | null
  store_domain?: string | null
  connection_status?: string
  sync_status?: string
  last_sync_at?: string
  last_error?: string | null
  expires_at?: string | null
  created_at?: string
}

interface DashboardContentProps {
  userName: string
  businessName: string
  storeCount: number
  productCount: number
  hasStore: boolean
  hasProducts: boolean
  hasPaymentConfigured: boolean
  hasShippingConfigured: boolean
  isSetupComplete: boolean
  storeConnections?: StoreConnection[]
  countryCurrency?: string
  initialSalesData?: {
    today: number
    week: number
    month: number
    year: number
  }
  initialOrdersData?: {
    today: number
    week: number
    month: number
    year: number
  }
  storeIds?: string[]
}

// Get period options with translations
const getInsightPeriodOptions = (t: any) => [
  { value: 'today', label: t('dashboard.periods.today') },
  { value: 'week', label: t('dashboard.periods.week') },
  { value: 'month', label: t('dashboard.periods.month') },
  { value: 'year', label: t('dashboard.periods.year') },
] as const

// Get greeting based on time of day - memoized to avoid recalculation
const getGreeting = (t: any) => {
  const hour = new Date().getHours()
  if (hour < 12) return t('dashboard.greeting.morning')
  if (hour < 17) return t('dashboard.greeting.afternoon')
  return t('dashboard.greeting.evening')
}

// Generate chart data based on period - uses real data when available, otherwise distributes total evenly
function generateChartData(period: string, baseValue: number = 0, historicalData?: Array<{ name: string; value: number }>) {
  // If we have historical data, use it
  if (historicalData && historicalData.length > 0) {
    return historicalData
  }
  
  // Fallback: distribute baseValue evenly across period (for when no historical data)
  const data = []
  let dataPoints = 7
  
  if (period === 'today') {
    dataPoints = 24 // Hourly data for today
    const avgValue = baseValue / dataPoints
    for (let i = 0; i < dataPoints; i++) {
      data.push({
        name: `${String(i).padStart(2, '0')}:00`,
        value: avgValue,
      })
    }
  } else if (period === 'week') {
    dataPoints = 7 // Daily data for week
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const avgValue = baseValue / dataPoints
    for (let i = 0; i < dataPoints; i++) {
      data.push({
        name: days[i],
        value: avgValue,
      })
    }
  } else if (period === 'month') {
    dataPoints = 30 // Daily data for month
    const avgValue = baseValue / dataPoints
    for (let i = 1; i <= dataPoints; i++) {
      data.push({
        name: i.toString(),
        value: avgValue,
      })
    }
  } else if (period === 'year') {
    dataPoints = 12 // Monthly data for year
    const avgValue = baseValue / dataPoints
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for (let i = 0; i < dataPoints; i++) {
      data.push({
        name: months[i],
        value: avgValue,
      })
    }
  }
  
  return data
}

// Stats card component
function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  selectedPeriod,
  onPeriodChange,
  currencyIconUrl,
  chartColor = '#F4610B',
  countryCurrency,
  t,
}: { 
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  selectedPeriod: 'today' | 'week' | 'month' | 'year'
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'year') => void
  currencyIconUrl?: string
  chartColor?: string
  countryCurrency?: string
  t: any
}) {
  const { isRTL } = useLocale()
  const periodOptions = getInsightPeriodOptions(t)
  const selectedLabel =
    periodOptions.find((option) => option.value === selectedPeriod)?.label || t('dashboard.periods.month')

  // Check if value contains a URL (for currency icon)
  const valueStr = String(value)
  const isCurrencyUrl = currencyIconUrl && (currencyIconUrl.startsWith('http://') || currencyIconUrl.startsWith('https://'))
  
  // Extract numeric value if currency is a URL
  const numericValue = isCurrencyUrl ? valueStr.replace(currencyIconUrl, '').trim() : valueStr
  
  // Extract numeric value for chart
  const numericValueForChart = parseFloat(numericValue.replace(/[^\d.]/g, '')) || 0
  
  // Generate chart data (for visualization only - distributes total evenly)
  const chartData = useMemo(() => generateChartData(selectedPeriod, numericValueForChart), [selectedPeriod, numericValueForChart])
  
  // Use the actual value prop directly (real data from database)
  // The chart is just for visualization, the displayed value is the real total
  const displayValue = useMemo(() => {
    // For Sales, the value already includes currency formatting
    if (title === 'Sales' && isCurrencyUrl && currencyIconUrl) {
      // Value is already formatted as number with currency icon
      return value
    }
    // For other cases, use the value as-is (it's already formatted correctly)
    return value
  }, [value, title, isCurrencyUrl, currencyIconUrl])

  return (
    <Card className="group relative min-h-[200px] overflow-hidden rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] hover:shadow-[0_0_80px_rgba(15,23,42,0.12)] border-0 flex flex-col transition-all duration-200 hover:-translate-y-1">
      <CardHeader className="pb-0 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
            <div className="text-3xl font-bold mt-1 flex items-center gap-2">
              {isCurrencyUrl && currencyIconUrl && (
                <Image
                  src={currencyIconUrl}
                  alt="Currency"
                  width={24}
                  height={24}
                  className="inline-block"
                  style={{ width: 'auto', height: '24px' }}
                  unoptimized
                />
              )}
              {displayValue}
            </div>
          </div>
          <Icon className="h-7 w-7 text-gray-300 group-hover:text-gray-500 transition-colors duration-200" />
        </div>
      </CardHeader>
      <CardContent className="pt-2 flex flex-col gap-2">
        {/* Chart - Centered in a div */}
        <div className="flex items-center justify-center w-full py-2">
          <div className="h-[80px] w-full max-w-full min-w-0 min-h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      const value = data.value as number
                      const isCurrencyUrlForTooltip = currencyIconUrl && (currencyIconUrl.startsWith('http://') || currencyIconUrl.startsWith('https://'))
                      
                      return (
                        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">{data.payload.name}</p>
                          <p className="text-sm font-bold flex items-center gap-1" style={{ color: chartColor }}>
                            {title === 'Sales' && isCurrencyUrlForTooltip && currencyIconUrl ? (
                              <>
                                {value.toLocaleString()}
                                <Image
                                  src={currencyIconUrl}
                                  alt="Currency"
                                  width={20}
                                  height={20}
                                  className="inline-block"
                                  style={{ width: 'auto', height: '20px' }}
                                  unoptimized
                                />
                              </>
                            ) : title === 'Sales' ? (
                              `${value.toLocaleString()} ${countryCurrency || 'SAR'}`
                            ) : (
                              value.toLocaleString()
                            )}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                  cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill={`url(#gradient-${title})`}
                  dot={false}
                  activeDot={{ r: 4, fill: chartColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-xs text-gray-400">{description}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              {selectedLabel}
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align={isRTL ? "end" : "start"} 
            sideOffset={12} 
            alignOffset={isRTL ? -16 : -12} 
            className={cn("w-40 rounded-2xl p-1", isRTL && "text-right")}
          >
            {periodOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onPeriodChange(option.value)}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2 text-sm",
                  isRTL ? "flex-row-reverse justify-between" : "justify-between",
                  selectedPeriod === option.value
                    ? "bg-[#F4610B] text-white"
                    : "text-gray-600"
                )}
              >
                <span className={isRTL ? "text-right" : "text-left"}>{option.label}</span>
                {selectedPeriod === option.value && (
                  <Check className="h-4 w-4 text-white flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}

// Checklist item component
function ChecklistItem({ 
  title, 
  description, 
  completed, 
  href,
}: { 
  title: string
  description: string
  completed: boolean
  href: string
}) {
  return (
    <Link 
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
    </Link>
  )
}

const ECOMMERCE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce';

export function DashboardContent({ 
  userName, 
  businessName, 
  storeCount: initialStoreCount,
  productCount: initialProductCount,
  hasStore: initialHasStore,
  hasProducts: initialHasProducts,
  hasPaymentConfigured,
  hasShippingConfigured,
  isSetupComplete: initialIsSetupComplete,
  storeConnections = [],
  countryCurrency = 'SAR',
  initialSalesData = { today: 0, week: 0, month: 0, year: 0 },
  initialOrdersData = { today: 0, week: 0, month: 0, year: 0 },
  storeIds: initialStoreIds = [],
}: DashboardContentProps) {
  const pathname = usePathname()
  const t = useTranslations()
  const { selectedConnectionId, storeId } = useStoreConnection()
  const [isLoading, setIsLoading] = useState(true)
  const [storeCount, setStoreCount] = useState(initialStoreCount)
  const [productCount, setProductCount] = useState(initialProductCount)
  const [hasStore, setHasStore] = useState(initialHasStore)
  const [hasProducts, setHasProducts] = useState(initialHasProducts)
  const [isSetupComplete, setIsSetupComplete] = useState(initialIsSetupComplete)
  const [salesData, setSalesData] = useState(initialSalesData)
  const [ordersData, setOrdersData] = useState(initialOrdersData)
  const [storeIds, setStoreIds] = useState(initialStoreIds)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    to: new Date(),
  })
  const [insightPeriods, setInsightPeriods] = useState<Record<string, 'today' | 'week' | 'month' | 'year'>>({
    sales: 'today',
    orders: 'today',
    products: 'today',
  })

  const handleInsightPeriodChange = useCallback(
    (cardId: string, period: 'today' | 'week' | 'month' | 'year') => {
      setInsightPeriods((prev) => ({ ...prev, [cardId]: period }))
    },
    []
  )
  const hasLoadedRef = useRef(false)
  
  // Get page name from pathname
  const pageName = pathname.split('/').filter(Boolean).pop() || 'dashboard'
  const capitalizedPageName = pageName === 'dashboard' 
    ? t('dashboard.pageName.dashboard')
    : pageName.charAt(0).toUpperCase() + pageName.slice(1)

  // Fetch store-specific data when selected connection changes
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!selectedConnectionId) {
        // No store selected, show all data from initial props
        setStoreCount(initialStoreCount)
        setProductCount(initialProductCount)
        setHasStore(initialHasStore)
        setHasProducts(initialHasProducts)
        setIsSetupComplete(initialIsSetupComplete)
        setSalesData(initialSalesData)
        setOrdersData(initialOrdersData)
        setStoreIds(initialStoreIds)
        
        // Also refresh product count to ensure it's up to date
        if (initialStoreIds.length > 0) {
          try {
            const { count, error } = await supabase
              .from('products')
              .select('id', { count: 'exact', head: true })
              .in('store_id', initialStoreIds)
              .eq('is_active', true)
            
            if (!error && count !== null) {
              setProductCount(count)
              setHasProducts(count > 0)
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error refreshing product count:', error)
            }
          }
        }
        return
      }

      try {
        // Check if selectedConnectionId is a store_connection_id or a Haady store ID
        // First, check if it's a store_connection (new structure: store_connections.store_id -> stores.id)
        const { data: connection } = await supabase
          .from('store_connections')
          .select('store_id')
          .eq('id', selectedConnectionId)
          .maybeSingle()

        let storeRecords: any[] | null = null
        let storeCount = 0
        let storesError: any = null

        if (connection?.store_id) {
          // It's a store_connection_id, fetch the store via store_id
          const result = await supabase
            .from('stores')
            .select('id', { count: 'exact' })
            .eq('id', connection.store_id)
            .eq('is_active', true)
          
          storeRecords = result.data
          storeCount = result.count || 0
          storesError = result.error
        } else {
          // It might be a Haady store ID directly, check if it exists
          const result = await supabase
            .from('stores')
            .select('id', { count: 'exact' })
            .eq('id', selectedConnectionId)
            .eq('platform', 'haady')
            .eq('is_active', true)
          
          storeRecords = result.data
          storeCount = result.count || 0
          storesError = result.error
        }

        if (storesError && process.env.NODE_ENV === 'development') {
          console.error('Error fetching stores:', storesError)
          // If error, fall back to showing all data
          setStoreCount(initialStoreCount)
          setProductCount(initialProductCount)
          setHasStore(initialHasStore)
          setHasProducts(initialHasProducts)
          setIsSetupComplete(initialIsSetupComplete)
          return
        }

        const storeCountForConnection = storeCount || 0
        const storeIds = storeRecords?.map(s => s.id) || []

        // If no stores found, return early
        if (storeCountForConnection === 0 || storeIds.length === 0) {
          setStoreCount(0)
          setProductCount(0)
          setHasStore(false)
          setHasProducts(false)
          setIsSetupComplete(false)
          return
        }

        // Fetch products for stores from this connection
        let { count: productCount, error: productsError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .eq('is_active', true)

        // If error, try without is_active filter
        if (productsError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching product count:', productsError)
            console.log('Retrying without is_active filter, storeIds:', storeIds)
          }
          
          const retryResult = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .in('store_id', storeIds)
          
          if (retryResult.error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching products (retry failed):', retryResult.error)
            }
            // If products query fails, still set store count but set products to 0
            setStoreCount(storeCountForConnection)
            setProductCount(0)
            setHasStore(storeCountForConnection > 0)
            setHasProducts(false)
            setIsSetupComplete(false)
            return
          } else {
            productCount = retryResult.count
            productsError = null
          }
        }

        if (productsError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching products (final):', productsError)
          }
          setStoreCount(storeCountForConnection)
          setProductCount(0)
          setHasStore(storeCountForConnection > 0)
          setHasProducts(false)
          setIsSetupComplete(false)
          return
        }

        const productCountForConnection = productCount || 0

        // Fetch sales and orders data for the selected stores
        const now = new Date()
        const todayStart = new Date(now)
        todayStart.setHours(0, 0, 0, 0)
        
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - 7)
        
        const monthStart = new Date(now)
        monthStart.setDate(monthStart.getDate() - 30)
        
        const yearStart = new Date(now)
        yearStart.setFullYear(yearStart.getFullYear() - 1)

        const [ordersTodayRes, ordersWeekRes, ordersMonthRes, ordersYearRes, salesTodayRes, salesWeekRes, salesMonthRes, salesYearRes] = await Promise.all([
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('store_id', storeIds).gte('created_at', todayStart.toISOString()),
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('store_id', storeIds).gte('created_at', weekStart.toISOString()),
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('store_id', storeIds).gte('created_at', monthStart.toISOString()),
          supabase.from('orders').select('id', { count: 'exact', head: true }).in('store_id', storeIds).gte('created_at', yearStart.toISOString()),
          supabase.from('orders').select('total_amount').in('store_id', storeIds).gte('created_at', todayStart.toISOString()).eq('payment_status', 'paid'),
          supabase.from('orders').select('total_amount').in('store_id', storeIds).gte('created_at', weekStart.toISOString()).eq('payment_status', 'paid'),
          supabase.from('orders').select('total_amount').in('store_id', storeIds).gte('created_at', monthStart.toISOString()).eq('payment_status', 'paid'),
          supabase.from('orders').select('total_amount').in('store_id', storeIds).gte('created_at', yearStart.toISOString()).eq('payment_status', 'paid'),
        ])

        const calculateSalesTotal = (ordersData: any[] | null) => {
          if (!ordersData || ordersData.length === 0) return 0
          return ordersData.reduce((sum, order) => sum + (parseFloat(order.total_amount?.toString() || '0') || 0), 0)
        }

        const newSalesData = {
          today: calculateSalesTotal(salesTodayRes.data),
          week: calculateSalesTotal(salesWeekRes.data),
          month: calculateSalesTotal(salesMonthRes.data),
          year: calculateSalesTotal(salesYearRes.data),
        }

        const newOrdersData = {
          today: ordersTodayRes.count || 0,
          week: ordersWeekRes.count || 0,
          month: ordersMonthRes.count || 0,
          year: ordersYearRes.count || 0,
        }

        setStoreCount(storeCountForConnection)
        setProductCount(productCountForConnection)
        setHasStore(storeCountForConnection > 0)
        setHasProducts(productCountForConnection > 0)
        setIsSetupComplete(storeCountForConnection > 0 && productCountForConnection > 0 && hasPaymentConfigured && hasShippingConfigured)
        setSalesData(newSalesData)
        setOrdersData(newOrdersData)
        setStoreIds(storeIds)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching store data:', error)
        }
        // Fall back to showing all data on error
        setStoreCount(initialStoreCount)
        setProductCount(initialProductCount)
        setHasStore(initialHasStore)
        setHasProducts(initialHasProducts)
        setIsSetupComplete(initialIsSetupComplete)
      }
    }

    fetchStoreData()
  }, [selectedConnectionId, initialStoreCount, initialProductCount, initialHasStore, initialHasProducts, initialIsSetupComplete, hasPaymentConfigured, hasShippingConfigured])

  // Listen for product updates to refresh counts
  useEffect(() => {
    const handleProductsUpdated = () => {
      // Refetch product count when products are updated
      const fetchProductCount = async () => {
        try {
          const currentStoreIds = storeIds.length > 0 ? storeIds : initialStoreIds
          if (currentStoreIds.length === 0) return

          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .in('store_id', currentStoreIds)
            .eq('is_active', true)

          if (count !== null) {
            setProductCount(count)
            setHasProducts(count > 0)
          }
        } catch (error) {
          console.error('Error refreshing product count:', error)
        }
      }

      fetchProductCount()
    }

    window.addEventListener('productsUpdated', handleProductsUpdated as EventListener)
    return () => {
      window.removeEventListener('productsUpdated', handleProductsUpdated as EventListener)
    }
  }, [storeIds, initialStoreIds])

  // Listen for sync completion events to refresh product count
  useEffect(() => {
    const handleSyncCompleted = (event: CustomEvent) => {
      const { connectionId, success } = event.detail || {}
      if (process.env.NODE_ENV === 'development') {
        console.log('Sync completed event received:', { connectionId, success, selectedConnectionId })
      }
      
      // Refresh if sync was successful and matches selected connection, or if no connection is selected (show all)
      if (success && (connectionId === selectedConnectionId || !selectedConnectionId)) {
        // Refetch store data to update product count
        const fetchStoreData = async () => {
          if (!selectedConnectionId) return

          try {
            if (process.env.NODE_ENV === 'development') {
              console.log('Refreshing product count for connection:', selectedConnectionId)
            }
            const { data: connection } = await supabase
              .from('store_connections')
              .select('id')
              .eq('id', selectedConnectionId)
              .maybeSingle()

            if (!connection) {
              if (process.env.NODE_ENV === 'development') {
                console.log('No connection found')
              }
              return
            }

            // New structure: store_connections.store_id -> stores.id
            const { data: connectionWithStore } = await supabase
              .from('store_connections')
              .select('store_id')
              .eq('id', selectedConnectionId)
              .maybeSingle()

            if (!connectionWithStore?.store_id) {
              if (process.env.NODE_ENV === 'development') {
                console.log('No store linked to connection')
              }
              return
            }

            const { data: store, error: storesError } = await supabase
              .from('stores')
              .select('id')
              .eq('id', connectionWithStore.store_id)
              .eq('is_active', true)
              .maybeSingle()

            if (storesError?.message) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Error fetching store:', storesError.message)
              }
              return
            }

            if (!store) {
              if (process.env.NODE_ENV === 'development') {
                console.log('No store found for connection')
              }
              return
            }

            const storeIds = [store.id]
            if (process.env.NODE_ENV === 'development') {
              console.log('Store IDs:', storeIds)
            }

            // Fetch updated product count
            let { count: productCount, error: productsError } = await supabase
              .from('products')
              .select('id', { count: 'exact', head: true })
              .in('store_id', storeIds)
              .eq('is_active', true)

            // If error is related to deleted_at column not existing, retry without it
            if (productsError && (productsError.message?.includes('deleted_at') || productsError.code === '42703' || productsError.code === 'PGRST116')) {
              if (process.env.NODE_ENV === 'development') {
              console.log('Retrying product count query without deleted_at filter')
            }
              const retryResult = await supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .in('store_id', storeIds)
                .eq('is_active', true)
              
              productCount = retryResult.count
              productsError = retryResult.error
            }

            if (productsError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Error fetching product count:', productsError)
              }
              return
            }

            if (process.env.NODE_ENV === 'development') {
              console.log('Updated product count:', productCount)
            }
            if (productCount !== null) {
              setProductCount(productCount)
              setHasProducts(productCount > 0)
              setIsSetupComplete(productCount > 0 && hasPaymentConfigured && hasShippingConfigured)
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error refreshing product count after sync:', error)
            }
          }
        }

        // Wait a bit for the sync to fully complete in the database
        setTimeout(() => {
          fetchStoreData()
        }, 2000) // Increased delay to 2 seconds
      }
    }

    window.addEventListener('productsSyncCompleted', handleSyncCompleted as EventListener)
    return () => {
      window.removeEventListener('productsSyncCompleted', handleSyncCompleted as EventListener)
    }
  }, [selectedConnectionId, hasPaymentConfigured, hasShippingConfigured])

  // Track if we're navigating (to prevent blank page)
  const isNavigatingRef = useRef(false)

  // Listen for navigation start event to show skeleton immediately
  // Use capture phase to fire before other handlers
  useEffect(() => {
    const handleNavigationStart = (event: CustomEvent) => {
      const url = event.detail?.url
      // Only trigger if navigating to dashboard page
      if (url && url === '/dashboard') {
        isNavigatingRef.current = true
        setIsLoading(true)
        // Reset hasLoadedRef so skeleton shows properly
        hasLoadedRef.current = false
      }
    }

    // Use capture phase to ensure this fires early
    window.addEventListener('dashboard-navigation-start', handleNavigationStart as EventListener, true)
    return () => {
      window.removeEventListener('dashboard-navigation-start', handleNavigationStart as EventListener, true)
    }
  }, [])

  // Show skeleton when pathname changes to dashboard
  useEffect(() => {
    if (pathname === '/dashboard' && isNavigatingRef.current) {
      // We're navigating to dashboard, ensure loading is true
      setIsLoading(true)
      isNavigatingRef.current = false
    }
  }, [pathname])

  useEffect(() => {
    // Only show skeleton on initial mount, not on subsequent renders
    // But don't interfere if we're navigating or if we're on dashboard (might be navigating)
    if (hasLoadedRef.current && !isNavigatingRef.current && pathname !== '/dashboard') {
      setIsLoading(false)
      return
    }

    // If we're navigating, don't set to false yet - let navigation event handle it
    if (isNavigatingRef.current) {
      return
    }

    // Show skeleton for minimum time on initial load
    const timer = setTimeout(() => {
      setIsLoading(false)
      hasLoadedRef.current = true
      isNavigatingRef.current = false
    }, 800)

    return () => clearTimeout(timer)
  }, [pathname])

  // Memoize onboarding steps to avoid recreation on every render
  const onboardingSteps = useMemo(() => [
    {
      id: 'store',
      title: 'Create your first store',
      description: 'Set up your online storefront',
      completed: hasStore,
      href: '/dashboard/settings/store',
      icon: Store,
    },
    {
      id: 'products',
      title: 'Add your products',
      description: 'Build your product catalog',
      completed: hasProducts,
      href: '/dashboard/products',
      icon: Package,
    },
    {
      id: 'payment',
      title: 'Configure payment methods',
      description: 'Accept payments from customers',
      completed: hasPaymentConfigured,
      href: '/dashboard/settings',
      icon: CreditCard,
    },
    {
      id: 'shipping',
      title: 'Set up shipping',
      description: 'Define delivery options',
      completed: hasShippingConfigured,
      href: '/dashboard/settings',
      icon: Truck,
    },
  ], [hasStore, hasProducts, hasPaymentConfigured, hasShippingConfigured])

const completedSteps = useMemo(() => onboardingSteps.filter(s => s.completed).length, [onboardingSteps])

const insightCards = useMemo(() => {
  // Check if countryCurrency is a URL (currency icon)
  const isCurrencyIconUrl = countryCurrency && (countryCurrency.startsWith('http://') || countryCurrency.startsWith('https://'))
  
  // Get current period values
  const salesPeriod = insightPeriods.sales || 'today'
  const ordersPeriod = insightPeriods.orders || 'today'
  const currentSales = salesData[salesPeriod] || 0
  const currentOrders = ordersData[ordersPeriod] || 0
  
  // Format sales value
  const salesValue = isCurrencyIconUrl 
    ? currentSales.toLocaleString() 
    : `${currentSales.toLocaleString()} ${countryCurrency}`

  return [
    {
      id: 'sales',
      title: t('dashboard.cards.sales.title'),
      value: salesValue,
      description: t('dashboard.cards.sales.description'),
      icon: CreditCard,
      currencyIconUrl: isCurrencyIconUrl ? countryCurrency : undefined,
      chartColor: '#F4610B',
    },
    {
      id: 'orders',
      title: t('dashboard.cards.orders.title'),
      value: currentOrders.toLocaleString(),
      description: t('dashboard.cards.orders.description'),
      icon: ShoppingBag,
      chartColor: '#F4610B',
    },
    {
      id: 'products',
      title: t('dashboard.cards.products.title'),
      value: productCount.toString(),
      description: t('dashboard.cards.products.description'),
      icon: Package,
      chartColor: '#F4610B',
    },
  ]
}, [productCount, countryCurrency, t, salesData, ordersData, insightPeriods])

  const recentOrders: Array<{
    id: string;
    orderNumber?: string;
    customerName?: string;
    total?: number;
    status?: string;
    createdAt?: string;
  }> = []
  const recentProducts: Array<{
    id: string;
    name?: string;
    image?: string;
    sales?: number;
    revenue?: number;
  }> = []
  
  return (
    <div className="h-full">
      {isLoading ? (
        // Skeleton matching dashboard structure
        <div className="space-y-6">
          {/* Breadcrumb Skeleton */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Skeleton className="h-5 w-24" />
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Greeting Section Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96 max-w-full" />
            </div>
            <div className="flex-shrink-0">
              <Skeleton className="h-10 w-[280px]" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Card key={`insight-skeleton-${item}`} className="group relative min-h-[200px] overflow-hidden rounded-3xl border-0 shadow-none flex flex-col">
                <CardHeader className="pb-0 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </CardHeader>
                <CardContent className="pt-2 flex flex-col gap-2">
                  {/* Chart Skeleton */}
                  <div className="flex items-center justify-center w-full py-2">
                    <div className="h-[80px] w-full">
                      <Skeleton className="h-full w-full rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-4 w-20 mt-1" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Orders Card Skeleton */}
          <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Best Selling Products Card Skeleton */}
          <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Content with fade-in animation
        <div className="fade-in-content space-y-6">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-md font-medium">{capitalizedPageName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {getGreeting(t)}, {userName}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedConnectionId ? (
                  <>
                    {t('dashboard.viewing.dashboardFor')} <span className="font-medium text-foreground">
                      {storeConnections.find(c => c.id === selectedConnectionId)?.store_name || 
                       storeConnections.find(c => c.id === selectedConnectionId)?.platform || 
                       t('dashboard.viewing.selectedStore')}
                    </span>
                  </>
                ) : (
                  <>
                    {t('dashboard.viewing.happeningWith')} <span className="font-medium text-foreground">{businessName}</span> {t('dashboard.viewing.today')}.
                  </>
                )}
              </p>
            </div>
            <div className="flex-shrink-0">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {insightCards.map((card) => (
              <StatsCard
                key={card.id}
                title={card.title}
                value={card.value}
                description={card.description}
                icon={card.icon}
                selectedPeriod={insightPeriods[card.id] ?? 'month'}
                onPeriodChange={(period) => handleInsightPeriodChange(card.id, period)}
                currencyIconUrl={card.currencyIconUrl}
                chartColor={card.chartColor}
                countryCurrency={countryCurrency}
                t={t}
              />
            ))}
          </div>

          {/* Recent Orders Section */}
          <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">Recent Orders</CardTitle>
                    <CardDescription className="mt-1">
                      Latest orders from your store
                    </CardDescription>
                  </div>
                  <Link
                    href="/dashboard/orders"
                    className="text-sm font-medium text-[#F4610B] hover:text-[#E05500] flex items-center gap-1 transition-colors"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4 flex-1">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <ShoppingBag className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-muted-foreground font-medium">No recent orders</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Orders will appear here once customers place them
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.slice(0, 5).map((order: any) => (
                      <Link
                        key={order.id}
                        href={`/dashboard/orders/${order.id}`}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-[#F4610B]/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-5 w-5 text-[#F4610B]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">
                                {order.order_number || `#${order.id.slice(0, 8)}`}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {order.customer_name || 'Guest'} • {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {order.total_amount?.toLocaleString() || '0'} {countryCurrency}
                            </p>
                          </div>
                          <Badge
                            variant={
                              order.status === 'completed' || order.status === 'fulfilled'
                                ? 'default'
                                : order.status === 'cancelled' || order.status === 'canceled'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className={
                              order.status === 'completed' || order.status === 'fulfilled'
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : order.status === 'cancelled' || order.status === 'canceled'
                                ? ''
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                            }
                          >
                            {order.status || 'Pending'}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
          </Card>

          {/* Best Selling Products Section */}
          <Card className="rounded-3xl shadow-[0_18px_35px_rgba(15,23,42,0.04)] border-0 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Best Selling Products</CardTitle>
                  <CardDescription className="mt-1">
                    Top performing products by sales
                  </CardDescription>
                </div>
                <Link
                  href="/dashboard/products"
                  className="text-sm font-medium text-[#F4610B] hover:text-[#E05500] flex items-center gap-1 transition-colors"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4 flex-1">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-muted-foreground font-medium">No products yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Products will appear here once you add them to your store
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProducts.slice(0, 5).map((product: any, index: number) => (
                    <Link
                      key={product.id}
                      href={`/dashboard/products/${product.id}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name || 'Product'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <p className="font-medium text-gray-900 truncate">
                              {product.name || 'Unnamed Product'}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {product.total_sold || 0} sold
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {product.total_revenue ? `${product.total_revenue.toLocaleString()} ${countryCurrency}` : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.price ? `${product.price.toLocaleString()} ${countryCurrency}` : '—'}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
