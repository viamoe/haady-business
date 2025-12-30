'use client'

import * as React from 'react'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStoreConnection } from '@/lib/store-connection-context'
import { useLocale } from '@/i18n/context'
import {
  ProductFormContextValue,
  ProductFormData,
  ProductFormErrors,
  ProductImage,
  Category,
  Product,
  UploadProgress,
  defaultFormData,
  defaultUploadProgress,
} from './types'

const ProductFormContext = createContext<ProductFormContextValue | null>(null)

interface ProductFormProviderProps {
  children: React.ReactNode
  product?: Product | null
}

export function ProductFormProvider({ children, product }: ProductFormProviderProps) {
  const { selectedConnectionId, storeId: nativeStoreId } = useStoreConnection()
  const { locale, isRTL } = useLocale()
  
  // Form data state
  const [formData, setFormData] = useState<ProductFormData>(() => {
    if (product) {
      return {
        nameEn: product.name_en || '',
        nameAr: product.name_ar || '',
        descriptionEn: product.description_en || '',
        descriptionAr: product.description_ar || '',
        price: product.price?.toString() || '',
        compareAtPrice: product.compare_at_price?.toString() || '',
        discountType: product.discount_type || 'none',
        discountValue: product.discount_value?.toString() || '',
        discountStartDate: product.discount_start_date || '',
        discountEndDate: product.discount_end_date || '',
        isScheduleEnabled: !!(product.discount_start_date || product.discount_end_date),
        sku: product.sku || '',
        barcode: product.barcode || '',
        barcodeType: (product.barcode_type as 'EAN13' | 'UPC' | 'CODE128' | 'QR') || 'EAN13',
        isAvailable: product.is_available,
        productType: product.product_type || 'physical',
        sellingMethod: product.selling_method || 'unit',
        sellingUnit: product.selling_unit || '',
        fulfillmentTypes: product.fulfillment_type || ['pickup'],
        requiresScheduling: product.requires_scheduling || false,
        subscriptionInterval: product.subscription_interval || '',
        salesChannels: product.sales_channels || ['online', 'in_store'],
        selectedCategoryIds: [],
        // Inventory fields from product
        trackInventory: product.track_inventory ?? true,
        stockQuantity: '', // Will be loaded separately from inventory table
        lowStockThreshold: product.low_stock_threshold?.toString() || '10',
        allowBackorders: product.allow_backorder || false,
        continueSellingOutOfStock: product.allow_backorder || false,
        hasVariants: false,
        variantOptions: [],
        variants: [],
        bundleItems: [],
      }
    }
    return defaultFormData
  })
  
  // Image state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])
  const [featuredNewImageIndex, setFeaturedNewImageIndex] = useState(0)
  
  // Categories state
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  
  // Available products for bundles
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  
  // Errors state
  const [errors, setErrors] = useState<ProductFormErrors>({})
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(defaultUploadProgress)
  
  // Store info
  const [storeId, setStoreId] = useState<string | null>(null)
  const [currencyIcon, setCurrencyIcon] = useState<string | null>(null)
  
  // Update single field helper
  const updateField = useCallback(<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])
  
  // Clear error helper
  const clearError = useCallback((field: keyof ProductFormErrors) => {
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }, [])
  
  // Fetch store ID from connection or use native store
  useEffect(() => {
    const fetchStoreId = async () => {
      if (selectedConnectionId) {
        try {
          const { data: connection } = await supabase
            .from('store_connections')
            .select('store_id')
            .eq('id', selectedConnectionId)
            .single()
          
          if (connection?.store_id) {
            setStoreId(connection.store_id)
          }
        } catch (error) {
          console.error('Error fetching store connection:', error)
        }
      } else if (nativeStoreId) {
        setStoreId(nativeStoreId)
      }
    }
    
    fetchStoreId()
  }, [selectedConnectionId, nativeStoreId])
  
  // Fetch currency icon
  useEffect(() => {
    const fetchCurrency = async () => {
      if (!storeId) return
      
      try {
        const { data: store } = await supabase
          .from('stores')
          .select('business_id')
          .eq('id', storeId)
          .single()
        
        if (store?.business_id) {
          const { data: business } = await supabase
            .from('business_profile')
            .select('country_id')
            .eq('id', store.business_id)
            .single()
          
          if (business?.country_id) {
            const { data: country } = await supabase
              .from('countries')
              .select('currency_icon')
              .eq('id', business.country_id)
              .single()
            
            if (country?.currency_icon) {
              setCurrencyIcon(country.currency_icon)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching currency:', error)
      }
    }
    
    fetchCurrency()
  }, [storeId])
  
  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('id, name, name_ar, parent_id, level, icon')
          .eq('is_active', true)
          .order('name')
        
        if (data) {
          setAllCategories(data)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setIsCategoriesLoading(false)
      }
    }
    
    loadCategories()
  }, [])
  
  // Load product images when editing
  useEffect(() => {
    const loadProductImages = async () => {
      if (product?.id) {
        try {
          const response = await fetch(`/api/products/${product.id}/images`)
          if (response.ok) {
            const data = await response.json()
            setExistingImages(data.images || [])
          }
        } catch (error) {
          console.error('Error loading product images:', error)
        }
      }
    }
    
    loadProductImages()
  }, [product?.id])
  
  // Load product categories when editing
  useEffect(() => {
    const loadProductCategories = async () => {
      if (product?.id) {
        try {
          const response = await fetch(`/api/products/${product.id}/categories`)
          if (response.ok) {
            const data = await response.json()
            const categoryIds = (data.categories || []).map((cat: any) => cat.category_id)
            updateField('selectedCategoryIds', categoryIds)
          }
        } catch (error) {
          console.error('Error loading product categories:', error)
        }
      }
    }
    
    loadProductCategories()
  }, [product?.id, updateField])

  // Load inventory quantity when editing
  useEffect(() => {
    const loadInventory = async () => {
      if (product?.id && storeId) {
        try {
          const { data: inventory } = await supabase
            .from('inventory')
            .select('quantity, low_stock_threshold')
            .eq('product_id', product.id)
            .eq('store_id', storeId)
            .maybeSingle()
          
          if (inventory) {
            updateField('stockQuantity', inventory.quantity?.toString() || '0')
            if (inventory.low_stock_threshold) {
              updateField('lowStockThreshold', inventory.low_stock_threshold.toString())
            }
          }
        } catch (error) {
          console.error('Error loading inventory:', error)
        }
      }
    }
    
    loadInventory()
  }, [product?.id, storeId, updateField])
  
  const value: ProductFormContextValue = {
    formData,
    setFormData,
    updateField,
    imageFiles,
    setImageFiles,
    imagePreviews,
    setImagePreviews,
    existingImages,
    setExistingImages,
    deletedImageIds,
    setDeletedImageIds,
    featuredNewImageIndex,
    setFeaturedNewImageIndex,
    allCategories,
    setAllCategories,
    isCategoriesLoading,
    availableProducts,
    setAvailableProducts,
    errors,
    setErrors,
    clearError,
    isLoading,
    setIsLoading,
    isUploadingImage,
    setIsUploadingImage,
    uploadProgress,
    setUploadProgress,
    storeId,
    currencyIcon,
    product: product || null,
    locale,
    isRTL,
  }
  
  return (
    <ProductFormContext.Provider value={value}>
      {children}
    </ProductFormContext.Provider>
  )
}

export function useProductFormContext() {
  const context = useContext(ProductFormContext)
  if (!context) {
    throw new Error('useProductFormContext must be used within a ProductFormProvider')
  }
  return context
}

