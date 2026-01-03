'use client'

import { memo } from 'react'
import { Cloud, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatLastSaved } from '@/lib/hooks/useProductDraft'
import type { Product } from '../types'

interface ProductHeaderActionsProps {
  product: Product | null
  isFormValid: boolean
  isAutoSaving: boolean
  lastSaved: Date | null
  isFormDirty: boolean
  onHistoryClick: () => void
  onPublishClick: () => void
}

/**
 * Product Header Actions
 * Renders the right-side actions in the product edit page header
 */
export const ProductHeaderActions = memo(function ProductHeaderActions({
  product,
  isFormValid,
  isAutoSaving,
  lastSaved,
  isFormDirty,
  onHistoryClick,
  onPublishClick,
}: ProductHeaderActionsProps) {
  const isDraft = product?.status === 'draft'
  const showPublishButton = product && isDraft && !isFormDirty
  const showUpdateButton = !product || isFormDirty // Only show when creating new OR when there are changes
  const buttonLabel = product ? 'Update Product' : 'Add Product'

  return (
    <div className="flex items-center gap-3">
      {/* Auto-save indicator */}
      <AutoSaveIndicator 
        isAutoSaving={isAutoSaving}
        lastSaved={lastSaved}
        isFormDirty={isFormDirty}
      />
      
      {/* History button (only when editing) */}
      {product && (
        <Button
          type="button"
          variant="outline"
          onClick={onHistoryClick}
          className="h-9 border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          size="sm"
        >
          <History className="h-4 w-4 mr-2" />
          History
        </Button>
      )}
      
      {/* Publish button - for drafts with no pending changes */}
      {showPublishButton && (
        <Button 
          type="button"
          onClick={onPublishClick}
          className="h-9 bg-gradient-to-r from-[#F4610B] to-[#FF8534] hover:from-[#E5550A] hover:to-[#F4610B] text-white font-semibold shadow-lg shadow-[#F4610B]/25 hover:shadow-xl hover:shadow-[#F4610B]/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          size="sm"
        >
          Publish
        </Button>
      )}
      
      {/* Update/Add button - only when there are changes or creating new */}
      {showUpdateButton && (
        <Button 
          type="submit" 
          form="product-form"
          disabled={!isFormDirty && !isFormValid}
          className="h-9 bg-gradient-to-r from-[#F4610B] to-[#FF8534] hover:from-[#E5550A] hover:to-[#F4610B] text-white font-semibold shadow-lg shadow-[#F4610B]/25 hover:shadow-xl hover:shadow-[#F4610B]/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
          size="sm"
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  )
})

/**
 * Auto-save indicator component
 */
const AutoSaveIndicator = memo(function AutoSaveIndicator({
  isAutoSaving,
  lastSaved,
  isFormDirty,
}: {
  isAutoSaving: boolean
  lastSaved: Date | null
  isFormDirty: boolean
}) {
  if (isAutoSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Cloud className="h-3.5 w-3.5 animate-pulse" />
        <span>Saving...</span>
      </div>
    )
  }

  if (lastSaved && !isFormDirty) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Cloud className="h-3.5 w-3.5 text-green-500" />
        <span>{formatLastSaved(lastSaved)}</span>
      </div>
    )
  }

  return null
})

