'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Circle,
  Plus,
  Sparkles,
  BarChart3,
  Users,
  CreditCard,
  Truck,
  ExternalLink,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { OnboardingPanel } from '@/components/onboarding-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from '@/lib/toast'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'

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
  merchantName: string
  storeCount: number
  productCount: number
  hasStore: boolean
  hasProducts: boolean
  hasPaymentConfigured: boolean
  hasShippingConfigured: boolean
  isSetupComplete: boolean
  storeConnections?: StoreConnection[]
}

// Get greeting based on time of day - memoized to avoid recalculation
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Stats card component
function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  gradient,
}: { 
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  trend?: { value: string; positive: boolean }
  gradient: string
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute inset-0 ${gradient} opacity-5`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${gradient}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold">{value}</div>
          {trend && (
            <Badge 
              variant="secondary" 
              className={`text-[10px] font-medium ${
                trend.positive 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
            >
              <ArrowUpRight className={`h-3 w-3 mr-0.5 ${!trend.positive && 'rotate-90'}`} />
              {trend.value}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
  merchantName, 
  storeCount: initialStoreCount,
  productCount: initialProductCount,
  hasStore: initialHasStore,
  hasProducts: initialHasProducts,
  hasPaymentConfigured,
  hasShippingConfigured,
  isSetupComplete: initialIsSetupComplete,
  storeConnections = [],
}: DashboardContentProps) {
  const pathname = usePathname()
  const { selectedConnectionId } = useStoreConnection()
  const [isLoading, setIsLoading] = useState(true)
  const [storeCount, setStoreCount] = useState(initialStoreCount)
  const [productCount, setProductCount] = useState(initialProductCount)
  const [hasStore, setHasStore] = useState(initialHasStore)
  const [hasProducts, setHasProducts] = useState(initialHasProducts)
  const [isSetupComplete, setIsSetupComplete] = useState(initialIsSetupComplete)
  const hasLoadedRef = useRef(false)
  
  // Get page name from pathname
  const pageName = pathname.split('/').filter(Boolean).pop() || 'Dashboard'
  const capitalizedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1)

  // Fetch store-specific data when selected connection changes
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!selectedConnectionId) {
        // No store selected, show all data
        setStoreCount(initialStoreCount)
        setProductCount(initialProductCount)
        setHasStore(initialHasStore)
        setHasProducts(initialHasProducts)
        setIsSetupComplete(initialIsSetupComplete)
        return
      }

      try {
        // Fetch stores for this connection
        const { data: storeRecords, error: storesError, count: storeCount } = await supabase
          .from('stores')
          .select('id', { count: 'exact' })
          .eq('store_connection_id', selectedConnectionId)
          .eq('is_active', true)

        if (storesError) {
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
        const { count: productCount, error: productsError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)

        if (productsError) {
          console.error('Error fetching products:', productsError)
          // If products query fails, still set store count but set products to 0
          setStoreCount(storeCountForConnection)
          setProductCount(0)
          setHasStore(storeCountForConnection > 0)
          setHasProducts(false)
          setIsSetupComplete(false)
          return
        }

        const productCountForConnection = productCount || 0

        setStoreCount(storeCountForConnection)
        setProductCount(productCountForConnection)
        setHasStore(storeCountForConnection > 0)
        setHasProducts(productCountForConnection > 0)
        setIsSetupComplete(storeCountForConnection > 0 && productCountForConnection > 0 && hasPaymentConfigured && hasShippingConfigured)
      } catch (error) {
        console.error('Error fetching store data:', error)
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

  useEffect(() => {
    // Only show skeleton on initial mount, not on subsequent renders
    if (hasLoadedRef.current) {
      setIsLoading(false)
      return
    }

    // Show skeleton for minimum time on initial load
    const timer = setTimeout(() => {
      setIsLoading(false)
      hasLoadedRef.current = true
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  // Memoize onboarding steps to avoid recreation on every render
  const onboardingSteps = useMemo(() => [
    {
      id: 'store',
      title: 'Create your first store',
      description: 'Set up your online storefront',
      completed: hasStore,
      href: '/dashboard/stores',
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
  
  return (
    <div className="h-full">
      {isLoading ? (
        // Skeleton matching dashboard structure
        <div className="space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Greeting Section Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>
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
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {getGreeting()}, {userName}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedConnectionId ? (
                  <>
                    Viewing dashboard for <span className="font-medium text-foreground">
                      {storeConnections.find(c => c.id === selectedConnectionId)?.store_name || 
                       storeConnections.find(c => c.id === selectedConnectionId)?.platform || 
                       'selected store'}
                    </span>
                  </>
                ) : (
                  <>
                    Here's what's happening with <span className="font-medium text-foreground">{merchantName}</span> today.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

