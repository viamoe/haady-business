'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ProductFormProvider, useProductFormContext } from './context'
import { useProductForm } from './hooks/useProductForm'
import { useProductImages } from './hooks/useProductImages'
import {
  BasicInfoSection,
  PricingSection,
  ImagesSection,
  ClassificationSection,
  InventorySection,
  SkuBarcodeSection,
  BundleSection,
  VariantsSection,
} from './sections'
import { ProductFormProps, Product } from './types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

// Inner form component that uses the context
function ProductFormContent({ 
  onSuccess, 
  asPage = false,
  onValidityChange,
  onProductNameChange,
  onImageChange,
  onDescriptionChange,
}: Omit<ProductFormProps, 'open' | 'onOpenChange' | 'product'>) {
  const { formData, isLoading, isUploadingImage } = useProductFormContext()
  const { handleSubmit } = useProductForm()
  const { getPrimaryImageUrl } = useProductImages()

  // Track form validity for parent component
  useEffect(() => {
    if (onValidityChange) {
      const isValid = !!(
        formData.nameEn.trim() &&
        formData.nameAr.trim() &&
        formData.price &&
        parseFloat(formData.price) > 0 &&
        formData.salesChannels.length > 0
      )
      onValidityChange(isValid)
    }
  }, [formData.nameEn, formData.nameAr, formData.price, formData.salesChannels, onValidityChange])

  // Report product name changes to parent
  useEffect(() => {
    if (onProductNameChange) {
      onProductNameChange(formData.nameEn.trim())
    }
  }, [formData.nameEn, onProductNameChange])

  // Report image changes to parent
  useEffect(() => {
    if (onImageChange) {
      onImageChange(getPrimaryImageUrl())
    }
  }, [getPrimaryImageUrl, onImageChange])

  // Report description changes to parent
  useEffect(() => {
    if (onDescriptionChange) {
      onDescriptionChange(formData.descriptionEn.trim())
    }
  }, [formData.descriptionEn, onDescriptionChange])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await handleSubmit()
    if (result.success) {
      onSuccess?.()
    }
  }

  return (
    <form id="product-form" onSubmit={onSubmit} className="space-y-6">
      {/* Basic Info */}
      <BasicInfoSection />

      {/* Product Images */}
      <ImagesSection />

      {/* Classification (Type, Selling Method, Fulfillment, Sales Channels) */}
      <ClassificationSection />

      {/* Bundle Contents - Only shown for bundle products */}
      <BundleSection />

      {/* Variants - Size, Color, etc. */}
      <VariantsSection />

      {/* Pricing & Discounts */}
      <PricingSection />

      {/* SKU & Barcode */}
      <SkuBarcodeSection />

      {/* Inventory */}
      <InventorySection />

      {/* Loading Overlay */}
      {(isLoading || isUploadingImage) && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#F4610B]" />
            <span className="text-gray-700">
              {isUploadingImage ? 'Uploading images...' : 'Saving product...'}
            </span>
          </div>
        </div>
      )}
    </form>
  )
}

// Sheet form content with save button
function SheetFormContent({ 
  onSuccess,
  onOpenChange,
  product,
}: Omit<ProductFormProps, 'open' | 'asPage' | 'onValidityChange' | 'onProductNameChange' | 'onImageChange' | 'onDescriptionChange'>) {
  const { formData, isLoading, isUploadingImage } = useProductFormContext()
  const { handleSubmit } = useProductForm()

  const onSubmit = async () => {
    const result = await handleSubmit()
    if (result.success) {
      onSuccess?.()
      onOpenChange?.(false)
    }
  }

  return (
    <SheetContent 
      side="right" 
      className="w-full sm:max-w-[800px] lg:max-w-[900px] overflow-y-auto p-0 [&>button]:hidden"
    >
      <SheetHeader className="px-6 py-4 border-b bg-gray-50/80 sticky top-0 z-10">
        <SheetTitle className="text-xl">
          {product ? 'Edit Product' : 'Add New Product'}
        </SheetTitle>
        <SheetDescription>
          {product ? 'Update product information' : 'Fill in the product details below'}
        </SheetDescription>
      </SheetHeader>
      
      <div className="p-6">
        <ProductFormContent onSuccess={onSuccess} asPage={false} />
      </div>
      
      {/* Footer with Save Button */}
      <div className="px-6 py-4 border-t bg-gray-50/80 flex justify-end gap-3 sticky bottom-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange?.(false)}
          disabled={isLoading || isUploadingImage}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || isUploadingImage}
          className="bg-[#F4610B] hover:bg-[#d54e09] text-white min-w-[120px]"
        >
          {isLoading || isUploadingImage ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {isUploadingImage ? 'Uploading...' : 'Saving...'}
            </>
          ) : (
            product ? 'Update Product' : 'Create Product'
          )}
        </Button>
      </div>
    </SheetContent>
  )
}

// Main exported component with provider wrapper
export function ProductForm({ 
  open, 
  onOpenChange, 
  product, 
  onSuccess, 
  asPage = false,
  onValidityChange,
  onProductNameChange,
  onImageChange,
  onDescriptionChange,
}: ProductFormProps) {
  // If rendering as page (not in sheet)
  if (asPage) {
    return (
      <ProductFormProvider product={product}>
        <ProductFormContent
          onSuccess={onSuccess}
          asPage={asPage}
          onValidityChange={onValidityChange}
          onProductNameChange={onProductNameChange}
          onImageChange={onImageChange}
          onDescriptionChange={onDescriptionChange}
        />
      </ProductFormProvider>
    )
  }

  // Render as sheet (slide-in panel)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ProductFormProvider product={product}>
        <SheetFormContent
          product={product}
          onSuccess={onSuccess}
          onOpenChange={onOpenChange}
        />
      </ProductFormProvider>
    </Sheet>
  )
}

// Re-export types for convenience
export type { Product, ProductFormProps } from './types'
