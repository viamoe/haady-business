import { useState, useCallback } from 'react'
import type { Product } from './use-product-fetch'

interface EditHistoryEntry {
  id: string
  changes: Record<string, { old_value: unknown; new_value: unknown }>
  editType: string
  createdAt: string
  editedBy: { id: string; email: string; name: string } | null
}

/**
 * Custom hook for managing product dialog/modal states
 * Consolidates all dialog-related state management
 */
export function useProductDialogs() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [productImages, setProductImages] = useState<Array<{
    id: string
    url: string
    is_primary: boolean
    display_order: number
  }>>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isConnectStoreModalOpen, setIsConnectStoreModalOpen] = useState(false)

  const openForm = useCallback((product?: Product | null) => {
    setEditingProduct(product || null)
    setIsFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setIsFormOpen(false)
    setEditingProduct(null)
  }, [])

  const openViewDialog = useCallback((product: Product) => {
    setViewingProduct(product)
  }, [])

  const closeViewDialog = useCallback(() => {
    setViewingProduct(null)
    setProductImages([])
    setCurrentImageIndex(0)
  }, [])

  const openConnectStoreModal = useCallback(() => {
    setIsConnectStoreModalOpen(true)
  }, [])

  const closeConnectStoreModal = useCallback(() => {
    setIsConnectStoreModalOpen(false)
  }, [])

  return {
    // Form dialog
    isFormOpen,
    editingProduct,
    openForm,
    closeForm,
    // View dialog
    viewingProduct,
    productImages,
    setProductImages,
    currentImageIndex,
    setCurrentImageIndex,
    openViewDialog,
    closeViewDialog,
    // Edit history
    editHistory,
    setEditHistory,
    isLoadingHistory,
    setIsLoadingHistory,
    // Connect store modal
    isConnectStoreModalOpen,
    openConnectStoreModal,
    closeConnectStoreModal,
  }
}

