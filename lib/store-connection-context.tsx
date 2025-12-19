'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'

interface StoreConnection {
  id: string
  platform: string
  store_external_id: string | null
  connection_status?: string
  sync_status?: string
}

interface StoreConnectionContextType {
  selectedConnection: StoreConnection | null
  setSelectedConnection: (connection: StoreConnection | null) => void
  selectedConnectionId: string | null
  setSelectedConnectionId: (id: string | null) => void
  isAnyStoreSyncing: boolean
  isChangingStore: boolean
}

const StoreConnectionContext = createContext<StoreConnectionContextType | undefined>(undefined)

export function StoreConnectionProvider({ children }: { children: ReactNode }) {
  const [selectedConnectionId, setSelectedConnectionIdState] = useState<string | null>(null)
  const [selectedConnection, setSelectedConnectionState] = useState<StoreConnection | null>(null)
  const [isAnyStoreSyncing, setIsAnyStoreSyncing] = useState(false)
  const [isChangingStore, setIsChangingStore] = useState(false)
  const { user } = useAuth()
  const hasAutoSelectedRef = React.useRef(false)
  const userId = user?.id ?? null
  const syncCheckIntervalRef = React.useRef<NodeJS.Timeout | null>(null)
  const changingStoreTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const selectedConnectionIdRef = React.useRef<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('selectedStoreConnectionId')
    if (savedId) {
      setSelectedConnectionIdState(savedId)
    }
  }, [])

  // Auto-select latest store if no selection exists and user is logged in
  useEffect(() => {
    if (!userId || hasAutoSelectedRef.current) return
    
    // Wait a bit for localStorage to be checked first
    const checkAndAutoSelect = async () => {
      // Small delay to ensure localStorage check has completed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if we already have a selection (from localStorage or current state)
      const savedSelection = localStorage.getItem('selectedStoreConnectionId')
      const currentSelection = selectedConnectionId || savedSelection
      
      if (currentSelection) {
        // Verify the saved connection still exists
        try {
          const { data: connection } = await supabase
            .from('store_connections')
            .select('id')
            .eq('id', currentSelection)
            .eq('user_id', userId)
            .maybeSingle()

          if (connection) {
            // Valid selection exists, ensure it's set in state
            if (!selectedConnectionId) {
              setSelectedConnectionIdState(currentSelection)
            }
            hasAutoSelectedRef.current = true
            return
          }
        } catch (error) {
          console.error('Error verifying saved connection:', error)
        }
      }

      // No valid selection exists, get latest store connection
      try {
        const { data: connections } = await supabase
          .from('store_connections')
          .select('id, platform, store_external_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (connections && connections.length > 0) {
          const latestConnection = connections[0]
          setSelectedConnectionIdState(latestConnection.id)
          localStorage.setItem('selectedStoreConnectionId', latestConnection.id)
          window.dispatchEvent(new CustomEvent('storeConnectionChanged', { detail: latestConnection.id }))
          hasAutoSelectedRef.current = true
        }
      } catch (error) {
        console.error('Error auto-selecting store:', error)
      }
    }

    checkAndAutoSelect()
  }, [userId])

  // Check if any store is syncing
  React.useEffect(() => {
    if (!userId) {
      setIsAnyStoreSyncing(false)
      return
    }

    const checkSyncingStatus = async () => {
      try {
        const { data: connections } = await supabase
          .from('store_connections')
          .select('id, sync_status')
          .eq('user_id', userId)

        const isSyncing = connections?.some(conn => conn.sync_status === 'syncing') || false
        setIsAnyStoreSyncing(isSyncing)
      } catch (error) {
        console.error('Error checking sync status:', error)
      }
    }

    // Check immediately
    checkSyncingStatus()

    // Poll every 2 seconds to check sync status
    syncCheckIntervalRef.current = setInterval(checkSyncingStatus, 2000)

    return () => {
      if (syncCheckIntervalRef.current) {
        clearInterval(syncCheckIntervalRef.current)
      }
    }
  }, [userId])

  // Listen for store connection changes
  useEffect(() => {
    const handleConnectionChange = (event: CustomEvent) => {
      const connectionId = event.detail
      // Update state directly - don't trigger loading here since setSelectedConnectionId already handles it
      setSelectedConnectionIdState(connectionId)
      localStorage.setItem('selectedStoreConnectionId', connectionId)
    }

    window.addEventListener('storeConnectionChanged', handleConnectionChange as EventListener)
    return () => {
      window.removeEventListener('storeConnectionChanged', handleConnectionChange as EventListener)
      // Don't clear timeout here - it should complete naturally
      // Only clear on unmount (handled by separate cleanup effect)
    }
  }, []) // Empty deps - listener should persist, don't recreate on state changes

  // Keep ref in sync with state
  useEffect(() => {
    selectedConnectionIdRef.current = selectedConnectionId
  }, [selectedConnectionId])

  const setSelectedConnectionId = (id: string | null) => {
    const previousId = selectedConnectionId
    
    // Only show loading if it's a different store (not initial load)
    if (previousId && previousId !== id) {
      // Clear any existing timeout
      if (changingStoreTimeoutRef.current) {
        clearTimeout(changingStoreTimeoutRef.current)
        changingStoreTimeoutRef.current = null
      }
      
      // Show loading immediately when store changes
      setIsChangingStore(true)
      
      // Hide loading after transition completes
      const timeoutId = setTimeout(() => {
        // Check if this timeout was cleared (another timeout replaced it)
        if (changingStoreTimeoutRef.current !== timeoutId) {
          return
        }
        setIsChangingStore(false)
        changingStoreTimeoutRef.current = null
      }, 800) // Display for 800ms
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

  const setSelectedConnection = (connection: StoreConnection | null) => {
    setSelectedConnectionState(connection)
    if (connection) {
      setSelectedConnectionId(connection.id)
    } else {
      setSelectedConnectionId(null)
    }
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
    <StoreConnectionContext.Provider
      value={{
        selectedConnection,
        setSelectedConnection,
        selectedConnectionId,
        setSelectedConnectionId,
        isAnyStoreSyncing,
        isChangingStore,
      }}
    >
      {children}
    </StoreConnectionContext.Provider>
  )
}

export function useStoreConnection() {
  const context = useContext(StoreConnectionContext)
  if (context === undefined) {
    throw new Error('useStoreConnection must be used within a StoreConnectionProvider')
  }
  return context
}

