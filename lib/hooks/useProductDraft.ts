'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const DRAFT_KEY = 'product_draft'
const AUTO_SAVE_DELAY = 2000 // 2 seconds

export interface ProductDraft {
  // Basic info
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  // Classification
  productType: string
  sellingMethod: string
  sellingUnit: string
  fulfillmentTypes: string[]
  requiresScheduling: boolean
  subscriptionInterval: string
  // Pricing
  price: string
  compareAtPrice: string
  discountType: string
  discountValue: string
  discountStartDate: string
  discountEndDate: string
  // SKU & Barcode
  sku: string
  barcode: string
  barcodeType: string
  // Inventory
  trackInventory: boolean
  allowBackorders: boolean
  lowStockThreshold: string
  stockQuantity: string
  // Sales channels
  salesChannels: string[]
  // Categories
  categoryIds: string[]
  // Meta
  storeId: string
  lastSavedAt: string
}

const defaultDraft: ProductDraft = {
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  productType: 'physical',
  sellingMethod: 'unit',
  sellingUnit: '',
  fulfillmentTypes: ['pickup'],
  requiresScheduling: false,
  subscriptionInterval: '',
  price: '',
  compareAtPrice: '',
  discountType: 'none',
  discountValue: '',
  discountStartDate: '',
  discountEndDate: '',
  sku: '',
  barcode: '',
  barcodeType: 'EAN13',
  trackInventory: false,
  allowBackorders: false,
  lowStockThreshold: '',
  stockQuantity: '',
  salesChannels: ['online'],
  categoryIds: [],
  storeId: '',
  lastSavedAt: '',
}

export function useProductDraft(storeId?: string) {
  const [draft, setDraft] = useState<ProductDraft | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as ProductDraft
        // Only restore draft for the same store
        if (!storeId || parsed.storeId === storeId) {
          setDraft(parsed)
          setHasDraft(true)
          if (parsed.lastSavedAt) {
            setLastSaved(new Date(parsed.lastSavedAt))
          }
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }, [storeId])

  // Save draft to localStorage
  const saveDraft = useCallback((data: Partial<ProductDraft>) => {
    try {
      const now = new Date().toISOString()
      const draftData: ProductDraft = {
        ...defaultDraft,
        ...draft,
        ...data,
        storeId: storeId || data.storeId || draft?.storeId || '',
        lastSavedAt: now,
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
      setDraft(draftData)
      setHasDraft(true)
      setLastSaved(new Date(now))
      setIsSaving(false)
    } catch (error) {
      console.error('Error saving draft:', error)
      setIsSaving(false)
    }
  }, [draft, storeId])

  // Auto-save with debounce
  const autoSave = useCallback((data: Partial<ProductDraft>) => {
    setIsSaving(true)
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(data)
    }, AUTO_SAVE_DELAY)
  }, [saveDraft])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY)
      setDraft(null)
      setHasDraft(false)
      setLastSaved(null)
    } catch (error) {
      console.error('Error clearing draft:', error)
    }
  }, [])

  // Restore draft data
  const restoreDraft = useCallback((): ProductDraft | null => {
    return draft
  }, [draft])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    draft,
    hasDraft,
    lastSaved,
    isSaving,
    saveDraft,
    autoSave,
    clearDraft,
    restoreDraft,
  }
}

// Format relative time for display
export function formatLastSaved(date: Date | null): string {
  if (!date) return ''
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec} seconds ago`
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  
  return date.toLocaleDateString()
}

