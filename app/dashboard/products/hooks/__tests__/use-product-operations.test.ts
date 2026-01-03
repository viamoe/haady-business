import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProductOperations } from '../use-product-operations'
import type { Product } from '../use-product-fetch'

const mockProduct: Product = {
  id: 'product-1',
  name_en: 'Test Product',
  name_ar: null,
  description_en: null,
  description_ar: null,
  price: 100,
  sku: null,
  barcode: null,
  barcode_type: null,
  image_url: null,
  is_available: true,
  is_active: true,
  is_published: true,
  created_at: '2024-01-01T00:00:00Z',
  store_id: 'store-1',
}

describe('useProductOperations', () => {
  describe('delete operations', () => {
    it('should manage single delete state', () => {
      const { result } = renderHook(() => useProductOperations())

      expect(result.current.deletingProduct).toBeNull()
      expect(result.current.isDeleting).toBe(false)

      act(() => {
        result.current.setDeletingProduct(mockProduct)
        result.current.setIsDeleting(true)
      })

      expect(result.current.deletingProduct).toEqual(mockProduct)
      expect(result.current.isDeleting).toBe(true)

      act(() => {
        result.current.clearDeleteState()
      })

      expect(result.current.deletingProduct).toBeNull()
      expect(result.current.isDeleting).toBe(false)
    })

    it('should manage bulk delete state', () => {
      const { result } = renderHook(() => useProductOperations())

      expect(result.current.bulkDeletingProducts).toHaveLength(0)
      expect(result.current.isBulkDeleting).toBe(false)

      act(() => {
        result.current.setBulkDeletingProducts([mockProduct])
        result.current.setIsBulkDeleting(true)
      })

      expect(result.current.bulkDeletingProducts).toHaveLength(1)
      expect(result.current.isBulkDeleting).toBe(true)

      act(() => {
        result.current.clearDeleteState()
      })

      expect(result.current.bulkDeletingProducts).toHaveLength(0)
      expect(result.current.isBulkDeleting).toBe(false)
    })
  })

  describe('restore operations', () => {
    it('should manage single restore state', () => {
      const { result } = renderHook(() => useProductOperations())

      expect(result.current.restoringProduct).toBeNull()
      expect(result.current.isRestoring).toBe(false)

      act(() => {
        result.current.setRestoringProduct(mockProduct)
        result.current.setIsRestoring(true)
      })

      expect(result.current.restoringProduct).toEqual(mockProduct)
      expect(result.current.isRestoring).toBe(true)

      act(() => {
        result.current.clearRestoreState()
      })

      expect(result.current.restoringProduct).toBeNull()
      expect(result.current.isRestoring).toBe(false)
    })

    it('should manage bulk restore state', () => {
      const { result } = renderHook(() => useProductOperations())

      act(() => {
        result.current.setBulkRestoringProducts([mockProduct])
        result.current.setIsBulkRestoring(true)
      })

      expect(result.current.bulkRestoringProducts).toHaveLength(1)
      expect(result.current.isBulkRestoring).toBe(true)

      act(() => {
        result.current.clearRestoreState()
      })

      expect(result.current.bulkRestoringProducts).toHaveLength(0)
      expect(result.current.isBulkRestoring).toBe(false)
    })
  })

  describe('permanent delete operations', () => {
    it('should manage permanent delete state', () => {
      const { result } = renderHook(() => useProductOperations())

      act(() => {
        result.current.setPermanentlyDeletingProduct(mockProduct)
        result.current.setIsPermanentlyDeleting(true)
      })

      expect(result.current.permanentlyDeletingProduct).toEqual(mockProduct)
      expect(result.current.isPermanentlyDeleting).toBe(true)

      act(() => {
        result.current.clearPermanentDeleteState()
      })

      expect(result.current.permanentlyDeletingProduct).toBeNull()
      expect(result.current.isPermanentlyDeleting).toBe(false)
    })
  })

  describe('status change operations', () => {
    it('should manage single status change', () => {
      const { result } = renderHook(() => useProductOperations())

      expect(result.current.statusChangeProduct).toBeNull()
      expect(result.current.isChangingStatus).toBe(false)

      act(() => {
        result.current.setStatusChangeProduct({
          product: mockProduct,
          newStatus: 'archived',
        })
        result.current.setIsChangingStatus(true)
      })

      expect(result.current.statusChangeProduct?.newStatus).toBe('archived')
      expect(result.current.isChangingStatus).toBe(true)

      act(() => {
        result.current.clearStatusChangeState()
      })

      expect(result.current.statusChangeProduct).toBeNull()
      expect(result.current.isChangingStatus).toBe(false)
    })

    it('should manage bulk status change', () => {
      const { result } = renderHook(() => useProductOperations())

      act(() => {
        result.current.setBulkStatusChange({
          products: [mockProduct],
          newStatus: 'draft',
        })
        result.current.setIsBulkChangingStatus(true)
      })

      expect(result.current.bulkStatusChange?.newStatus).toBe('draft')
      expect(result.current.bulkStatusChange?.products).toHaveLength(1)
      expect(result.current.isBulkChangingStatus).toBe(true)

      act(() => {
        result.current.clearStatusChangeState()
      })

      expect(result.current.bulkStatusChange).toBeNull()
      expect(result.current.isBulkChangingStatus).toBe(false)
    })
  })

  describe('refresh state', () => {
    it('should manage refresh state', () => {
      const { result } = renderHook(() => useProductOperations())

      expect(result.current.isRefreshing).toBe(false)
      expect(result.current.refreshingMessage).toBe('')

      act(() => {
        result.current.setIsRefreshing(true)
        result.current.setRefreshingMessage('Refreshing products...')
      })

      expect(result.current.isRefreshing).toBe(true)
      expect(result.current.refreshingMessage).toBe('Refreshing products...')
    })
  })

  describe('selection state', () => {
    it('should clear selection', () => {
      const { result } = renderHook(() => useProductOperations())

      const initialCounter = result.current.clearSelectionCounter

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.clearSelectionCounter).toBe(initialCounter + 1)

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.clearSelectionCounter).toBe(initialCounter + 2)
    })
  })
})

