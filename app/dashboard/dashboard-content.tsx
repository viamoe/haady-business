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
  Link2,
  ExternalLink,
  RefreshCw,
  X,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { OnboardingPanel } from '@/components/onboarding-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from '@/lib/toast'
import { handleError, safeFetch } from '@/lib/error-handler'
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
import { ProductApprovalModal, ProductPreview } from '@/components/product-approval-modal'

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

// Get greeting based on time of day
function getGreeting() {
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
  storeCount,
  productCount,
  hasStore,
  hasProducts,
  hasPaymentConfigured,
  hasShippingConfigured,
  isSetupComplete,
  storeConnections = [],
}: DashboardContentProps) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  
  // Get page name from pathname
  const pageName = pathname.split('/').filter(Boolean).pop() || 'Dashboard'
  const capitalizedPageName = pageName.charAt(0).toUpperCase() + pageName.slice(1)

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

  // Onboarding steps
  const onboardingSteps = [
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
  ]

  const completedSteps = onboardingSteps.filter(s => s.completed).length
  
  return (
    <div className="h-full">
      {isLoading ? (
        // Skeleton
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
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
                Here's what's happening with <span className="font-medium text-foreground">{merchantName}</span> today.
              </p>
            </div>
          </div>

          {/* Store Connections Card */}
          {storeConnections.length > 0 && (
            <Card className="border-2 border-emerald-100 bg-emerald-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-lg">Connected Stores</CardTitle>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    {storeConnections.length} {storeConnections.length === 1 ? 'Store' : 'Stores'}
                  </Badge>
                </div>
                <CardDescription>
                  Your e-commerce platforms are synced and ready to use
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {storeConnections.map((connection) => {
                    if (!connection.id) {
                      console.error('Connection missing ID:', connection)
                      return null
                    }
                    return (
                      <StoreConnectionCard
                        key={connection.id}
                        connection={connection}
                        onDisconnect={() => window.location.reload()}
                      />
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// Store Connection Card Component
function StoreConnectionCard({
  connection,
  onDisconnect,
}: {
  connection: StoreConnection
  onDisconnect: () => void
}) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRefreshingStoreInfo, setIsRefreshingStoreInfo] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [localConnection, setLocalConnection] = useState(connection)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [previewProducts, setPreviewProducts] = useState<ProductPreview[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Function to refresh store info
  const handleRefreshStoreInfo = async () => {
    if (!connection.id) return

    setIsRefreshingStoreInfo(true)
    try {
      const response = await safeFetch(
        `/api/store-connections/${connection.id}/refresh-store-info`,
        { method: 'POST' },
        { context: 'Refresh store info', showToast: false } // Don't show toast for auto-fetch
      )

      const data = await response.json()
      toast.success(`Store info refreshed: ${data.store_name || 'Updated'}`)
      
      // Update local connection state
      setLocalConnection(prev => ({
        ...prev,
        store_name: data.store_name || prev.store_name,
        store_domain: data.store_domain || prev.store_domain,
        store_external_id: data.store_external_id || prev.store_external_id,
      }))
      
      // Trigger parent refresh to update the list
      onDisconnect() // This will trigger a refresh
    } catch (error: any) {
      // Only show error if it's not a network error (to avoid spam for auto-fetch)
      if (error?.type !== 'NETWORK') {
        handleError(error, {
          context: 'Refresh store information',
          showToast: true,
        })
      } else {
        // Silently log network errors for auto-fetch
        console.debug('Auto-fetch store info failed (network unavailable):', error)
      }
    } finally {
      setIsRefreshingStoreInfo(false)
    }
  }

  // Auto-fetch store info if missing on mount
  useEffect(() => {
    // Only fetch if store_name is missing and we have a connection ID
    if (connection.id && (!connection.store_name || !connection.store_external_id)) {
      console.log('🔄 Auto-fetching store info for connection:', connection.id)
      // Use a small delay to avoid race conditions
      const timer = setTimeout(() => {
        handleRefreshStoreInfo().catch((error) => {
          // Silently handle auto-fetch errors to avoid console spam
          console.debug('Auto-fetch store info failed (this is normal if network is unavailable):', error)
        })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [connection.id]) // Run when connection.id changes

  // Debug: Log connection data
  useEffect(() => {
    console.log('🔍 StoreConnectionCard - Connection data:', {
      id: connection.id,
      idType: typeof connection.id,
      hasId: !!connection.id,
      platform: connection.platform,
      store_name: connection.store_name,
      store_external_id: connection.store_external_id,
      fullConnection: connection,
    })
  }, [connection])

  const platformLogo = localConnection.platform?.toLowerCase() === 'salla' 
    ? `${ECOMMERCE_STORAGE_URL}/salla-logo.png`
    : localConnection.platform?.toLowerCase() === 'zid'
    ? `${ECOMMERCE_STORAGE_URL}/zid-logo.png`
    : localConnection.platform?.toLowerCase() === 'shopify'
    ? `${ECOMMERCE_STORAGE_URL}/shopify-logo.png`
    : null

  // Determine connection health
  const isExpired = localConnection.expires_at 
    ? new Date(localConnection.expires_at) < new Date()
    : false

  const healthStatus = isExpired 
    ? 'expired' 
    : localConnection.connection_status === 'error' || localConnection.last_error
    ? 'error'
    : localConnection.connection_status === 'disconnected'
    ? 'disconnected'
    : 'connected'

  const syncStatus = localConnection.sync_status || 'idle'

  // Format last sync time
  const lastSyncTime = localConnection.last_sync_at
    ? new Date(localConnection.last_sync_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const connectedDate = localConnection.created_at
    ? new Date(localConnection.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently'

  // Status indicator component
  const StatusIndicator = () => {
    if (healthStatus === 'expired') {
      return (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-amber-600 font-medium">Expired</span>
        </div>
      )
    }
    if (healthStatus === 'error') {
      return (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs text-red-600 font-medium">Error</span>
        </div>
      )
    }
    if (syncStatus === 'syncing') {
      return (
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
          <span className="text-xs text-blue-600 font-medium">Syncing</span>
        </div>
      )
    }
    if (healthStatus === 'connected') {
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-emerald-600 font-medium">Connected</span>
        </div>
      )
    }
    return null
  }

  const handleDisconnect = async () => {
    if (!connection.id) {
      handleError(new Error('Connection ID is missing'), {
        context: 'Disconnect store',
        showToast: true,
        fallbackMessage: 'Connection ID is missing. Please refresh the page.',
      })
      console.error('❌ Connection missing ID:', connection)
      return
    }

    setIsDisconnecting(true)
    try {
      console.log('🔌 Disconnecting connection:', connection.id, connection.platform)
      const response = await safeFetch(
        `/api/store-connections/${connection.id}`,
        { method: 'DELETE' },
        { context: 'Disconnect store' }
      )

      toast.success(`${localConnection.platform} store disconnected successfully`)
      setShowDisconnectDialog(false)
      onDisconnect()
    } catch (error: any) {
      handleError(error, {
        context: 'Disconnect store',
        showToast: true,
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleSync = async () => {
    if (!connection.id) {
      handleError(new Error('Connection ID is missing'), {
        context: 'Sync store',
        showToast: true,
        fallbackMessage: 'Connection ID is missing. Please refresh the page.',
      })
      console.error('Connection object:', connection)
      return
    }

    // First, fetch preview of products
    setIsLoadingPreview(true)
    try {
      console.log('Fetching product preview for connection:', connection.id, connection.platform)
      const previewResponse = await safeFetch(
        `/api/store-connections/${connection.id}/sync/preview`,
        { method: 'GET' },
        { context: 'Preview products' }
      )

      const previewData = await previewResponse.json()
      
      if (!previewData.success || !previewData.products) {
        throw new Error(previewData.error || 'Failed to preview products')
      }

      // Show approval modal with products
      setPreviewProducts(previewData.products)
      setShowApprovalModal(true)
    } catch (error: any) {
      // If preview fails, fall back to direct sync (for platforms without preview support)
      if (error?.message?.includes('not yet implemented')) {
        // Fall back to direct sync
        await performDirectSync()
      } else {
        handleError(error, {
          context: 'Preview products',
          showToast: true,
        })
      }
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const performDirectSync = async () => {
    if (!connection.id) return

    setIsSyncing(true)
    try {
      console.log('Syncing connection:', connection.id, connection.platform)
      const response = await safeFetch(
        `/api/store-connections/${connection.id}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'all' }),
        },
        { context: 'Sync store' }
      )

      const data = await response.json()
      
      // Handle "coming soon" case
      if (data.comingSoon) {
        toast.info('Feature coming soon', {
          description: data.message || 'This feature is being developed and will be available soon.',
        })
        return
      }
      
      // Show detailed success message
      if (data.details) {
        const { productsCreated, productsUpdated } = data.details
        let title = 'Sync completed successfully!'
        let description = 'Your products have been synchronized'
        
        if (productsCreated > 0 && productsUpdated > 0) {
          description = `${productsCreated} new products created, ${productsUpdated} products updated`
        } else if (productsCreated > 0) {
          description = `${productsCreated} new products added to your store`
        } else if (productsUpdated > 0) {
          description = `${productsUpdated} products updated successfully`
        }
        
        toast.success(title, { description })
      } else {
        toast.success('Sync completed successfully!', { 
          description: 'Your products have been synchronized' 
        })
      }
      
      // Update local state
      setLocalConnection(prev => ({
        ...prev,
        sync_status: 'success',
        last_sync_at: data.syncedAt,
        last_error: null,
      }))
    } catch (error: any) {
      // Handle specific error cases
      if (error?.originalError?.requiresReauth) {
        handleError(error, {
          context: 'Sync store',
          showToast: true,
          fallbackMessage: 'Token expired. Please reconnect your store.',
        })
      } else {
        handleError(error, {
          context: 'Sync store',
          showToast: true,
        })
      }
      
      setLocalConnection(prev => ({
        ...prev,
        sync_status: 'error',
        last_error: error?.message || 'Unknown error',
      }))
    } finally {
      setIsSyncing(false)
    }
  }

  const handleApproveProducts = async (selectedProductIds: string[]) => {
    if (!connection.id) return

    setIsSyncing(true)
    try {
      console.log('🔄 Starting product sync:', {
        connectionId: connection.id,
        platform: connection.platform,
        productCount: selectedProductIds.length,
        selectedProductIds: selectedProductIds.slice(0, 5), // Log first 5 IDs
      })
      
      const requestBody = { 
        type: 'all',
        selectedProductIds: selectedProductIds,
      }
      
      console.log('📤 Sync request body:', requestBody)
      
      const response = await safeFetch(
        `/api/store-connections/${connection.id}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
        { context: 'Sync selected products' }
      )

      console.log('📥 Sync response status:', response.status, response.statusText)
      const data = await response.json()
      console.log('📥 Sync response data:', data)
      
      if (!data.success) {
        // Include error details in the error message
        const errorMessage = data.error || data.message || 'Sync failed'
        const errorDetails = data.details ? ` Details: ${JSON.stringify(data.details)}` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }
      
      // Show detailed success message
      if (data.details) {
        const { productsCreated, productsUpdated } = data.details
        let title = 'Sync completed successfully!'
        let description = `${selectedProductIds.length} products synchronized`
        
        if (productsCreated > 0 && productsUpdated > 0) {
          description = `${productsCreated} new products created, ${productsUpdated} products updated`
        } else if (productsCreated > 0) {
          description = `${productsCreated} new products added to your store`
        } else if (productsUpdated > 0) {
          description = `${productsUpdated} products updated successfully`
        }
        
        toast.success(title, { description })
      } else {
        toast.success('Sync completed successfully!', { 
          description: `${selectedProductIds.length} products synchronized` 
        })
      }
      
      // Update local state
      setLocalConnection(prev => ({
        ...prev,
        sync_status: 'success',
        last_sync_at: data.syncedAt,
        last_error: null,
      }))
    } catch (error: any) {
      // Log the full error for debugging - extract all possible error properties
      const errorInfo: any = {}
      
      // Try to extract all possible error properties
      try {
        errorInfo.message = error?.message
        errorInfo.error = error?.error
        errorInfo.details = error?.details
        errorInfo.originalError = error?.originalError
        errorInfo.type = error?.type
        errorInfo.statusCode = error?.statusCode
        errorInfo.status = error?.status
        errorInfo.name = error?.name
        errorInfo.code = error?.code
        errorInfo.context = error?.context
        errorInfo.retryable = error?.retryable
        
        // Try to stringify the full error
        try {
          errorInfo.fullErrorString = JSON.stringify(error, Object.getOwnPropertyNames(error))
        } catch (e) {
          errorInfo.fullErrorString = 'Could not stringify error'
        }
        
        // Try to get error as string
        errorInfo.errorString = String(error)
        errorInfo.errorToString = error?.toString?.()
      } catch (extractError) {
        errorInfo.extractionError = String(extractError)
      }
      
      console.error('❌ Sync error details:', errorInfo)
      console.error('❌ Raw error object:', error)
      
      // Extract error message from various possible locations
      const errorMessage = 
        error?.message || 
        error?.error || 
        error?.details?.message || 
        error?.details?.error ||
        error?.originalError?.message ||
        error?.originalError?.error ||
        'Failed to sync products'
      
      // Handle specific error cases
      if (error?.originalError?.requiresReauth || error?.details?.requiresReauth || error?.requiresReauth) {
        handleError(error, {
          context: 'Sync selected products',
          showToast: true,
          fallbackMessage: 'Token expired. Please reconnect your store.',
        })
      } else {
        handleError(error, {
          context: 'Sync selected products',
          showToast: true,
          fallbackMessage: errorMessage,
        })
      }
      
      setLocalConnection(prev => ({
        ...prev,
        sync_status: 'error',
        last_error: error?.message || error?.error || 'Unknown error',
      }))
      throw error // Re-throw to prevent modal from closing
    } finally {
      setIsSyncing(false)
    }
  }

  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    try {
      const response = await safeFetch(
        `/api/store-connections/${connection.id}/refresh`,
        { method: 'POST' },
        { context: 'Refresh token' }
      )

      toast.success('Token refreshed successfully')
      setLocalConnection(prev => ({
        ...prev,
        connection_status: 'connected',
        last_error: null,
      }))
    } catch (error: any) {
      if (error?.originalError?.requiresReauth) {
        handleError(error, {
          context: 'Refresh token',
          showToast: true,
          fallbackMessage: 'Token refresh failed. Please reconnect your store.',
        })
      } else {
        handleError(error, {
          context: 'Refresh token',
          showToast: true,
        })
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <>
      <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
        {platformLogo && (
          <div className="flex-shrink-0">
            <Image
              src={platformLogo}
              alt={localConnection.platform}
              width={60}
              height={24}
              className="h-6 w-auto object-contain"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 capitalize">
                  {localConnection.platform}
                </h3>
                <StatusIndicator />
              </div>
              {localConnection.store_external_id && (
                <p className="text-sm text-gray-600 mt-0.5">
                  Store ID: {localConnection.store_external_id}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {lastSyncTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Last sync: {lastSyncTime}</span>
                  </div>
                )}
                <span>Connected: {connectedDate}</span>
              </div>
              {localConnection.last_error && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {localConnection.last_error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {healthStatus === 'expired' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshToken}
                  disabled={isRefreshing}
                  className="h-8 text-xs"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Refresh
                </Button>
              )}
              {(!localConnection.store_name || !localConnection.store_external_id) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshStoreInfo}
                  disabled={isRefreshingStoreInfo}
                  className="h-8 text-xs"
                  title="Refresh store information from platform"
                >
                  {isRefreshingStoreInfo ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Link2 className="h-3 w-3 mr-1" />
                  )}
                  Fetch Store Info
                </Button>
              )}
              {syncStatus !== 'syncing' && healthStatus !== 'expired' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing || isLoadingPreview}
                  className="h-8 text-xs"
                >
                  {(isSyncing || isLoadingPreview) ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Sync
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDisconnectDialog(true)}
                disabled={isDisconnecting}
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {localConnection.platform}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to your {localConnection.platform} store. 
              You can reconnect it later, but syncing will stop until you do.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductApprovalModal
        open={showApprovalModal}
        onOpenChange={setShowApprovalModal}
        products={previewProducts}
        platform={localConnection.platform}
        onApprove={handleApproveProducts}
        isLoading={isSyncing}
      />
    </>
  )
}

