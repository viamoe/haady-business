import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProductState } from '../use-product-state'
import type { Product } from '../use-product-fetch'

const mockProduct: Product = {
  id: 'product-1',
  name_en: 'Test Product',
  name_ar: 'منتج تجريبي',
  description_en: 'Test description',
  description_ar: null,
  price: 100,
  sku: 'SKU-001',
  barcode: null,
  barcode_type: null,
  image_url: null,
  is_available: true,
  is_active: true,
  is_published: true,
  created_at: '2024-01-01T00:00:00Z',
  store_id: 'store-1',
  status: 'active',
}

const mockDraftProduct: Product = {
  ...mockProduct,
  id: 'product-2',
  status: 'draft',
}

const mockArchivedProduct: Product = {
  ...mockProduct,
  id: 'product-3',
  status: 'archived',
}

describe('useProductState', () => {
  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useProductState())

      expect(result.current.allProducts).toHaveLength(0)
      expect(result.current.trashedProducts).toHaveLength(0)
      expect(result.current.selectedStatusTab).toBe('all')
      expect(result.current.searchValue).toBe('')
      expect(result.current.localStorageDraft).toBeNull()
    })

    it('should initialize with provided products', () => {
      const { result } = renderHook(() => useProductState([mockProduct]))

      expect(result.current.allProducts).toHaveLength(1)
      expect(result.current.allProducts[0].id).toBe('product-1')
    })
  })

  describe('status counts', () => {
    it('should calculate status counts correctly', () => {
      const { result } = renderHook(() =>
        useProductState([mockProduct, mockDraftProduct, mockArchivedProduct])
      )

      expect(result.current.statusCounts.all).toBe(3)
      expect(result.current.statusCounts.active).toBe(1)
      expect(result.current.statusCounts.draft).toBe(1)
      expect(result.current.statusCounts.archived).toBe(1)
      expect(result.current.statusCounts.trash).toBe(0)
    })

    it('should include localStorage draft in counts', () => {
      const { result } = renderHook(() => useProductState([mockProduct]))

      act(() => {
        result.current.setLocalStorageDraft({
          nameEn: 'Draft Product',
          nameAr: '',
          descriptionEn: '',
          price: '50',
          storeId: 'store-1',
          lastSavedAt: new Date().toISOString(),
        })
      })

      expect(result.current.statusCounts.all).toBe(2) // 1 product + 1 draft
      expect(result.current.statusCounts.draft).toBe(1)
    })
  })

  describe('filtered products', () => {
    it('should filter by status tab', () => {
      const { result } = renderHook(() =>
        useProductState([mockProduct, mockDraftProduct, mockArchivedProduct])
      )

      act(() => {
        result.current.setSelectedStatusTab('active')
      })

      expect(result.current.filteredProducts).toHaveLength(1)
      expect(result.current.filteredProducts[0].status).toBe('active')
    })

    it('should filter by search value', () => {
      const { result } = renderHook(() => useProductState([mockProduct]))

      act(() => {
        result.current.setSearchValue('Test')
      })

      expect(result.current.filteredProducts).toHaveLength(1)

      act(() => {
        result.current.setSearchValue('Nonexistent')
      })

      expect(result.current.filteredProducts).toHaveLength(0)
    })

    it('should filter by Arabic name', () => {
      const { result } = renderHook(() => useProductState([mockProduct]))

      act(() => {
        result.current.setSearchValue('تجريبي')
      })

      expect(result.current.filteredProducts).toHaveLength(1)
    })

    it('should filter by SKU', () => {
      const { result } = renderHook(() => useProductState([mockProduct]))

      act(() => {
        result.current.setSearchValue('SKU-001')
      })

      expect(result.current.filteredProducts).toHaveLength(1)
    })

    it('should combine status and search filters', () => {
      const { result } = renderHook(() =>
        useProductState([mockProduct, mockDraftProduct])
      )

      act(() => {
        result.current.setSelectedStatusTab('draft')
        result.current.setSearchValue('Test')
      })

      expect(result.current.filteredProducts).toHaveLength(1)
      expect(result.current.filteredProducts[0].status).toBe('draft')
    })

    it('should include localStorage draft in draft tab', () => {
      const { result } = renderHook(() => useProductState([mockProduct]))

      act(() => {
        result.current.setLocalStorageDraft({
          nameEn: 'Draft Product',
          nameAr: '',
          descriptionEn: '',
          price: '50',
          storeId: 'store-1',
          lastSavedAt: new Date().toISOString(),
        })
        result.current.setSelectedStatusTab('draft')
      })

      expect(result.current.filteredProducts).toHaveLength(1)
      expect(result.current.filteredProducts[0].id).toBe('local-draft')
    })
  })

  describe('localStorage draft', () => {
    it('should convert localStorage draft to product', () => {
      const { result } = renderHook(() => useProductState())

      act(() => {
        result.current.setLocalStorageDraft({
          nameEn: 'Draft Product',
          nameAr: 'منتج مسودة',
          descriptionEn: 'Draft description',
          price: '99.99',
          storeId: 'store-1',
          lastSavedAt: '2024-01-01T00:00:00Z',
        })
      })

      expect(result.current.localStorageDraftAsProduct).not.toBeNull()
      expect(result.current.localStorageDraftAsProduct?.name_en).toBe('Draft Product')
      expect(result.current.localStorageDraftAsProduct?.name_ar).toBe('منتج مسودة')
      expect(result.current.localStorageDraftAsProduct?.price).toBe(99.99)
      expect(result.current.localStorageDraftAsProduct?.status).toBe('draft')
    })

    it('should clear localStorage draft', () => {
      // Mock localStorage
      const localStorageMock = {
        removeItem: vi.fn(),
        getItem: vi.fn(),
        setItem: vi.fn(),
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      })

      const { result } = renderHook(() => useProductState())

      act(() => {
        result.current.setLocalStorageDraft({
          nameEn: 'Draft',
          nameAr: '',
          descriptionEn: '',
          price: '50',
          storeId: 'store-1',
          lastSavedAt: new Date().toISOString(),
        })
      })

      expect(result.current.localStorageDraft).not.toBeNull()

      act(() => {
        result.current.clearLocalStorageDraft()
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('product_form_draft')
      expect(result.current.localStorageDraft).toBeNull()
      expect(result.current.localStorageDraftAsProduct).toBeNull()
    })

    it('should dismiss draft banner', () => {
      const { result } = renderHook(() => useProductState())

      expect(result.current.isDraftBannerDismissed).toBe(false)

      act(() => {
        result.current.dismissDraftBanner()
      })

      expect(result.current.isDraftBannerDismissed).toBe(true)
    })
  })

  describe('trash tab', () => {
    it('should return trashed products for trash tab', () => {
      const { result } = renderHook(() => useProductState())

      act(() => {
        result.current.setTrashedProducts([mockProduct])
        result.current.setSelectedStatusTab('trash')
      })

      expect(result.current.filteredProducts).toHaveLength(1)
      expect(result.current.filteredProducts[0].id).toBe('product-1')
    })

    it('should filter trashed products by search', () => {
      const { result } = renderHook(() => useProductState())

      act(() => {
        result.current.setTrashedProducts([mockProduct])
        result.current.setSelectedStatusTab('trash')
        result.current.setSearchValue('Test')
      })

      expect(result.current.filteredProducts).toHaveLength(1)

      act(() => {
        result.current.setSearchValue('Nonexistent')
      })

      expect(result.current.filteredProducts).toHaveLength(0)
    })
  })
})

