'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'

// Native Haady store - the primary entity
interface Store {
  id: string
  name: string
  name_ar?: string | null
  logo_url?: string | null
  platform: string
  is_active: boolean
}

// External store connection - optional, for connecting to Salla/Zid/Shopify
interface StoreConnection {
  id: string
  platform: string
  store_external_id: string | null
  external_store_name?: string | null
  connection_status?: string
  sync_status?: string
}

interface StoreContextType {
  // Primary store (native Haady store)
  store: Store | null
  storeId: string | null
  isLoadingStore: boolean
  
  // Optional external connections
  storeConnections: StoreConnection[]
  selectedConnection: StoreConnection | null
  selectedConnectionId: string | null
  setSelectedConnectionId: (id: string | null) => void
  isAnyStoreSyncing: boolean
  isChangingStore: boolean
  
  // Refresh function
  refreshStore: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreConnectionProvider({ children }: { children: ReactNode }) {
  // Primary store state
  const [store, setStore] = useState<Store | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [isLoadingStore, setIsLoadingStore] = useState(true)
  
  // External connections state (optional)
  const [storeConnections, setStoreConnections] = useState<StoreConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionIdState] = useState<string | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<StoreConnection | null>(null)
  const [isAnyStoreSyncing, setIsAnyStoreSyncing] = useState(false)
  const [isChangingStore, setIsChangingStore] = useState(false)
  
  const { user } = useAuth()
  const userId = user?.id ?? null
  const syncCheckIntervalRef = React.useRef<NodeJS.Timeout | null>(null)
  const changingStoreTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Fetch the user's primary store from business_profile -> stores
  const fetchStore = async () => {
    if (!userId) {
      setStore(null)
      setStoreId(null)
      setIsLoadingStore(false)
      return
    }

    setIsLoadingStore(true)
    
    try {
      // Get user's store_id from business_profile
      const { data: profile, error: profileError } = await supabase
        .from('business_profile')
        .select('store_id')
        .eq('auth_user_id', userId)
        .maybeSingle()
      
      if (profileError) {
        console.error('Error fetching business profile:', profileError)
        setStore(null)
        setStoreId(null)
        setIsLoadingStore(false)
        return
      }
      
      if (!profile?.store_id) {
        // User doesn't have a store yet (might still be in onboarding)
        setStore(null)
        setStoreId(null)
        setIsLoadingStore(false)
        return
      }
      
      // Fetch the store details
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name, name_ar, logo_url, platform, is_active')
        .eq('id', profile.store_id)
        .maybeSingle()
      
      if (storeError) {
        console.error('Error fetching store:', storeError)
        setStore(null)
        setStoreId(profile.store_id) // Keep the ID even if fetch failed
        setIsLoadingStore(false)
        return
      }
      
      setStore(storeData)
      setStoreId(storeData?.id || profile.store_id)
      
      // Also fetch any external connections for this store (optional)
      const { data: connections } = await supabase
        .from('store_connections')
        .select('id, platform, store_external_id, external_store_name, connection_status, sync_status')
        .eq('store_id', profile.store_id)
        .order('created_at', { ascending: false })
      
      setStoreConnections(connections || [])
      
      // Auto-select first connection if none selected
      if (connections && connections.length > 0 && !selectedConnectionId) {
        const savedId = localStorage.getItem('selectedStoreConnectionId')
        const validSavedConnection = connections.find(c => c.id === savedId)
        
        if (validSavedConnection) {
          setSelectedConnectionIdState(savedId)
          setSelectedConnection(validSavedConnection)
        } else {
          // Select the first one
          setSelectedConnectionIdState(connections[0].id)
          setSelectedConnection(connections[0])
          localStorage.setItem('selectedStoreConnectionId', connections[0].id)
        }
      }
      
    } catch (error) {
      console.error('Exception fetching store:', error)
      setStore(null)
      setStoreId(null)
    } finally {
      setIsLoadingStore(false)
    }
  }

  // Load store on mount and when user changes
  useEffect(() => {
    fetchStore()
  }, [userId])

  // Check if any external store is syncing (optional feature)
  useEffect(() => {
    if (!storeId) {
      setIsAnyStoreSyncing(false)
      return
    }

    const checkSyncingStatus = async () => {
      try {
        const { data: connections } = await supabase
          .from('store_connections')
          .select('id, sync_status')
          .eq('store_id', storeId)

        const isSyncing = connections?.some(conn => conn.sync_status === 'syncing') || false
        setIsAnyStoreSyncing(isSyncing)
      } catch (error) {
        console.error('Error checking sync status:', error)
      }
    }

    // Check immediately
    checkSyncingStatus()

    // Poll every 5 seconds to check sync status (reduced frequency since it's optional)
    syncCheckIntervalRef.current = setInterval(checkSyncingStatus, 5000)

    return () => {
      if (syncCheckIntervalRef.current) {
        clearInterval(syncCheckIntervalRef.current)
      }
    }
  }, [storeId])

  // Update selected connection when storeConnections or selectedConnectionId changes
  useEffect(() => {
    if (selectedConnectionId && storeConnections.length > 0) {
      const connection = storeConnections.find(c => c.id === selectedConnectionId)
      setSelectedConnection(connection || null)
    } else {
      setSelectedConnection(null)
    }
  }, [selectedConnectionId, storeConnections])

  const setSelectedConnectionId = (id: string | null) => {
    const previousId = selectedConnectionId
    
    // Only show loading if it's a different connection
    if (previousId && previousId !== id) {
      if (changingStoreTimeoutRef.current) {
        clearTimeout(changingStoreTimeoutRef.current)
        changingStoreTimeoutRef.current = null
      }
      
      setIsChangingStore(true)
      
      const timeoutId = setTimeout(() => {
        if (changingStoreTimeoutRef.current !== timeoutId) {
          return
        }
        setIsChangingStore(false)
        changingStoreTimeoutRef.current = null
      }, 800)
      changingStoreTimeoutRef.current = timeoutId
    }
    
    setSelectedConnectionIdState(id)
    if (id) {
      localStorage.setItem('selectedStoreConnectionId', id)
    } else {
      localStorage.removeItem('selectedStoreConnectionId')
    }
    window.dispatchEvent(new CustomEvent('storeConnectionChanged', { detail: id }))
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (changingStoreTimeoutRef.current) {
        clearTimeout(changingStoreTimeoutRef.current)
        changingStoreTimeoutRef.current = null
      }
      setIsChangingStore(false)
    }
  }, [])

  return (
    <StoreContext.Provider
      value={{
        // Primary store
        store,
        storeId,
        isLoadingStore,
        
        // External connections (optional)
        storeConnections,
        selectedConnection,
        selectedConnectionId,
        setSelectedConnectionId,
        isAnyStoreSyncing,
        isChangingStore,
        
        // Refresh
        refreshStore: fetchStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStoreConnection() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStoreConnection must be used within a StoreConnectionProvider')
  }
  return context
}

// Alias for clearer naming
export const useStore = useStoreConnection
