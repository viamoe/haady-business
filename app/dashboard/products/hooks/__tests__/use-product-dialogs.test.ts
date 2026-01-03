import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProductDialogs } from '../use-product-dialogs'
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

describe('useProductDialogs', () => {
  describe('form dialog', () => {
    it('should initialize with closed form', () => {
      const { result } = renderHook(() => useProductDialogs())

      expect(result.current.isFormOpen).toBe(false)
      expect(result.current.editingProduct).toBeNull()
    })

    it('should open form with product', () => {
      const { result } = renderHook(() => useProductDialogs())

      act(() => {
        result.current.openForm(mockProduct)
      })

      expect(result.current.isFormOpen).toBe(true)
      expect(result.current.editingProduct).toEqual(mockProduct)
    })

    it('should open form without product (new product)', () => {
      const { result } = renderHook(() => useProductDialogs())

      act(() => {
        result.current.openForm()
      })

      expect(result.current.isFormOpen).toBe(true)
      expect(result.current.editingProduct).toBeNull()
    })

    it('should close form', () => {
      const { result } = renderHook(() => useProductDialogs())

      act(() => {
        result.current.openForm(mockProduct)
      })

      expect(result.current.isFormOpen).toBe(true)

      act(() => {
        result.current.closeForm()
      })

      expect(result.current.isFormOpen).toBe(false)
      expect(result.current.editingProduct).toBeNull()
    })
  })

  describe('view dialog', () => {
    it('should initialize with no viewing product', () => {
      const { result } = renderHook(() => useProductDialogs())

      expect(result.current.viewingProduct).toBeNull()
      expect(result.current.productImages).toHaveLength(0)
      expect(result.current.currentImageIndex).toBe(0)
    })

    it('should open view dialog', () => {
      const { result } = renderHook(() => useProductDialogs())

      act(() => {
        result.current.openViewDialog(mockProduct)
      })

      expect(result.current.viewingProduct).toEqual(mockProduct)
    })

    it('should close view dialog and reset images', () => {
      const { result } = renderHook(() => useProductDialogs())

      act(() => {
        result.current.openViewDialog(mockProduct)
        result.current.setProductImages([
          { id: 'img-1', url: 'url-1', is_primary: true, display_order: 1 },
        ])
        result.current.setCurrentImageIndex(1)
      })

      expect(result.current.viewingProduct).not.toBeNull()
      expect(result.current.productImages).toHaveLength(1)

      act(() => {
        result.current.closeViewDialog()
      })

      expect(result.current.viewingProduct).toBeNull()
      expect(result.current.productImages).toHaveLength(0)
      expect(result.current.currentImageIndex).toBe(0)
    })
  })

  describe('edit history', () => {
    it('should manage edit history state', () => {
      const { result } = renderHook(() => useProductDialogs())

      const mockHistory = [
        {
          id: 'history-1',
          changes: { price: { old_value: 100, new_value: 150 } },
          editType: 'update',
          createdAt: '2024-01-01T00:00:00Z',
          editedBy: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        },
      ]

      act(() => {
        result.current.setEditHistory(mockHistory)
      })

      expect(result.current.editHistory).toHaveLength(1)
      expect(result.current.editHistory[0].id).toBe('history-1')
    })

    it('should manage loading state', () => {
      const { result } = renderHook(() => useProductDialogs())

      expect(result.current.isLoadingHistory).toBe(false)

      act(() => {
        result.current.setIsLoadingHistory(true)
      })

      expect(result.current.isLoadingHistory).toBe(true)
    })
  })

  describe('connect store modal', () => {
    it('should manage connect store modal state', () => {
      const { result } = renderHook(() => useProductDialogs())

      expect(result.current.isConnectStoreModalOpen).toBe(false)

      act(() => {
        result.current.openConnectStoreModal()
      })

      expect(result.current.isConnectStoreModalOpen).toBe(true)

      act(() => {
        result.current.closeConnectStoreModal()
      })

      expect(result.current.isConnectStoreModalOpen).toBe(false)
    })
  })
})

