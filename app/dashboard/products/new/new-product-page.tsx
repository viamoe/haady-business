'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProductForm, ProductFormRef } from '@/components/product-form'
import { useProductDraft } from '@/lib/hooks/useProductDraft'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { useHeader } from '@/lib/header-context'
import { Skeleton } from '@/components/ui/skeleton'

// Local imports
import type { Product } from './types'
import { useProduct, useEditHistory } from './hooks'
import { 
  EditHistoryDialog, 
  LeaveConfirmationDialog,
  ProductHeaderActions,
} from './components'

// Constants
const PRODUCTS_LIST_URL = '/dashboard/products'
const DRAFTS_TAB_URL = '/dashboard/products?tab=draft'

/**
 * NewProductPage - Product creation and editing page
 * 
 * This component handles:
 * - Loading existing products for editing
 * - Form state and dirty tracking
 * - Unsaved changes confirmation
 * - Edit history viewing
 * - Auto-save integration
 * - Header breadcrumb management
 */
export function NewProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editProductId = searchParams.get('edit')
  
  // Form reference
  const formRef = useRef<ProductFormRef>(null)
  
  // Custom hooks
  const { 
    product: loadedProduct, 
    isLoading: isLoadingProduct, 
    reload: reloadProduct,
  } = useProduct({ productId: editProductId })
  
  const {
    groupedHistory,
    categories,
    brands,
    isLoading: isLoadingHistory,
    expandedUsers,
    toggleUserExpanded,
    fetchHistory,
  } = useEditHistory({ productId: editProductId })
  
  const { lastSaved, isSaving: isAutoSaving, clearDraft } = useProductDraft()
  const { setHeaderContent } = useHeader()
  
  // Local state - keep minimal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isFormValid, setIsFormValid] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [productName, setProductName] = useState('')
  const [productImage, setProductImage] = useState<string | null>(null)
  const [productDescription, setProductDescription] = useState('')
  
  // Dialog states
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // Sync loaded product to editing state
  useEffect(() => {
    if (loadedProduct) {
      setEditingProduct(loadedProduct)
      setProductName(loadedProduct.name_en || '')
      setProductImage(loadedProduct.image_url)
      setProductDescription(loadedProduct.description_en || '')
    }
  }, [loadedProduct])

  // Navigation helpers
  const navigateToProducts = useCallback(() => router.push(PRODUCTS_LIST_URL), [router])
  const navigateToDrafts = useCallback(() => router.push(DRAFTS_TAB_URL), [router])

  /**
   * Handle breadcrumb click with dirty check
   */
  const handleBreadcrumbClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (isFormDirty) {
      setPendingNavigation(() => navigateToProducts)
      setShowLeaveConfirm(true)
    } else {
      navigateToProducts()
    }
  }, [isFormDirty, navigateToProducts])

  /**
   * Handle cancel button click
   */
  const handleCancel = useCallback(() => {
    if (isFormDirty) {
      setPendingNavigation(() => navigateToProducts)
      setShowLeaveConfirm(true)
    } else {
      navigateToProducts()
    }
  }, [isFormDirty, navigateToProducts])

  /**
   * Handle form submission success
   */
  const handleSuccess = useCallback(async () => {
    if (editingProduct?.id) {
      // Editing - reload product to reset dirty state
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', editingProduct.id)
          .single()

        if (!error && data) {
          setEditingProduct(data as Product)
          // Allow form to update with new data before clearing dirty state
          requestAnimationFrame(() => setIsFormDirty(false))
        }
      } catch (error) {
        console.error('Error reloading product:', error)
        setIsFormDirty(false)
      }
    } else {
      // New product - navigate away
      setIsFormDirty(false)
      clearDraft()
      navigateToProducts()
    }
    
    // Notify other components
    window.dispatchEvent(new CustomEvent('productsUpdated'))
  }, [editingProduct?.id, clearDraft, navigateToProducts])

  /**
   * Handle history button click
   */
  const handleHistoryClick = useCallback(() => {
    setShowHistoryDialog(true)
    fetchHistory()
  }, [fetchHistory])

  /**
   * Handle publish button click
   */
  const handlePublishClick = useCallback(async () => {
    if (!editingProduct) return
    
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      
      if (response.ok) {
        toast.success('Product published successfully')
        await reloadProduct()
        window.dispatchEvent(new CustomEvent('productsUpdated'))
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to publish product')
      }
    } catch (error: any) {
      console.error('Error publishing product:', error)
      toast.error(error.message || 'Failed to publish product')
    }
  }, [editingProduct, reloadProduct])

  /**
   * Handle leave confirmation - discard changes
   */
  const handleDiscard = useCallback(() => {
    setIsFormDirty(false)
    setShowLeaveConfirm(false)
    const navigateTo = pendingNavigation || navigateToProducts
    setPendingNavigation(null)
    navigateTo()
  }, [pendingNavigation, navigateToProducts])

  /**
   * Handle leave confirmation - keep editing
   */
  const handleKeepEditing = useCallback(() => {
    setShowLeaveConfirm(false)
    setPendingNavigation(null)
  }, [])

  /**
   * Handle leave confirmation - save and leave
   */
  const handleSaveAndLeave = useCallback(async () => {
    if (!formRef.current?.saveDraft || !isFormDirty) {
      setIsFormDirty(false)
      setShowLeaveConfirm(false)
      setPendingNavigation(null)
      navigateToDrafts()
      return
    }

    setIsSavingDraft(true)
    try {
      const success = await formRef.current.saveDraft()
      if (success) {
        toast.success('Saved to drafts')
        window.dispatchEvent(new CustomEvent('productsUpdated'))
        setIsFormDirty(false)
        setShowLeaveConfirm(false)
        setPendingNavigation(null)
        navigateToDrafts()
      } else {
        toast.error('Failed to save draft')
        setIsSavingDraft(false)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      toast.error('Failed to save draft')
      setIsSavingDraft(false)
    }
  }, [isFormDirty, navigateToDrafts])

  // Breadcrumbs configuration
  const breadcrumbs = useMemo(() => [
    { 
      label: 'Products', 
      href: isSavingDraft ? undefined : PRODUCTS_LIST_URL,
      onClick: isFormDirty ? handleBreadcrumbClick : undefined 
    },
    { 
      label: isSavingDraft ? 'Saving to drafts...' : (editingProduct ? 'Edit' : 'New'), 
      isLoading: isSavingDraft 
    },
  ], [isSavingDraft, isFormDirty, editingProduct, handleBreadcrumbClick])

  // Header actions component
  const headerActions = useMemo(() => (
    <ProductHeaderActions
      product={editingProduct}
      isFormValid={isFormValid}
      isAutoSaving={isAutoSaving}
      lastSaved={lastSaved}
      isFormDirty={isFormDirty}
      onHistoryClick={handleHistoryClick}
      onPublishClick={handlePublishClick}
    />
  ), [editingProduct, isFormValid, isAutoSaving, lastSaved, isFormDirty, handleHistoryClick, handlePublishClick])

  // Set header content
  useEffect(() => {
    setHeaderContent({
      title: productName || 'Untitled Product',
      breadcrumbs,
      hasUnsavedChanges: isFormDirty && !isAutoSaving,
      rightActions: headerActions,
    })

    return () => setHeaderContent(null)
  }, [productName, breadcrumbs, isFormDirty, isAutoSaving, headerActions, setHeaderContent])

  // Browser navigation guard (back button, refresh)
  useEffect(() => {
    if (!isFormDirty) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      setPendingNavigation(() => () => router.back())
      setShowLeaveConfirm(true)
    }

    window.history.pushState(null, '', window.location.href)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isFormDirty, router])

  return (
    <div className="max-w-2xl mx-auto w-full relative">
      {/* Loading Skeleton */}
      {isLoadingProduct ? (
        <ProductFormSkeleton />
      ) : (
        /* Product Form */
        <ProductForm
          ref={formRef}
          open={true}
          onOpenChange={handleCancel}
          product={editingProduct}
          onSuccess={handleSuccess}
          asPage={true}
          onValidityChange={setIsFormValid}
          onProductNameChange={setProductName}
          onImageChange={setProductImage}
          onDescriptionChange={setProductDescription}
          onFormDirtyChange={setIsFormDirty}
        />
      )}

      {/* Leave Confirmation Dialog */}
      <LeaveConfirmationDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        isSaving={isSavingDraft}
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
        onSaveAndLeave={handleSaveAndLeave}
      />

      {/* Edit History Dialog */}
      <EditHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        isLoading={isLoadingHistory}
        groupedHistory={groupedHistory}
        categories={categories}
        brands={brands}
        expandedUsers={expandedUsers}
        onToggleUser={toggleUserExpanded}
      />
    </div>
  )
}

/**
 * Product form skeleton - matches the actual form layout
 */
function ProductFormSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Product Name - English */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Product Name - Arabic */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Description - English */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>

      {/* Description - Arabic */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>

      {/* Product Images Section */}
      <div className="rounded-2xl bg-gray-100/50 overflow-hidden p-5">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="aspect-square rounded-xl opacity-50" />
        </div>
      </div>

      {/* Classification Section */}
      <div className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="pt-4 border-t border-gray-100">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      </div>

      {/* Pricing Section */}
      <div className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <Skeleton className="h-4 w-20 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* SKU & Barcode Section */}
      <div className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-9 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
