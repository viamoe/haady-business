'use client'

import { useCallback } from 'react'
import { toast } from '@/lib/toast'
import { useProductFormContext } from '../context'
import { ProductFormErrors, defaultUploadProgress } from '../types'
import { validateProductForm } from '../validation'

export function useProductForm() {
  const {
    formData,
    errors,
    setErrors,
    isLoading,
    setIsLoading,
    isUploadingImage,
    setIsUploadingImage,
    uploadProgress,
    setUploadProgress,
    storeId,
    product,
    imageFiles,
    existingImages,
    deletedImageIds,
  } = useProductFormContext()

  // Validate form using Zod schema
  const validate = useCallback((): boolean => {
    const result = validateProductForm(formData)
    
    if (!result.success && result.errors) {
      // Map Zod errors to our error format
      const newErrors: ProductFormErrors = {}
      
      if (result.errors.nameEn) newErrors.nameEn = result.errors.nameEn
      if (result.errors.nameAr) newErrors.nameAr = result.errors.nameAr
      if (result.errors.price) newErrors.price = result.errors.price
      if (result.errors.salesChannels) newErrors.salesChannels = result.errors.salesChannels
      if (result.errors.bundleItems) newErrors.bundleItems = result.errors.bundleItems
      
      setErrors(newErrors)
      
      // Show first error as toast
      const firstError = Object.values(result.errors)[0]
      if (firstError) {
        toast.error(firstError)
      }
      
      return false
    }

    setErrors({})
    return true
  }, [formData, setErrors])

  // Build create/update data payload
  const buildPayload = useCallback(() => {
    return {
      name_en: formData.nameEn || null,
      name_ar: formData.nameAr || null,
      description_en: formData.descriptionEn || null,
      description_ar: formData.descriptionAr || null,
      price: parseFloat(formData.price),
      compare_at_price: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null,
      discount_type: formData.discountType,
      discount_value: formData.discountValue ? parseFloat(formData.discountValue) : null,
      discount_start_date: formData.discountStartDate || null,
      discount_end_date: formData.discountEndDate || null,
      sku: formData.sku || null,
      barcode: formData.barcode || null,
      barcode_type: formData.barcodeType || 'EAN13',
      is_available: formData.isAvailable,
      category_ids: formData.selectedCategoryIds.length > 0 ? formData.selectedCategoryIds : undefined,
      product_type: formData.productType,
      selling_method: formData.sellingMethod,
      selling_unit: formData.sellingUnit || null,
      fulfillment_type: formData.fulfillmentTypes,
      requires_scheduling: formData.requiresScheduling,
      subscription_interval: formData.subscriptionInterval || null,
      sales_channels: formData.salesChannels,
      // Inventory tracking fields
      track_inventory: formData.trackInventory,
      allow_backorder: formData.allowBackorders || formData.continueSellingOutOfStock,
      low_stock_threshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold, 10) : null,
      stock_quantity: formData.stockQuantity ? parseInt(formData.stockQuantity, 10) : null,
    }
  }, [formData])

  // Upload a single file with progress tracking
  const uploadFileWithProgress = useCallback((
    file: File,
    productId: string,
    index: number,
    total: number
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setUploadProgress({
            currentIndex: index + 1,
            totalFiles: total,
            currentFileProgress: percentComplete,
            currentFileName: file.name,
            isUploading: true,
          })
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText)
            reject(new Error(errorData.error || 'Failed to upload image'))
          } catch {
            reject(new Error('Failed to upload image'))
          }
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.open('POST', `/api/products/${productId}/upload-image`)
      xhr.send(formDataUpload)
    })
  }, [setUploadProgress])

  // Upload images for a product
  const uploadImages = useCallback(async (productId: string): Promise<void> => {
    console.log('[uploadImages] Starting upload for', imageFiles.length, 'files')
    if (imageFiles.length === 0) return

    setIsUploadingImage(true)
    setUploadProgress({
      currentIndex: 0,
      totalFiles: imageFiles.length,
      currentFileProgress: 0,
      currentFileName: '',
      isUploading: true,
    })

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        console.log('[uploadImages] Uploading file', i + 1, ':', imageFiles[i].name)
        await uploadFileWithProgress(imageFiles[i], productId, i, imageFiles.length)
        console.log('[uploadImages] Uploaded file', i + 1)
      }
    } finally {
      setIsUploadingImage(false)
      setUploadProgress(defaultUploadProgress)
      console.log('[uploadImages] Done uploading all files')
    }
  }, [imageFiles, setIsUploadingImage, setUploadProgress, uploadFileWithProgress])

  // Handle image deletion and primary updates for existing product
  const syncImages = useCallback(async (productId: string): Promise<void> => {
    console.log('[syncImages] deletedImageIds:', deletedImageIds)
    console.log('[syncImages] existingImages:', existingImages.length)
    
    // Delete images that user explicitly removed (tracked in deletedImageIds)
    for (const imageId of deletedImageIds) {
      console.log('[syncImages] Deleting image:', imageId)
      await fetch(`/api/products/${productId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      })
    }

    // Update primary image if changed
    const newPrimary = existingImages.find(img => img.is_primary)
    if (newPrimary) {
      await fetch(`/api/products/${productId}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: newPrimary.id, is_primary: true }),
      })
    }
  }, [existingImages, deletedImageIds])

  // Create new product
  const createProduct = useCallback(async (): Promise<{ success: boolean; productId?: string }> => {
    if (!validate()) return { success: false }

    if (!storeId) {
      toast.error('Store not found. Please create a store or connect to an external store first.')
      return { success: false }
    }

    setIsLoading(true)

    try {
      const createData = {
        ...buildPayload(),
        store_id: storeId,
      }

      const createResponse = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create product')
      }

      const responseData = await createResponse.json()
      const newProduct = responseData.product

      // Upload images if any
      if (imageFiles.length > 0) {
        await uploadImages(newProduct.id)
      }

      toast.success('Product created successfully')
      return { success: true, productId: newProduct.id }
    } catch (error: any) {
      console.error('Error creating product:', error)
      toast.error(error.message || 'Failed to create product')
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, [validate, storeId, buildPayload, imageFiles, uploadImages, setIsLoading])

  // Update existing product
  const updateProduct = useCallback(async (): Promise<{ success: boolean }> => {
    if (!validate()) return { success: false }
    if (!product) return { success: false }

    setIsLoading(true)

    try {
      const updateData = {
        ...buildPayload(),
        // Get primary image URL for backward compatibility
        image_url: existingImages.find(img => img.is_primary)?.url || 
                   (existingImages.length === 0 && imageFiles.length === 0 ? null : undefined),
      }

      // Upload new images first
      if (imageFiles.length > 0) {
        await uploadImages(product.id)
      }

      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update product')
      }

      // Sync images (delete removed, update primary)
      await syncImages(product.id)

      toast.success('Product updated successfully')
      return { success: true }
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast.error(error.message || 'Failed to update product')
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }, [validate, product, buildPayload, existingImages, imageFiles, uploadImages, syncImages, setIsLoading])

  // Main submit handler
  const handleSubmit = useCallback(async (): Promise<{ success: boolean; productId?: string }> => {
    if (product) {
      const result = await updateProduct()
      return { success: result.success, productId: product.id }
    } else {
      return await createProduct()
    }
  }, [product, updateProduct, createProduct])

  return {
    validate,
    handleSubmit,
    createProduct,
    updateProduct,
    uploadImages,
    isLoading,
    isUploadingImage,
    errors,
  }
}
