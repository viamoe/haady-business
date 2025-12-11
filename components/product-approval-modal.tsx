"use client"

import * as React from "react"
import { WideCardModal } from "@/components/ui/wide-card-modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, Trash2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface ProductPreview {
  id: string
  platformProductId: string
  name: string
  nameEn?: string
  nameAr?: string
  description?: string
  descriptionEn?: string
  descriptionAr?: string
  price: number
  sku?: string
  imageUrl?: string
  isActive: boolean
  isAvailable: boolean
  inventory?: number
}

interface ProductApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: ProductPreview[]
  platform: string
  onApprove: (selectedProductIds: string[]) => Promise<void>
  isLoading?: boolean
}

export function ProductApprovalModal({
  open,
  onOpenChange,
  products,
  platform,
  onApprove,
  isLoading = false,
}: ProductApprovalModalProps) {
  const [selectedProducts, setSelectedProducts] = React.useState<Set<string>>(
    new Set(products.map(p => p.id))
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset selection when products change
  React.useEffect(() => {
    setSelectedProducts(new Set(products.map(p => p.id)))
  }, [products])

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }


  const handleApprove = async () => {
    if (selectedProducts.size === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await onApprove(Array.from(selectedProducts))
      onOpenChange(false)
    } catch (error) {
      console.error('Error approving products:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCount = selectedProducts.size
  const totalCount = products.length
  const allSelected = selectedProducts.size === products.length && products.length > 0
  const someSelected = selectedProducts.size > 0 && selectedProducts.size < products.length
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1)

  return (
    <WideCardModal
      open={open}
      onOpenChange={onOpenChange}
      title="Review Products to Sync"
      subtitle={`Found ${totalCount} products from ${platformName}. Select which ones to sync.`}
      dismissable={false}
      showLogo={false}
      scrollable={true}
      className="max-w-4xl !max-h-[85vh]"
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Header with select all and action buttons - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between py-3 px-1 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected || (someSelected && "indeterminate")}
              onCheckedChange={handleSelectAll}
              aria-label="Select all products"
              className="h-5 w-5"
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedCount === 0
                ? 'No products selected'
                : `${selectedCount} of ${totalCount} selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={selectedCount === 0 || isSubmitting}
              className="bg-[#F4610B] hover:bg-[#E55A0A] text-white h-9 px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Sync {selectedCount > 0 ? selectedCount : ''} Products
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Products list - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 -mx-2 pl-2 pr-4 scrollbar-custom">
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No products found</p>
              <p className="text-sm mt-1">This store doesn't have any products to sync.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const isSelected = selectedProducts.has(product.id)
                const displayName = product.nameEn || product.nameAr || product.name
                const displayDescription = product.descriptionEn || product.descriptionAr || product.description

                return (
                  <div
                    key={product.id}
                    onClick={() => handleToggleProduct(product.id)}
                    className={cn(
                      "relative flex flex-col rounded-xl transition-all cursor-pointer overflow-hidden",
                      "bg-white border",
                      isSelected
                        ? "border-2 border-[#F4610B] ring-2 ring-[#F4610B]/20"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {/* Checkbox - Top right corner */}
                    <div className="absolute top-2 right-2 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleProduct(product.id)}
                        aria-label={`Select ${displayName}`}
                        className="h-5 w-5 bg-white"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Product Image */}
                    <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={displayName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      {/* Status badges overlay */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.isActive ? (
                          <Badge className="bg-green-500 text-white border-0 text-[10px] px-2 py-0.5 shadow-sm">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500 text-white border-0 text-[10px] px-2 py-0.5 shadow-sm">
                            Inactive
                          </Badge>
                        )}
                        {!product.isAvailable && (
                          <Badge className="bg-red-500 text-white border-0 text-[10px] px-2 py-0.5 shadow-sm">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[1rem]">
                        {displayName}
                      </h4>
                      
                      {displayDescription && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 mt-0.5">
                          {displayDescription}
                        </p>
                      )}

                      {/* Price and Stock */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.inventory !== undefined && (
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded",
                            product.inventory > 0 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          )}>
                            {product.inventory > 0 ? `In Stock (${product.inventory})` : 'Out of Stock'}
                          </span>
                        )}
                      </div>

                      {/* SKU */}
                      {product.sku && (
                        <div className="text-xs text-gray-400">
                          SKU: <span className="text-gray-600 font-mono">{product.sku}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </WideCardModal>
  )
}

