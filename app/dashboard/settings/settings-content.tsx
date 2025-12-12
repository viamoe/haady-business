'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Store } from 'lucide-react'
import { useStoreConnection } from '@/lib/store-connection-context'
import { useLocale } from '@/i18n/context'
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import {
  RefreshCw,
  X,
  AlertCircle,
  Clock,
  Loader2,
  CheckCircle2,
  Link2,
} from 'lucide-react'

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

interface SettingsContentProps {
  storeConnections?: StoreConnection[]
}

const ECOMMERCE_STORAGE_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/ecommerce';

export function SettingsContent({ storeConnections = [] }: SettingsContentProps) {
  const pathname = usePathname()
  const { selectedConnectionId } = useStoreConnection()
  const { locale, isRTL } = useLocale()
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  
  // Helper function to detect if text contains Arabic characters
  const containsArabic = (text: string | null | undefined): boolean => {
    if (!text) return false
    const arabicPattern = /[\u0600-\u06FF]/
    return arabicPattern.test(text)
  }
  
  // Get page name from pathname
  const pageName = pathname.split('/').filter(Boolean).pop() || 'Settings'
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

  return (
    <div className="h-full" lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
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
                Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your store connections and preferences
              </p>
            </div>
          </div>

          {/* Store Connections Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-4">Store Connections</h2>
              {storeConnections.length > 0 ? (
                <div className="space-y-4">
                  {storeConnections.map((connection) => {
                    if (!connection.id) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('Connection missing ID:', connection)
                      }
                      return null
                    }
                    const isSelected = connection.id === selectedConnectionId
                    return (
                      <Card 
                        key={connection.id}
                        className={isSelected ? "border-2 border-emerald-100 bg-emerald-50/50" : "border border-gray-200"}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link2 className="h-5 w-5 text-emerald-600" />
                              <CardTitle 
                                className="text-lg"
                                lang={containsArabic(connection.store_name) ? 'ar' : undefined}
                              >
                                {connection.store_name || `${connection.platform.charAt(0).toUpperCase() + connection.platform.slice(1)} Store`}
                              </CardTitle>
                            </div>
                            {isSelected && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                Active
                              </Badge>
                            )}
                          </div>
                          <CardDescription>
                            {isSelected 
                              ? 'Currently viewing dashboard for this store'
                              : 'Click to view this store\'s dashboard'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <StoreConnectionCard
                            connection={connection}
                            onDisconnect={() => window.location.reload()}
                          />
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card className="border-2 border-amber-100 bg-amber-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-lg">No Stores Connected</CardTitle>
                      </div>
                    </div>
                    <CardDescription>
                      Connect your first store to get started
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Store Connection Card Component - Memoized to prevent unnecessary re-renders
const StoreConnectionCard = memo(function StoreConnectionCard({
  connection,
  onDisconnect,
}: {
  connection: StoreConnection
  onDisconnect: () => void
}) {
  const { locale, isRTL } = useLocale()
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRefreshingStoreInfo, setIsRefreshingStoreInfo] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [localConnection, setLocalConnection] = useState(connection)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [previewProducts, setPreviewProducts] = useState<ProductPreview[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  
  // Helper function to detect if text contains Arabic characters
  const containsArabic = (text: string | null | undefined): boolean => {
    if (!text) return false
    const arabicPattern = /[\u0600-\u06FF]/
    return arabicPattern.test(text)
  }

  // Memoize callback functions to prevent unnecessary re-renders
  const handleRefreshStoreInfo = useCallback(async () => {
    if (!connection.id) return

    setIsRefreshingStoreInfo(true)
    try {
      const response = await safeFetch(
        `/api/store-connections/${connection.id}/refresh-store-info`,
        { method: 'POST' },
        { context: 'Refresh store info', showToast: false }
      )

      const data = await response.json()
      toast.success(`Store info refreshed: ${data.store_name || 'Updated'}`)
      
      setLocalConnection(prev => ({
        ...prev,
        store_name: data.store_name || prev.store_name,
        store_domain: data.store_domain || prev.store_domain,
        store_external_id: data.store_external_id || prev.store_external_id,
      }))
      
      onDisconnect()
    } catch (error: any) {
      if (error?.type !== 'NETWORK') {
        handleError(error, {
          context: 'Refresh store information',
          showToast: true,
        })
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Auto-fetch store info failed (network unavailable):', error)
        }
      }
    } finally {
      setIsRefreshingStoreInfo(false)
    }
  }, [connection.id, onDisconnect])

  useEffect(() => {
    if (connection.id && (!connection.store_name || !connection.store_external_id)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Auto-fetching store info for connection:', connection.id)
      }
      const timer = setTimeout(() => {
        handleRefreshStoreInfo().catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.debug('Auto-fetch store info failed:', error)
          }
        })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [connection.id, connection.store_name, connection.store_external_id, handleRefreshStoreInfo])

  const platformLogo = useMemo(() => {
    const platform = localConnection.platform?.toLowerCase()
    if (platform === 'salla') return `${ECOMMERCE_STORAGE_URL}/salla-logo.png`
    if (platform === 'zid') return `${ECOMMERCE_STORAGE_URL}/zid-logo.png`
    if (platform === 'shopify') return `${ECOMMERCE_STORAGE_URL}/shopify-logo.png`
    return null
  }, [localConnection.platform])

  const { isExpired, healthStatus, syncStatus } = useMemo(() => {
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

    return { isExpired, healthStatus, syncStatus }
  }, [localConnection.expires_at, localConnection.connection_status, localConnection.last_error, localConnection.sync_status])

  const lastSyncTime = useMemo(() => {
    if (!localConnection.last_sync_at) return null
    return new Date(localConnection.last_sync_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [localConnection.last_sync_at])

  const connectedDate = useMemo(() => {
    if (!localConnection.created_at) return 'Recently'
    return new Date(localConnection.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [localConnection.created_at])

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

  const handleDisconnect = useCallback(async () => {
    if (!connection.id) {
      handleError(new Error('Connection ID is missing'), {
        context: 'Disconnect store',
        showToast: true,
        fallbackMessage: 'Connection ID is missing. Please refresh the page.',
      })
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Connection missing ID:', connection)
      }
      return
    }

    setIsDisconnecting(true)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 Disconnecting connection:', connection.id, connection.platform)
      }
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
  }, [connection.id, localConnection.platform, onDisconnect])

  const handleSync = useCallback(async () => {
    if (!connection.id) {
      handleError(new Error('Connection ID is missing'), {
        context: 'Sync store',
        showToast: true,
        fallbackMessage: 'Connection ID is missing. Please refresh the page.',
      })
      if (process.env.NODE_ENV === 'development') {
        console.error('Connection object:', connection)
      }
      return
    }

    setIsLoadingPreview(true)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching product preview for connection:', connection.id, connection.platform)
      }
      const previewResponse = await safeFetch(
        `/api/store-connections/${connection.id}/sync/preview`,
        { method: 'GET' },
        { context: 'Preview products' }
      )

      const previewData = await previewResponse.json()
      
      if (!previewData.success || !previewData.products) {
        throw new Error(previewData.error || 'Failed to preview products')
      }

      setPreviewProducts(previewData.products)
      setShowApprovalModal(true)
    } catch (error: any) {
      if (error?.message?.includes('not yet implemented')) {
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
  }, [connection.id, connection.platform])

  const performDirectSync = useCallback(async () => {
    if (!connection.id) return

    setIsSyncing(true)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Syncing connection:', connection.id, connection.platform)
      }
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
      
      if (data.comingSoon) {
        toast.info('Feature coming soon', {
          description: data.message || 'This feature is being developed and will be available soon.',
        })
        return
      }
      
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
      
      setLocalConnection(prev => ({
        ...prev,
        sync_status: 'success',
        last_sync_at: data.syncedAt,
        last_error: null,
      }))
    } catch (error: any) {
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
  }, [connection.id, connection.platform])

  const handleApproveProducts = useCallback(async (selectedProductIds: string[]) => {
    if (!connection.id) return

    setIsSyncing(true)
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Starting product sync:', {
          connectionId: connection.id,
          platform: connection.platform,
          productCount: selectedProductIds.length,
          selectedProductIds: selectedProductIds.slice(0, 5),
        })
      }
      
      const requestBody = { 
        type: 'all',
        selectedProductIds: selectedProductIds,
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📤 Sync request body:', requestBody)
      }
      
      const response = await safeFetch(
        `/api/store-connections/${connection.id}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
        { context: 'Sync selected products' }
      )

      const data = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.log('📥 Sync response status:', response.status, response.statusText)
        console.log('📥 Sync response data:', data)
      }
      
      if (!data.success) {
        const errorMessage = data.error || data.message || 'Sync failed'
        const errorDetails = data.details ? ` Details: ${JSON.stringify(data.details)}` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }
      
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
      
      setLocalConnection(prev => ({
        ...prev,
        sync_status: 'success',
        last_sync_at: data.syncedAt,
        last_error: null,
      }))
    } catch (error: any) {
      const errorInfo: any = {}
      
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
        
        try {
          errorInfo.fullErrorString = JSON.stringify(error, Object.getOwnPropertyNames(error))
        } catch (e) {
          errorInfo.fullErrorString = 'Could not stringify error'
        }
        
        errorInfo.errorString = String(error)
        errorInfo.errorToString = error?.toString?.()
      } catch (extractError) {
        errorInfo.extractionError = String(extractError)
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Sync error details:', errorInfo)
        console.error('❌ Raw error object:', error)
      }
      
      const errorMessage = 
        error?.message || 
        error?.error || 
        error?.details?.message || 
        error?.details?.error ||
        error?.originalError?.message ||
        error?.originalError?.error ||
        'Failed to sync products'
      
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
      throw error
    } finally {
      setIsSyncing(false)
    }
  }, [connection.id, connection.platform])

  const handleRefreshToken = useCallback(async () => {
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
  }, [connection.id])

  return (
    <>
      <div 
        className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        lang={locale}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {platformLogo && (
          <div className="flex-shrink-0">
            <Image
              src={platformLogo}
              alt={localConnection.platform}
              width={60}
              height={24}
              className="h-6 w-auto object-contain"
              priority={false}
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 
                  className="font-semibold text-gray-900 capitalize"
                  lang={containsArabic(localConnection.store_name) ? 'ar' : locale}
                >
                  {localConnection.platform}
                </h3>
                <StatusIndicator />
              </div>
              {localConnection.store_external_id && (
                <p 
                  className="text-sm text-gray-600 mt-0.5"
                  lang={containsArabic(localConnection.store_name) ? 'ar' : locale}
                >
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
})

