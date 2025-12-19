'use client'

import * as React from 'react'
import { Package, Image as ImageIcon, ArrowUpDown, RefreshCw } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import { useStoreConnection } from '@/lib/store-connection-context'
import { supabase } from '@/lib/supabase/client'
import { Sparkles } from '@/components/animate-ui/icons/sparkles'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'

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
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [hasInitialized, setHasInitialized] = React.useState(false)
  const [connectionPlatform, setConnectionPlatform] = React.useState<string | null>(null)
  const [currentSyncPhrase, setCurrentSyncPhrase] = React.useState(0)
  const [syncLogs, setSyncLogs] = React.useState<string[]>([])
  const [fetchedProductIds, setFetchedProductIds] = React.useState<string[]>([])
  const [updatedProductIds, setUpdatedProductIds] = React.useState<string[]>([])

  // Dynamic sync phrases that include logs and product IDs (no duplicates)
  const syncPhrases = React.useMemo(() => {
    const seenPhrases = new Set<string>()
    const phrases: string[] = []
    
    // Base phrases (always show in order)
    const basePhrases = [
      'Starting product synchronization...',
      'Connecting to store API...',
      'Connection established',
    ]
    
    basePhrases.forEach(phrase => {
      if (!seenPhrases.has(phrase)) {
        seenPhrases.add(phrase)
        phrases.push(phrase)
      }
    })
    
    // Add product IDs if any have been fetched (after the base phrases, no duplicates)
    fetchedProductIds.forEach(id => {
      const phrase = `Processing Product ID: ${id}`
      if (!seenPhrases.has(phrase)) {
        seenPhrases.add(phrase)
        phrases.push(phrase)
      }
    })
    
    updatedProductIds.forEach(id => {
      const phrase = `Updating Product ID: ${id}`
      if (!seenPhrases.has(phrase)) {
        seenPhrases.add(phrase)
        phrases.push(phrase)
      }
    })
    
    // Add other log messages (without emojis, no duplicates)
    syncLogs.forEach(log => {
      const cleanLog = log.replace(/[🚀📡✅📦📋❌✨🔄📊💾]/g, '').trim()
      if (
        cleanLog &&
        !cleanLog.includes('Product ID:') && 
        !cleanLog.includes('Starting') &&
        !cleanLog.includes('Connecting') &&
        !cleanLog.includes('Connection established') &&
        !cleanLog.includes('Fetching product data') &&
        !seenPhrases.has(cleanLog)
      ) {
        seenPhrases.add(cleanLog)
        phrases.push(cleanLog)
      }
    })
    
    return phrases
  }, [syncLogs, fetchedProductIds, updatedProductIds])

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
          // Filter by selected store connection
          const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, name')
            .eq('store_connection_id', selectedConnectionId)
            .eq('is_active', true)

          if (storesError) {
            console.error('Error fetching stores for connection:', storesError)
            // If no stores found for this connection, try to get stores without connection_id
            // (in case stores were created before the migration)
            const { data: fallbackStores } = await supabase
              .from('stores')
              .select('id, name')
              .eq('is_active', true)
              .is('store_connection_id', null)
            
            if (fallbackStores && fallbackStores.length > 0) {
              console.log('Found stores without connection_id, using as fallback')
              storeIds = fallbackStores.map(s => s.id)
              newStoreMap = new Map(fallbackStores.map(s => [s.id, s.name]))
            } else {
              // No stores found at all
              storeIds = []
              newStoreMap = new Map()
            }
          } else {
            storeIds = stores?.map(s => s.id) || []
            newStoreMap = new Map(stores?.map(s => [s.id, s.name]) || [])
            
            // If no stores found for this connection, also check for stores without connection_id
            if (storeIds.length === 0) {
              console.log('No stores found for connection, checking for stores without connection_id')
              const { data: fallbackStores } = await supabase
                .from('stores')
                .select('id, name')
                .eq('is_active', true)
                .is('store_connection_id', null)
              
              if (fallbackStores && fallbackStores.length > 0) {
                storeIds = fallbackStores.map(s => s.id)
                newStoreMap = new Map(fallbackStores.map(s => [s.id, s.name]))
              }
            }
          }
        } else {
          // No connection selected - show all products for the business (fallback)
          const { data: allStores, error: storesError } = await supabase
            .from('stores')
            .select('id, name')
            .eq('is_active', true)

          if (storesError) {
            console.error('Error fetching all stores:', storesError)
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
          console.error('Error fetching products:', productsError)
          // If error is related to deleted_at or column doesn't exist, try without it
          if (productsError.message?.includes('deleted_at') || productsError.code === '42703' || productsError.code === 'PGRST116') {
            console.log('Retrying query without deleted_at filter')
            const { data: retryData, error: retryError, count: retryCount } = await supabase
              .from('products')
              .select('id, name_en, name_ar, description_en, description_ar, price, sku, image_url, is_available, is_active, created_at, store_id', { count: 'exact' })
              .in('store_id', storeIds)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(100)
            
            if (retryError) {
              console.error('Error fetching products (retry):', retryError)
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
          console.log('Fetched products:', {
            count: productsData?.length || 0,
            totalCount: count || 0,
            storeIds,
            selectedConnectionId
          })
          setProducts(productsData || [])
          setTotalCount(count || 0)
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        setProducts([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [selectedConnectionId, hasInitialized])

  // Rotate sync phrases while syncing
  React.useEffect(() => {
    if (!isSyncing) {
      setCurrentSyncPhrase(0)
      return
    }

    // Update phrase more frequently to show new logs
    const interval = setInterval(() => {
      setCurrentSyncPhrase((prev) => {
        // If we have new logs, show them, otherwise cycle through
        if (syncPhrases.length > 0) {
          return (prev + 1) % syncPhrases.length
        }
        return prev
      })
    }, 1500) // Change phrase every 1.5 seconds

    return () => clearInterval(interval)
  }, [isSyncing, syncPhrases])

  // Refetch products function
  const refetchProducts = React.useCallback(async () => {
    if (!selectedConnectionId) return

    try {
      let storeIds: string[] = []
      let newStoreMap = new Map<string, string>()

      // Get stores for this connection
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('store_connection_id', selectedConnectionId)
        .eq('is_active', true)

      if (storesError || !stores || stores.length === 0) {
        return
      }

      storeIds = stores.map(s => s.id)
      newStoreMap = new Map(stores.map(s => [s.id, s.name]))
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
        console.error('Error refetching products:', productsError)
      } else if (productsData) {
        setProducts(productsData)
        setTotalCount(count || 0)
      }
    } catch (error) {
      console.error('Error refetching products:', error)
    }
  }, [selectedConnectionId])

  // Listen for sync completion events to refresh products
  React.useEffect(() => {
    const handleSyncCompleted = (event: CustomEvent) => {
      const { connectionId, success } = event.detail || {}
      console.log('Products page: Sync completed event received:', { connectionId, success, selectedConnectionId })
      
      // Refresh if sync was successful and matches selected connection, or if no connection is selected
      if (success && (connectionId === selectedConnectionId || !selectedConnectionId)) {
        console.log('Products page: Refreshing products after sync')
        // Wait a bit for the sync to fully complete in the database, then refetch
        setTimeout(() => {
          refetchProducts()
        }, 2000)
      }
    }

    window.addEventListener('productsSyncCompleted', handleSyncCompleted as EventListener)
    return () => {
      window.removeEventListener('productsSyncCompleted', handleSyncCompleted as EventListener)
    }
  }, [selectedConnectionId, refetchProducts])

  // Add log message helper (remove emojis)
  const addLog = React.useCallback((message: string) => {
    const cleanMessage = message.replace(/[🚀📡✅📦📋❌✨🔄📊💾]/g, '').trim()
    setSyncLogs(prev => [...prev, cleanMessage])
  }, [])

  // Handle sync button click
  const handleSync = React.useCallback(async () => {
    if (!selectedConnectionId || isSyncing) {
      return
    }

    setIsSyncing(true)
    setSyncLogs([]) // Clear previous logs
    setFetchedProductIds([]) // Clear product IDs
    setUpdatedProductIds([]) // Clear updated product IDs
    addLog('Starting product synchronization...')
    
    // Notify header to show syncing state - dispatch immediately
    // Use setTimeout to ensure React state updates are processed first
    // Include source: 'products' to indicate sync started from products page
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('productsSyncStarted', { 
        detail: { connectionId: selectedConnectionId, source: 'products' } 
      }))
    }, 0)
    
    // Get stores for this connection before sync starts
    let storeIds: string[] = []
    try {
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('store_connection_id', selectedConnectionId)
        .eq('is_active', true)

      if (stores && stores.length > 0) {
        storeIds = stores.map(s => s.id)
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
    }

    // Get initial product count before sync
    let initialProductIds = new Set<string>()
    let initialProductTimestamps = new Map<string, string>() // Track timestamps to detect updates
    const displayedCreatedIds = new Set<string>() // Track displayed created IDs
    const displayedUpdatedIds = new Set<string>() // Track displayed updated IDs
    const syncStartTime = new Date().toISOString() // Track when sync started
    
    try {
      const { data: initialProducts } = await supabase
        .from('products')
        .select('id, updated_at')
        .in('store_id', storeIds)
        .eq('is_active', true)

      if (initialProducts) {
        initialProductIds = new Set(initialProducts.map(p => p.id))
        initialProductTimestamps = new Map(initialProducts.map(p => [p.id, p.updated_at || '']))
      }
    } catch (error) {
      console.error('Error fetching initial products:', error)
    }
    
    // Start polling for new and updated products during sync
    let pollInterval: NodeJS.Timeout | null = null
    
    const startPolling = () => {
      // Start polling immediately, even before API call
      pollInterval = setInterval(async () => {
        if (!isSyncing && pollInterval) {
          clearInterval(pollInterval)
          return
        }
        
        try {
          const { data: currentProducts } = await supabase
            .from('products')
            .select('id, sku, created_at, updated_at')
            .in('store_id', storeIds)
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(200) // Increase limit to catch more products

          if (currentProducts && currentProducts.length > 0) {
            // Find new products that weren't in the initial set (created)
            const newProducts = currentProducts.filter(p => 
              !initialProductIds.has(p.id) && 
              !displayedCreatedIds.has(p.id)
            )
            
            // Find updated products (exist in initial set but updated_at changed recently)
            // Also check if updated_at is after sync start time
            const updatedProducts = currentProducts.filter(p => {
              if (!initialProductIds.has(p.id)) return false // Not in initial set, skip
              if (displayedUpdatedIds.has(p.id)) return false // Already displayed
              const initialTimestamp = initialProductTimestamps.get(p.id)
              const currentTimestamp = p.updated_at || ''
              
              // Check if timestamp changed
              if (initialTimestamp && currentTimestamp && initialTimestamp !== currentTimestamp) {
                // Also verify it was updated after sync started (within last 30 seconds)
                const updatedTime = new Date(currentTimestamp)
                const syncTime = new Date(syncStartTime)
                const timeDiff = (updatedTime.getTime() - syncTime.getTime()) / 1000
                return timeDiff >= -5 && timeDiff <= 30 // Allow 5 seconds before sync start and 30 seconds after
              }
              return false
            })
            
            // Add new product IDs that haven't been displayed yet
            if (newProducts.length > 0) {
              newProducts.forEach((product, index) => {
                displayedCreatedIds.add(product.id)
                setTimeout(() => {
                  setFetchedProductIds(prev => {
                    // Only add if not already in the array
                    if (!prev.includes(product.id)) {
                      return [...prev, product.id]
                    }
                    return prev
                  })
                }, index * 80) // Stagger the display
              })
            }

            // Add updated product IDs
            if (updatedProducts.length > 0) {
              updatedProducts.forEach((product, index) => {
                displayedUpdatedIds.add(product.id)
                setTimeout(() => {
                  setUpdatedProductIds(prev => {
                    // Only add if not already in the array
                    if (!prev.includes(product.id)) {
                      return [...prev, product.id]
                    }
                    return prev
                  })
                }, index * 80) // Stagger the display
              })
            }

            // Update initial set and timestamps
            newProducts.forEach(p => {
              initialProductIds.add(p.id)
              initialProductTimestamps.set(p.id, p.updated_at || '')
            })
            updatedProducts.forEach(p => {
              initialProductTimestamps.set(p.id, p.updated_at || '')
            })
          }
        } catch (error) {
          console.error('Error polling products:', error)
        }
      }, 400) // Poll every 400ms for faster detection
    }
    
    // Start polling immediately
    startPolling()
    
    try {
      addLog('Connecting to store API...')
      
      const response = await fetch(`/api/store-connections/${selectedConnectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' }),
      })

      if (!response.ok) {
        if (pollInterval) clearInterval(pollInterval)
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        addLog(`Error: ${errorData.error || `HTTP ${response.status}`}`)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      addLog('Connection established')

      const data = await response.json()

      if (data.success) {
        addLog('Products fetched successfully')
        
        // If no product IDs were detected via polling, try to fetch them directly
        if (fetchedProductIds.length === 0 && updatedProductIds.length === 0) {
          // Fetch recently updated/created products
          try {
            const { data: recentProducts } = await supabase
              .from('products')
              .select('id, updated_at, created_at')
              .in('store_id', storeIds)
              .eq('is_active', true)
              .gte('updated_at', new Date(Date.now() - 60000).toISOString()) // Products updated in last minute
              .order('updated_at', { ascending: false })
              .limit(50)

            if (recentProducts && recentProducts.length > 0) {
              recentProducts.forEach((product, index) => {
                const wasCreated = !initialProductIds.has(product.id)
                const wasUpdated = initialProductIds.has(product.id) && 
                                  initialProductTimestamps.get(product.id) !== product.updated_at
                
                if (wasCreated) {
                  setTimeout(() => {
                    setFetchedProductIds(prev => {
                      if (!prev.includes(product.id)) {
                        return [...prev, product.id]
                      }
                      return prev
                    })
                  }, index * 100)
                } else if (wasUpdated) {
                  setTimeout(() => {
                    setUpdatedProductIds(prev => {
                      if (!prev.includes(product.id)) {
                        return [...prev, product.id]
                      }
                      return prev
                    })
                  }, index * 100)
                }
              })
            }
          } catch (error) {
            console.error('Error fetching recent products:', error)
          }
        }
        
        // Continue polling for a bit more to catch any late-arriving products
        setTimeout(() => {
          if (pollInterval) clearInterval(pollInterval)
        }, 8000) // Stop polling 8 seconds after sync completes
        
        if (data.details) {
          const { productsCreated, productsUpdated, productsSynced } = data.details
          if (productsCreated > 0) {
            addLog(`Created ${productsCreated} new product${productsCreated > 1 ? 's' : ''}`)
          }
          if (productsUpdated > 0) {
            addLog(`Updated ${productsUpdated} existing product${productsUpdated > 1 ? 's' : ''}`)
          }
          if (productsSynced > 0) {
            addLog(`Synced ${productsSynced} total product${productsSynced > 1 ? 's' : ''}`)
          }
        }
        
        addLog('Saving products to database...')
        
        // Wait a bit for sync to process, then refresh products
        // Sync is async, so we'll poll a few times to check for new products
        setTimeout(() => {
          addLog('Refreshing product list...')
          refetchProducts()
        }, 3000) // First refresh after 3 seconds
        setTimeout(() => {
          refetchProducts()
        }, 6000) // Second refresh after 6 seconds
        setTimeout(() => {
          addLog('Synchronization completed successfully')
          refetchProducts()
        }, 10000) // Final refresh after 10 seconds
        
        // Notify header that sync completed
        window.dispatchEvent(new CustomEvent('productsSyncCompleted', { detail: { connectionId: selectedConnectionId, success: true } }))
      } else {
        if (pollInterval) clearInterval(pollInterval)
        addLog(`Sync failed: ${data.error || 'Unknown error'}`)
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error) {
      if (pollInterval) clearInterval(pollInterval)
      console.error('Error syncing products:', error)
      addLog(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Notify header that sync failed
      window.dispatchEvent(new CustomEvent('productsSyncCompleted', { detail: { connectionId: selectedConnectionId, success: false } }))
    } finally {
      setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval)
        setIsSyncing(false)
      }, 500) // Small delay to show final log message
    }
  }, [selectedConnectionId, isSyncing, refetchProducts, addLog])

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
          {selectedConnectionId && isExternalStore && (
            <div className="mt-2 w-full flex flex-col items-center">
              {isSyncing ? (
                <div className="flex items-center gap-2">
                  <AnimateIcon animate={isSyncing} loop={isSyncing} animation="fill">
                    <Sparkles size={16} className="text-gray-300 flex-shrink-0" />
                  </AnimateIcon>
                  <span
                    className={cn(
                      'text-sm font-medium text-gray-600 whitespace-nowrap shimmer-text'
                    )}
                    style={{
                      animation: 'shimmer 6s linear infinite',
                    }}
                  >
                    {syncPhrases[currentSyncPhrase] || 'Syncing products...'}
                  </span>
                </div>
              ) : (
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-auto bg-gray-100 hover:bg-gray-200 text-gray-900 group"
                >
                  <RefreshCw className={cn(
                    "mr-2 h-4 w-4 transition-transform duration-200",
                    !isSyncing && "group-hover:rotate-90"
                  )} />
                  Sync Products
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
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
