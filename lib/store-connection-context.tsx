'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
}

const StoreConnectionContext = createContext<StoreConnectionContextType | undefined>(undefined)

export function StoreConnectionProvider({ children }: { children: ReactNode }) {
  const [selectedConnectionId, setSelectedConnectionIdState] = useState<string | null>(null)
  const [selectedConnection, setSelectedConnectionState] = useState<StoreConnection | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('selectedStoreConnectionId')
    if (savedId) {
      setSelectedConnectionIdState(savedId)
    }
  }, [])

  // Listen for store connection changes
  useEffect(() => {
    const handleConnectionChange = (event: CustomEvent) => {
      const connectionId = event.detail
      setSelectedConnectionIdState(connectionId)
      localStorage.setItem('selectedStoreConnectionId', connectionId)
    }

    window.addEventListener('storeConnectionChanged', handleConnectionChange as EventListener)
    return () => {
      window.removeEventListener('storeConnectionChanged', handleConnectionChange as EventListener)
    }
  }, [])

  const setSelectedConnectionId = (id: string | null) => {
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

  return (
    <StoreConnectionContext.Provider
      value={{
        selectedConnection,
        setSelectedConnection,
        selectedConnectionId,
        setSelectedConnectionId,
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

