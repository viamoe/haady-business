import { useState, useCallback, useMemo } from 'react'
import type { Product } from './use-product-fetch'

type StatusTab = 'all' | 'active' | 'draft' | 'archived' | 'trash'

interface LocalStorageDraft {
  nameEn: string
  nameAr: string
  descriptionEn: string
  price: string
  storeId: string
  lastSavedAt: string
}

/**
 * Custom hook for managing product list state and filtering
 */
export function useProductState(initialProducts: Product[] = []) {
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts)
  const [trashedProducts, setTrashedProducts] = useState<Product[]>([])
  const [selectedStatusTab, setSelectedStatusTab] = useState<StatusTab>('all')
  const [searchValue, setSearchValue] = useState('')
  const [localStorageDraft, setLocalStorageDraft] = useState<LocalStorageDraft | null>(null)
  const [isDraftBannerDismissed, setIsDraftBannerDismissed] = useState(false)

  // Convert localStorage draft to a Product-like object for display
  const localStorageDraftAsProduct = useMemo<Product | null>(() => {
    if (!localStorageDraft) return null
    return {
      id: 'local-draft',
      name_en: localStorageDraft.nameEn || null,
      name_ar: localStorageDraft.nameAr || null,
      description_en: localStorageDraft.descriptionEn || null,
      description_ar: null,
      price: localStorageDraft.price ? parseFloat(localStorageDraft.price) : null,
      sku: null,
      barcode: null,
      barcode_type: null,
      image_url: null,
      is_available: false,
      is_active: false,
      is_published: false,
      created_at: localStorageDraft.lastSavedAt || new Date().toISOString(),
      store_id: localStorageDraft.storeId || '',
      status: 'draft' as const,
      quantity: 0,
    }
  }, [localStorageDraft])

  // Calculate status counts
  const statusCounts = useMemo<Record<StatusTab, number>>(() => {
    const counts: Record<StatusTab, number> = {
      all: 0,
      active: 0,
      draft: 0,
      archived: 0,
      trash: 0
    }

    counts.all = allProducts.length + (localStorageDraftAsProduct ? 1 : 0)
    counts.trash = trashedProducts.length

    allProducts.forEach(product => {
      const status = product.status || 'active'
      if (!product.status || product.status === 'active') {
        counts.active++
      } else if (status === 'draft') {
        counts.draft++
      } else if (status === 'archived') {
        counts.archived++
      }
    })

    if (localStorageDraftAsProduct) {
      counts.draft++
    }

    return counts
  }, [allProducts, trashedProducts, localStorageDraftAsProduct])

  // Filter products based on selected tab and search
  const filteredProducts = useMemo(() => {
    // Trash tab
    if (selectedStatusTab === 'trash') {
      let products = trashedProducts
      if (searchValue.trim()) {
        const searchLower = searchValue.toLowerCase()
        products = products.filter(product => {
          const nameEn = product.name_en?.toLowerCase() || ''
          const nameAr = product.name_ar?.toLowerCase() || ''
          const sku = product.sku?.toLowerCase() || ''
          return nameEn.includes(searchLower) || nameAr.includes(searchLower) || sku.includes(searchLower)
        })
      }
      return products
    }

    // Other tabs
    let products = allProducts

    // Apply status filter
    if (selectedStatusTab === 'active') {
      products = products.filter(p => !p.status || p.status === 'active')
    } else if (selectedStatusTab === 'draft') {
      products = products.filter(p => p.status === 'draft')
    } else if (selectedStatusTab === 'archived') {
      products = products.filter(p => p.status === 'archived')
    }

    // Add localStorage draft to draft tab
    if (selectedStatusTab === 'draft' && localStorageDraftAsProduct) {
      products = [localStorageDraftAsProduct, ...products]
    }

    // Apply search filter
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase()
      products = products.filter(product => {
        if (product.id === 'local-draft') {
          const draftNameEn = localStorageDraft?.nameEn?.toLowerCase() || ''
          const draftNameAr = localStorageDraft?.nameAr?.toLowerCase() || ''
          return draftNameEn.includes(searchLower) || draftNameAr.includes(searchLower)
        }
        const nameEn = product.name_en?.toLowerCase() || ''
        const nameAr = product.name_ar?.toLowerCase() || ''
        const sku = product.sku?.toLowerCase() || ''
        return nameEn.includes(searchLower) || nameAr.includes(searchLower) || sku.includes(searchLower)
      })
    }

    return products
  }, [allProducts, trashedProducts, selectedStatusTab, searchValue, localStorageDraft, localStorageDraftAsProduct])

  const clearLocalStorageDraft = useCallback(() => {
    try {
      localStorage.removeItem('product_form_draft')
      setLocalStorageDraft(null)
      setIsDraftBannerDismissed(false)
    } catch (error) {
      console.error('Error clearing localStorage draft:', error)
    }
  }, [])

  const dismissDraftBanner = useCallback(() => {
    setIsDraftBannerDismissed(true)
  }, [])

  return {
    // State
    allProducts,
    setAllProducts,
    trashedProducts,
    setTrashedProducts,
    selectedStatusTab,
    setSelectedStatusTab,
    searchValue,
    setSearchValue,
    localStorageDraft,
    setLocalStorageDraft,
    isDraftBannerDismissed,
    // Computed
    localStorageDraftAsProduct,
    statusCounts,
    filteredProducts,
    // Actions
    clearLocalStorageDraft,
    dismissDraftBanner,
  }
}

