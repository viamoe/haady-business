import { useState, useCallback } from 'react'
import type { Product } from './use-product-fetch'

/**
 * Custom hook for managing product operations (delete, restore, status change)
 * Consolidates all operation-related state management
 */
export function useProductOperations() {
  // Delete operations
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [bulkDeletingProducts, setBulkDeletingProducts] = useState<Product[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Restore operations
  const [restoringProduct, setRestoringProduct] = useState<Product | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [bulkRestoringProducts, setBulkRestoringProducts] = useState<Product[]>([])
  const [isBulkRestoring, setIsBulkRestoring] = useState(false)

  // Permanent delete operations
  const [permanentlyDeletingProduct, setPermanentlyDeletingProduct] = useState<Product | null>(null)
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false)
  const [bulkPermanentlyDeletingProducts, setBulkPermanentlyDeletingProducts] = useState<Product[]>([])
  const [isBulkPermanentlyDeleting, setIsBulkPermanentlyDeleting] = useState(false)

  // Status change operations
  const [statusChangingProductId, setStatusChangingProductId] = useState<string | null>(null)
  const [statusChangeProduct, setStatusChangeProduct] = useState<{
    product: Product
    newStatus: 'active' | 'draft' | 'archived'
  } | null>(null)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [bulkStatusChange, setBulkStatusChange] = useState<{
    products: Product[]
    newStatus: 'active' | 'draft' | 'archived'
  } | null>(null)
  const [isBulkChangingStatus, setIsBulkChangingStatus] = useState(false)

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshingMessage, setRefreshingMessage] = useState<string>('')

  // Selection state
  const [clearSelectionCounter, setClearSelectionCounter] = useState(0)

  const clearDeleteState = useCallback(() => {
    setDeletingProduct(null)
    setIsDeleting(false)
    setBulkDeletingProducts([])
    setIsBulkDeleting(false)
  }, [])

  const clearRestoreState = useCallback(() => {
    setRestoringProduct(null)
    setIsRestoring(false)
    setBulkRestoringProducts([])
    setIsBulkRestoring(false)
  }, [])

  const clearPermanentDeleteState = useCallback(() => {
    setPermanentlyDeletingProduct(null)
    setIsPermanentlyDeleting(false)
    setBulkPermanentlyDeletingProducts([])
    setIsBulkPermanentlyDeleting(false)
  }, [])

  const clearStatusChangeState = useCallback(() => {
    setStatusChangingProductId(null)
    setStatusChangeProduct(null)
    setIsChangingStatus(false)
    setBulkStatusChange(null)
    setIsBulkChangingStatus(false)
  }, [])

  const clearSelection = useCallback(() => {
    setClearSelectionCounter(prev => prev + 1)
  }, [])

  return {
    // Delete
    deletingProduct,
    setDeletingProduct,
    isDeleting,
    setIsDeleting,
    bulkDeletingProducts,
    setBulkDeletingProducts,
    isBulkDeleting,
    setIsBulkDeleting,
    clearDeleteState,
    // Restore
    restoringProduct,
    setRestoringProduct,
    isRestoring,
    setIsRestoring,
    bulkRestoringProducts,
    setBulkRestoringProducts,
    isBulkRestoring,
    setIsBulkRestoring,
    clearRestoreState,
    // Permanent delete
    permanentlyDeletingProduct,
    setPermanentlyDeletingProduct,
    isPermanentlyDeleting,
    setIsPermanentlyDeleting,
    bulkPermanentlyDeletingProducts,
    setBulkPermanentlyDeletingProducts,
    isBulkPermanentlyDeleting,
    setIsBulkPermanentlyDeleting,
    clearPermanentDeleteState,
    // Status change
    statusChangingProductId,
    setStatusChangingProductId,
    statusChangeProduct,
    setStatusChangeProduct,
    isChangingStatus,
    setIsChangingStatus,
    bulkStatusChange,
    setBulkStatusChange,
    isBulkChangingStatus,
    setIsBulkChangingStatus,
    clearStatusChangeState,
    // Refresh
    isRefreshing,
    setIsRefreshing,
    refreshingMessage,
    setRefreshingMessage,
    // Selection
    clearSelectionCounter,
    clearSelection,
  }
}

