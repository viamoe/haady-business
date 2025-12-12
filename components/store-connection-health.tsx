'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useStoreConnection } from '@/lib/store-connection-context'
import { cn } from '@/lib/utils'
import { safeFetch, handleError } from '@/lib/error-handler'
import { toast } from '@/lib/toast'
import { CheckCircle2, AlertCircle, Clock, Loader2, RefreshCw } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface StoreConnectionHealth {
  id: string
  connection_status: string
  sync_status: string
  last_sync_at: string | null
  platform: string
  store_name?: string | null
  store_domain?: string | null
}

export function StoreConnectionHealth() {
  const { user } = useAuth()
  const { selectedConnectionId } = useStoreConnection()
  const [healthData, setHealthData] = useState<StoreConnectionHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncDetails, setLastSyncDetails] = useState<{
    success?: boolean
    productsSynced?: number
    productsCreated?: number
    productsUpdated?: number
    errorsCount?: number
    syncedAt?: string
  } | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchHealthStatus = useCallback(async (): Promise<number> => {
    if (!user?.id) {
      setHealthData(null)
      setLoading(false)
      return 30000
    }

    // If no store is selected, don't show health data
    if (!selectedConnectionId) {
      setHealthData(null)
      setLoading(false)
      return 30000
    }

    try {
      // Get the selected connection's health status
      const { data, error } = await supabase
        .from('store_connections')
        .select('id, connection_status, sync_status, last_sync_at, platform, store_name, store_domain')
        .eq('id', selectedConnectionId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching store connection health:', error)
        }
        setHealthData(null)
        return 30000
      } else if (data) {
        const newHealthData = {
          id: data.id,
          connection_status: data.connection_status || 'connected',
          sync_status: data.sync_status || 'idle',
          last_sync_at: data.last_sync_at || null,
          platform: data.platform || '',
          store_name: data.store_name || null,
          store_domain: data.store_domain || null,
        }
        setHealthData(newHealthData)
        return newHealthData.sync_status === 'syncing' ? 2000 : 30000
      } else {
        setHealthData(null)
        return 30000
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Exception fetching store connection health:', error)
      }
      setHealthData(null)
      return 30000
    } finally {
      setLoading(false)
    }
  }, [user?.id, selectedConnectionId])

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    // Clear any existing timeout when dependencies change
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const poll = async () => {
      const interval = await fetchHealthStatus()
      if (interval > 0) {
        timeoutRef.current = setTimeout(poll, interval)
      }
    }

    // Initial fetch
    poll()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [user?.id, selectedConnectionId, fetchHealthStatus])

  const healthStatus = useMemo(() => {
    if (!healthData) return null

    const isSyncing = healthData.sync_status === 'syncing'
    const isHealthy = 
      healthData.connection_status === 'connected' &&
      healthData.sync_status !== 'error' &&
      !isSyncing

    return {
      isHealthy,
      isSyncing,
      status: isSyncing ? 'syncing' : (isHealthy ? 'healthy' : 'unhealthy'),
      lastSync: healthData.last_sync_at,
    }
  }, [healthData])

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never synced'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    // For older dates, show formatted date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSync = async () => {
    if (!healthData?.id || isSyncing) return

    setIsSyncing(true)
    try {
      const response = await safeFetch(
        `/api/store-connections/${healthData.id}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'all' }),
        },
        { context: 'Sync store products', showToast: true }
      )

      const data = await response.json()
      
      if (data.success) {
        // Store sync details for tooltip
        const productsCreated = data.details?.productsCreated || 0
        const productsUpdated = data.details?.productsUpdated || 0
        setLastSyncDetails({
          success: data.success,
          productsSynced: data.details?.productsSynced || (productsCreated + productsUpdated),
          productsCreated,
          productsUpdated,
          errorsCount: data.details?.errorsCount || (data.details?.errors?.length || 0),
          syncedAt: data.syncedAt,
        })
        
        toast.success('Sync started', {
          description: 'Products are being synced. This may take a few moments.',
        })
        
        // Trigger immediate refresh to show syncing state
        const poll = async () => {
          const interval = await fetchHealthStatus()
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          timeoutRef.current = setTimeout(poll, interval)
        }
        poll()
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error: any) {
      handleError(error, {
        context: 'Sync store products',
        showToast: true,
        fallbackMessage: 'Failed to start sync. Please try again.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Show fallback while loading or when no store is selected
  if (loading || !healthStatus || !selectedConnectionId) {
    return (
      <div
        className={cn(
          'flex items-center justify-start gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
          'hover:bg-gray-100 text-[var(--accent-foreground)]'
        )}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />
        ) : (
          <Clock className="h-3.5 w-3.5 opacity-70" />
        )}
        <span className="whitespace-nowrap">
          {loading ? 'Loading...' : 'No store selected'}
        </span>
      </div>
    )
  }

  const isSyncingStatus = healthStatus.isSyncing || isSyncing

  const formatSyncDetails = () => {
    if (!lastSyncDetails && !healthData?.last_sync_at) {
      return <div>No sync data available</div>
    }

    const items: React.ReactNode[] = []
    
    if (healthData?.store_name) {
      items.push(
        <div key="store" className="mb-2 flex items-center justify-between gap-4">
          <div className="font-medium">Store</div>
          <div className="opacity-50">{healthData.store_name}</div>
        </div>
      )
    }
    
    if (healthData?.platform) {
      items.push(
        <div key="platform" className="mb-2 flex items-center justify-between gap-4">
          <div className="font-medium">Platform</div>
          <div className="opacity-50">{healthData.platform}</div>
        </div>
      )
    }

    if (lastSyncDetails) {
      items.push(
        <div key="sync-result" className="mb-2 flex items-center justify-between gap-4">
          <div className="font-medium">Sync result</div>
          <div className="opacity-50">{lastSyncDetails.success ? 'Success' : 'Failed'}</div>
        </div>
      )
      items.push(
        <div key="products-synced" className="mb-2 flex items-center justify-between gap-4">
          <div className="font-medium">Products synced</div>
          <div className="opacity-50">{lastSyncDetails.productsSynced ?? 0}</div>
        </div>
      )
      items.push(
        <div key="products-created" className="mb-2 flex items-center justify-between gap-4">
          <div className="font-medium">Products created</div>
          <div className="opacity-50">{lastSyncDetails.productsCreated ?? 0}</div>
        </div>
      )
      items.push(
        <div key="products-updated" className="mb-2 flex items-center justify-between gap-4">
          <div className="font-medium">Products updated</div>
          <div className="opacity-50">{lastSyncDetails.productsUpdated ?? 0}</div>
        </div>
      )
      items.push(
        <div key="errors" className="mb-2 flex items-center justify-between gap-4">
          <div className="font-medium">Errors</div>
          <div className="opacity-50">{lastSyncDetails.errorsCount ?? 0}</div>
        </div>
      )
    }

    const syncTime = lastSyncDetails?.syncedAt || healthData?.last_sync_at
    if (syncTime) {
      const date = new Date(syncTime)
      const formattedDate = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      items.push(
        <div key="synced" className="mb-2 flex items-center justify-between gap-4">
          <div className="font-medium">Synced</div>
          <div className="opacity-50">{formattedDate}</div>
        </div>
      )
    }

    return items.length > 0 ? <div className="py-1">{items}</div> : <div className="py-1">No sync data available</div>
  }

  const pillContent = (
    <div
      className={cn(
        'flex items-center justify-start gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        'text-[var(--accent-foreground)]'
      )}
    >
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          isSyncingStatus
            ? 'bg-gray-500 animate-pulse'
            : healthStatus.isHealthy
            ? 'bg-green-500'
            : 'bg-amber-500'
        )}
      />
      <div className="flex items-center gap-1.5">
        {isSyncingStatus ? (
          <span className="whitespace-nowrap shimmer-text">Syncing products</span>
        ) : (
          <>
            <span className="whitespace-nowrap">Synced</span>
            <span className="whitespace-nowrap text-gray-500">{formatLastSync(healthStatus.lastSync)}</span>
          </>
        )}
      </div>
      {healthData?.id && (
        <>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              'flex items-center justify-center p-0.5 rounded transition-colors',
              'hover:bg-current hover:bg-opacity-10 active:bg-opacity-20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Sync products"
            title="Sync store products"
          >
            <RefreshCw className={cn('h-4 w-4 text-gray-500 hover:text-gray-700 transition-all duration-700', isSyncingStatus ? 'animate-spin' : 'hover:rotate-180')} />
          </button>
        </>
      )}
    </div>
  )

  // Wrap in tooltip if we have sync data
  if (healthData && (lastSyncDetails || healthData.last_sync_at)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {pillContent}
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          sideOffset={8}
          className="max-w-xs text-left text-xs p-3 rounded-xl"
        >
          {formatSyncDetails()}
        </TooltipContent>
      </Tooltip>
    )
  }

  return pillContent
}

