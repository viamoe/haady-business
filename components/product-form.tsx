'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload, X, Image as ImageIcon, Wand2, Tag, Barcode, Copy, Check, CheckCircle2, Package, DollarSign, Star, Plus, Minus, Store, Globe, CloudDownload, Sparkles, AlertCircle, Gift, Trash2, GripVertical, Search, ArrowRightLeft, Percent, BadgePercent, Calendar, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useStoreConnection } from '@/lib/store-connection-context'
import { toast } from '@/lib/toast'
import { useLocale } from '@/i18n/context'
import Image from 'next/image'
import { CategorySelector } from '@/components/category-selector'
import { BarcodeDisplay } from '@/components/barcode-display'
import { generateSKU, generateBarcode, validateSKU, validateBarcode } from '@/lib/utils/sku-barcode-generator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  description_en: string | null
  description_ar: string | null
  price: number | null
  sku: string | null
  barcode: string | null
  barcode_type: string | null
  image_url: string | null
  is_available: boolean
  is_active: boolean
  created_at: string
  store_id: string
  // Classification fields
  product_type?: 'physical' | 'digital' | 'service' | 'bundle'
  selling_method?: 'unit' | 'weight' | 'length' | 'time' | 'subscription'
  selling_unit?: string | null
  fulfillment_type?: ('pickup' | 'delivery' | 'digital' | 'onsite')[]
  requires_scheduling?: boolean
  subscription_interval?: string | null
  // Sales channels
  sales_channels?: ('online' | 'in_store')[]
  // Pricing & Discounts
  compare_at_price?: number | null
  discount_type?: 'none' | 'percentage' | 'fixed_amount'
  discount_value?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
}

interface BundleItem {
  id?: string
  product_id: string
  product?: Product
  quantity: number
  is_required: boolean
  sort_order: number
  substitutes?: BundleSubstitute[]
}

interface BundleSubstitute {
  id?: string
  substitute_product_id: string
  substitute_product?: Product
  priority: number
}

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSuccess?: () => void
  asPage?: boolean
  onValidityChange?: (isValid: boolean) => void
  onProductNameChange?: (name: string) => void
  onImageChange?: (imageUrl: string | null) => void
  onDescriptionChange?: (description: string) => void
}

export function ProductForm({ open, onOpenChange, product, onSuccess, asPage = false, onValidityChange, onProductNameChange, onImageChange, onDescriptionChange }: ProductFormProps) {
  const { selectedConnectionId, selectedConnection, storeId: nativeStoreId } = useStoreConnection()
  const { locale, isRTL } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [currencyIcon, setCurrencyIcon] = useState<string | null>(null)
  
  // Form state
  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed_amount'>('none')
  const [discountValue, setDiscountValue] = useState('')
  const [discountStartDate, setDiscountStartDate] = useState('')
  const [discountEndDate, setDiscountEndDate] = useState('')
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false)
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [barcodeType, setBarcodeType] = useState('EAN13')
  const [skuCopied, setSkuCopied] = useState(false)
  const [barcodeCopied, setBarcodeCopied] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [featuredNewImageIndex, setFeaturedNewImageIndex] = useState<number>(0) // First image is featured by default
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string; is_primary: boolean }>>([])
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]) // Track explicitly deleted images
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set())
  const [isAvailable, setIsAvailable] = useState(true)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; name_ar: string | null; parent_id: string | null; level: number; icon: string | null }>>([])
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('')
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('')
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState<string>('')
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  
  // Classification state
  const [productType, setProductType] = useState<'physical' | 'digital' | 'service' | 'bundle'>('physical')
  const [sellingMethod, setSellingMethod] = useState<'unit' | 'weight' | 'length' | 'time' | 'subscription'>('unit')
  const [sellingUnit, setSellingUnit] = useState<string>('')
  const [fulfillmentTypes, setFulfillmentTypes] = useState<('pickup' | 'delivery' | 'digital' | 'onsite')[]>(['pickup'])
  const [requiresScheduling, setRequiresScheduling] = useState(false)
  const [subscriptionInterval, setSubscriptionInterval] = useState<string>('')
  const [salesChannels, setSalesChannels] = useState<('online' | 'in_store')[]>(['online', 'in_store'])
  const [showSalesChannelWarning, setShowSalesChannelWarning] = useState(false)
  
  // Bundle state
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  
  // Inventory state
  const [trackInventory, setTrackInventory] = useState(true)
  const [stockQuantity, setStockQuantity] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('10')
  const [allowBackorders, setAllowBackorders] = useState(false)
  const [continueSellingOutOfStock, setContinueSellingOutOfStock] = useState(false)
  
  // Variants state
  const [hasVariants, setHasVariants] = useState(false)
  const [variantOptions, setVariantOptions] = useState<Array<{ id: string; name: string; values: string[] }>>([])
  const [variants, setVariants] = useState<Array<{ 
    id: string
    options: Record<string, string>
    price: string
    sku: string
    stock: string
    enabled: boolean
  }>>([])
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionValues, setNewOptionValues] = useState<Record<string, string>>({})
  const [isAddingCustomOption, setIsAddingCustomOption] = useState(false)
  const [customOptionName, setCustomOptionName] = useState('')
  
  // Validation state
  const [errors, setErrors] = useState<{
    nameEn?: string
    nameAr?: string
    price?: string
    salesChannels?: string
    bundleItems?: string
  }>({})
  
  // Track form validity for parent component
  useEffect(() => {
    if (onValidityChange) {
      const isValid = !!(
        nameEn.trim() && 
        nameAr.trim() && 
        price && 
        parseFloat(price) > 0 &&
        salesChannels.length > 0
      )
      onValidityChange(isValid)
    }
  }, [nameEn, nameAr, price, salesChannels, onValidityChange])

  // Report product name changes to parent
  useEffect(() => {
    if (onProductNameChange) {
      onProductNameChange(nameEn.trim())
    }
  }, [nameEn, onProductNameChange])

  // Report image changes to parent (use featured image)
  useEffect(() => {
    if (onImageChange) {
      // Check for primary existing image first
      const primaryExisting = existingImages.find(img => img.is_primary)
      if (primaryExisting) {
        onImageChange(primaryExisting.url)
      } else if (imagePreviews.length > 0 && featuredNewImageIndex >= 0 && featuredNewImageIndex < imagePreviews.length) {
        // Use featured new image
        onImageChange(imagePreviews[featuredNewImageIndex])
      } else if (imagePreviews.length > 0) {
        // Fallback to first new image
        onImageChange(imagePreviews[0])
      } else {
        onImageChange(null)
      }
    }
  }, [imageUrl, imagePreviews, existingImages, featuredNewImageIndex, onImageChange])

  // Report description changes to parent
  useEffect(() => {
    if (onDescriptionChange) {
      onDescriptionChange(descriptionEn.trim())
    }
  }, [descriptionEn, onDescriptionChange])
  
  // Section collapse state
  const [isPricingSectionOpen, setIsPricingSectionOpen] = useState(false)

  // Fetch store ID from connection or use native store
  useEffect(() => {
    const fetchStoreId = async () => {
      // If there's a selected connection, get store_id from it
      if (selectedConnectionId) {
        try {
          const { data: connection } = await supabase
            .from('store_connections')
            .select('store_id')
            .eq('id', selectedConnectionId)
            .maybeSingle()

          if (connection?.store_id) {
            setStoreId(connection.store_id)
            return
          }
        } catch (error) {
          console.error('Error fetching store ID from connection:', error)
        }
      }
      
      // Fallback to native store ID if no connection or connection has no store_id
      if (nativeStoreId) {
        setStoreId(nativeStoreId)
      } else {
        setStoreId(null)
      }
    }

    fetchStoreId()
  }, [selectedConnectionId, nativeStoreId])

  // Fetch store currency icon from country
  useEffect(() => {
    const fetchStoreCurrency = async () => {
      if (!storeId) {
        setCurrencyIcon(null)
        return
      }

      try {
        // First fetch the store's country ID
        const { data: storeData } = await supabase
          .from('stores')
          .select('country')
          .eq('id', storeId)
          .maybeSingle()

        if (storeData?.country) {
          // Then fetch the currency_icon from countries table
          const { data: countryData } = await supabase
            .from('countries')
            .select('currency_icon')
            .eq('id', storeData.country)
            .maybeSingle()

          setCurrencyIcon(countryData?.currency_icon || null)
        } else {
          setCurrencyIcon(null)
        }
      } catch (error) {
        console.error('Error fetching store currency:', error)
        setCurrencyIcon(null)
      }
    }

    fetchStoreCurrency()
  }, [storeId])

  // Load product categories when editing
  useEffect(() => {
    const loadProductCategories = async () => {
      if (open && product?.id) {
        try {
          const response = await fetch(`/api/products/${product.id}/categories`)
          if (response.ok) {
            const data = await response.json()
            const categoryIds = (data.categories || []).map((cat: any) => cat.category_id)
            setSelectedCategoryIds(categoryIds)
          }
        } catch (error) {
          console.error('Error loading product categories:', error)
          setSelectedCategoryIds([])
        }
      }
    }

    loadProductCategories()
  }, [open, product?.id])

  // Fetch all categories for hierarchical selector
  useEffect(() => {
    const fetchAllCategories = async () => {
      setIsCategoriesLoading(true)
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          setAllCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        setAllCategories([])
      } finally {
        setIsCategoriesLoading(false)
      }
    }
    
    if (open) {
      fetchAllCategories()
    }
  }, [open])

  // Update selectedCategoryIds when hierarchical selection changes
  useEffect(() => {
    const ids: string[] = []
    if (selectedSubSubCategory) {
      ids.push(selectedSubSubCategory)
    } else if (selectedSubCategory) {
      ids.push(selectedSubCategory)
    } else if (selectedMainCategory) {
      ids.push(selectedMainCategory)
    }
    setSelectedCategoryIds(ids)
  }, [selectedMainCategory, selectedSubCategory, selectedSubSubCategory])

  // Sync hierarchical selectors when editing existing product
  useEffect(() => {
    if (selectedCategoryIds.length > 0 && allCategories.length > 0) {
      const categoryId = selectedCategoryIds[0]
      const category = allCategories.find(c => c.id === categoryId)
      if (category) {
        if (category.level === 0) {
          setSelectedMainCategory(categoryId)
          setSelectedSubCategory('')
          setSelectedSubSubCategory('')
        } else if (category.level === 1) {
          setSelectedMainCategory(category.parent_id || '')
          setSelectedSubCategory(categoryId)
          setSelectedSubSubCategory('')
        } else if (category.level === 2) {
          const parent = allCategories.find(c => c.id === category.parent_id)
          setSelectedMainCategory(parent?.parent_id || '')
          setSelectedSubCategory(category.parent_id || '')
          setSelectedSubSubCategory(categoryId)
        }
      }
    }
  }, [allCategories]) // Only run when categories are loaded

  // Load product images when editing
  useEffect(() => {
    const loadProductImages = async () => {
      if (open && product?.id) {
        try {
          const response = await fetch(`/api/products/${product.id}/images`)
          if (response.ok) {
            const data = await response.json()
            setExistingImages(data.images || [])
            setDeletedImageIds([]) // Reset deleted images when loading new product
            // Set primary image preview for backward compatibility
            const primaryImage = data.images?.find((img: any) => img.is_primary) || data.images?.[0]
            if (primaryImage) {
              setImageUrl(primaryImage.url)
            }
          }
        } catch (error) {
          console.error('Error loading product images:', error)
          setExistingImages([])
          setDeletedImageIds([])
        }
      } else {
        setExistingImages([])
        setDeletedImageIds([])
      }
    }

    loadProductImages()
  }, [open, product?.id])

  // Reset form when dialog opens/closes or product changes
  useEffect(() => {
    if (open) {
      if (product) {
        // Edit mode
        setNameEn(product.name_en || '')
        setNameAr(product.name_ar || '')
        setDescriptionEn(product.description_en || '')
        setDescriptionAr(product.description_ar || '')
        setPrice(product.price?.toString() || '')
        setCompareAtPrice(product.compare_at_price?.toString() || '')
        setDiscountType(product.discount_type || 'none')
        setDiscountValue(product.discount_value?.toString() || '')
        setDiscountStartDate(product.discount_start_date || '')
        setDiscountEndDate(product.discount_end_date || '')
        setIsScheduleEnabled(!!(product.discount_start_date || product.discount_end_date))
        setSku(product.sku || '')
        setBarcode(product.barcode || '')
        setBarcodeType(product.barcode_type || 'EAN13')
        setImageUrl(product.image_url)
        setIsAvailable(product.is_available)
        setImageFiles([])
        setImagePreviews([])
        // Classification fields
        setProductType(product.product_type || 'physical')
        setSellingMethod(product.selling_method || 'unit')
        setSellingUnit(product.selling_unit || '')
        setFulfillmentTypes(product.fulfillment_type || ['pickup'])
        setRequiresScheduling(product.requires_scheduling || false)
        setSubscriptionInterval(product.subscription_interval || '')
        setSalesChannels(product.sales_channels || ['online', 'in_store'])
        // Categories will be loaded in separate useEffect
      } else {
        // Create mode
        setNameEn('')
        setNameAr('')
        setDescriptionEn('')
        setDescriptionAr('')
        setPrice('')
        setCompareAtPrice('')
        setDiscountType('none')
        setDiscountValue('')
        setDiscountStartDate('')
        setDiscountEndDate('')
        setIsScheduleEnabled(false)
        setSku('')
        setBarcode('')
        setBarcodeType('EAN13')
        setImageUrl(null)
        setIsAvailable(true)
        setImageFiles([])
        setImagePreviews([])
        setExistingImages([])
        setSelectedCategoryIds([])
        // Reset classification fields
        setProductType('physical')
        setSellingMethod('unit')
        setSellingUnit('')
        setFulfillmentTypes(['pickup'])
        setRequiresScheduling(false)
        setSubscriptionInterval('')
        setSalesChannels(['online', 'in_store'])
        // Reset bundle items
        setBundleItems([])
        setProductSearchQuery('')
        // Reset errors
        setErrors({})
      }
    }
  }, [open, product])

  // Fetch available products for bundle composition
  useEffect(() => {
    const fetchAvailableProducts = async () => {
      if (!open || !storeId) return
      
      setIsLoadingProducts(true)
      try {
        const { data: products, error } = await supabase
          .from('products')
          .select('id, name_en, name_ar, sku, price, image_url, product_type')
          .eq('store_id', storeId)
          .neq('product_type', 'bundle') // Don't include other bundles
          .eq('is_active', true)
          .order('name_en', { ascending: true })
          .limit(50)

        if (error) throw error
        // Map to Product type with required defaults
        const mappedProducts: Product[] = (products || []).map(p => ({
          ...p,
          description_en: null,
          description_ar: null,
          barcode: null,
          barcode_type: null,
          is_available: true,
          is_active: true,
          created_at: '',
          store_id: storeId
        }))
        setAvailableProducts(mappedProducts)
      } catch (error) {
        console.error('Error fetching products:', error)
        setAvailableProducts([])
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchAvailableProducts()
  }, [open, storeId])

  // Generate SKU based on product name
  const handleGenerateSKU = () => {
    const newSku = generateSKU(nameEn || nameAr, { prefix: 'PROD' })
    setSku(newSku)
  }

  // Generate barcode
  const handleGenerateBarcode = () => {
    const result = generateBarcode({ type: 'INTERNAL' })
    setBarcode(result.barcode)
    setBarcodeType(result.type)
  }

  // Generate both
  const handleGenerateBoth = () => {
    handleGenerateSKU()
    handleGenerateBarcode()
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'sku' | 'barcode') => {
    await navigator.clipboard.writeText(text)
    if (type === 'sku') {
      setSkuCopied(true)
      setTimeout(() => setSkuCopied(false), 2000)
    } else {
      setBarcodeCopied(true)
      setTimeout(() => setBarcodeCopied(false), 2000)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate all files
    const validFiles: File[] = []
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        continue
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    // Add to existing files
    setImageFiles(prev => [...prev, ...validFiles])
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (imageId: string) => {
    setExistingImages(prev => prev.filter(img => img.id !== imageId))
    // Track this image for deletion when form is saved
    setDeletedImageIds(prev => [...prev, imageId])
  }

  const setPrimaryImage = (imageId: string) => {
    setExistingImages(prev => 
      prev.map(img => ({ ...img, is_primary: img.id === imageId }))
    )
    // Clear featured status from new images when selecting an existing image as primary
    setFeaturedNewImageIndex(-1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    const newErrors: typeof errors = {}
    
    // Validate required fields
    if (!nameEn || !nameEn.trim()) {
      newErrors.nameEn = 'Product name in English is required'
    }
    
    if (!nameAr || !nameAr.trim()) {
      newErrors.nameAr = 'Product name in Arabic is required'
    }

    if (!price || parseFloat(price) <= 0) {
      newErrors.price = 'Please provide a valid price'
    }

    if (salesChannels.length === 0) {
      newErrors.salesChannels = 'Please select at least one sales channel'
    }

    if (productType === 'bundle' && bundleItems.length === 0) {
      newErrors.bundleItems = 'Please add at least one product to the bundle'
    }

    // If there are errors, set them and don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fill in all required fields')
      return
    }

    // Clear errors if validation passes
    setErrors({})

    if (!storeId) {
      toast.error('Store not found. Please create a store or connect to an external store first.')
      return
    }

    setIsLoading(true)

    try {
      if (product) {
        // Update existing product
        const updateData: any = {
          name_en: nameEn || null,
          name_ar: nameAr || null,
          description_en: descriptionEn || null,
          description_ar: descriptionAr || null,
          price: parseFloat(price),
          compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
          discount_type: discountType,
          discount_value: discountValue ? parseFloat(discountValue) : null,
          discount_start_date: discountStartDate || null,
          discount_end_date: discountEndDate || null,
          sku: sku || null,
          barcode: barcode || null,
          barcode_type: barcodeType || 'EAN13',
          is_available: isAvailable,
          category_ids: selectedCategoryIds,
          product_type: productType,
          selling_method: sellingMethod,
          selling_unit: sellingUnit || null,
          fulfillment_type: fulfillmentTypes,
          requires_scheduling: requiresScheduling,
          subscription_interval: subscriptionInterval || null,
          sales_channels: salesChannels,
        }

        // Upload new images if any
        if (imageFiles.length > 0) {
          setIsUploadingImage(true)
          try {
            for (const file of imageFiles) {
              const formData = new FormData()
              formData.append('file', file)

              const uploadResponse = await fetch(`/api/products/${product.id}/upload-image`, {
                method: 'POST',
                body: formData,
              })

              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json()
                throw new Error(errorData.error || 'Failed to upload image')
              }
            }
          } finally {
            setIsUploadingImage(false)
          }
        }

        // Update primary image if changed
        const primaryImage = existingImages.find(img => img.is_primary)
        if (primaryImage) {
          // Update product.image_url to primary for backward compatibility
          updateData.image_url = primaryImage.url
        } else if (existingImages.length === 0 && imageFiles.length === 0) {
          // All images removed
          updateData.image_url = null
        }

        const response = await fetch(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })

        // Delete removed existing images and update primary
        if (response.ok) {
          // Only delete images that user explicitly removed (tracked in deletedImageIds)
          for (const imageId of deletedImageIds) {
            await fetch(`/api/products/${product.id}/images`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageId }),
            })
          }

          // Update primary image if changed
          const newPrimary = existingImages.find(img => img.is_primary)
          if (newPrimary) {
            await fetch(`/api/products/${product.id}/images`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageId: newPrimary.id, is_primary: true }),
            })
          }
        }

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update product')
        }

        toast.success('Product updated successfully')
        setDeletedImageIds([]) // Clear after successful save
      } else {
        // Create new product
        const createData: any = {
          name_en: nameEn || null,
          name_ar: nameAr || null,
          description_en: descriptionEn || null,
          description_ar: descriptionAr || null,
          price: parseFloat(price),
          compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
          discount_type: discountType,
          discount_value: discountValue ? parseFloat(discountValue) : null,
          discount_start_date: discountStartDate || null,
          discount_end_date: discountEndDate || null,
          sku: sku || null,
          barcode: barcode || null,
          barcode_type: barcodeType || 'EAN13',
          store_id: storeId,
          is_available: isAvailable,
          category_ids: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
          product_type: productType,
          selling_method: sellingMethod,
          selling_unit: sellingUnit || null,
          fulfillment_type: fulfillmentTypes,
          requires_scheduling: requiresScheduling,
          subscription_interval: subscriptionInterval || null,
          sales_channels: salesChannels,
        }

        // Create product first
        const createResponse = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData),
        })

        if (!createResponse.ok) {
          let errorData: any = {}
          let errorMessage = 'Failed to create product'
          
          try {
            const contentType = createResponse.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              errorData = await createResponse.json()
              errorMessage = errorData.error || errorData.details || errorData.message || 'Failed to create product'
            } else {
              const text = await createResponse.text()
              errorMessage = text || `HTTP ${createResponse.status}: ${createResponse.statusText}`
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError)
            errorMessage = `HTTP ${createResponse.status}: ${createResponse.statusText}`
          }
          
          // Log full error details for debugging
          console.error('=== PRODUCT CREATION ERROR ===')
          console.error('Status:', createResponse.status, createResponse.statusText)
          console.error('Error Data:', errorData)
          console.error('Error Message:', errorMessage)
          console.error('Full Error JSON:', JSON.stringify(errorData, null, 2))
          console.error('Request Data:', createData)
          console.error('==============================')
          
          // Include more details in the error message if available
          let detailedMessage = errorMessage
          if (errorData.details) {
            detailedMessage = `${errorMessage}\nDetails: ${errorData.details}`
          }
          if (errorData.code) {
            detailedMessage = `${detailedMessage}\nCode: ${errorData.code}`
          }
          if (errorData.hint) {
            detailedMessage = `${detailedMessage}\nHint: ${errorData.hint}`
          }
            
          throw new Error(detailedMessage)
        }

        let newProduct
        try {
          const responseData = await createResponse.json()
          newProduct = responseData.product
          if (!newProduct) {
            throw new Error('Product data not found in response')
          }
        } catch (parseError) {
          console.error('Error parsing success response:', parseError)
          throw new Error('Failed to parse product creation response')
        }

        // Upload images if provided
        if (imageFiles.length > 0 && newProduct?.id) {
          setIsUploadingImage(true)
          try {
            for (const file of imageFiles) {
              const formData = new FormData()
              formData.append('file', file)

              const uploadResponse = await fetch(`/api/products/${newProduct.id}/upload-image`, {
                method: 'POST',
                body: formData,
              })

              if (!uploadResponse.ok) {
                // Log error but don't fail the creation
                console.error('Failed to upload image:', await uploadResponse.json())
              }
            }
          } finally {
            setIsUploadingImage(false)
          }
        }

        toast.success('Product created successfully')
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Error saving product:', error)
      const errorMessage = error.message || 'Failed to save product'
      toast.error(errorMessage, {
        description: error.details || error.hint || 'Please check the console for more details'
      })
    } finally {
      setIsLoading(false)
      setIsUploadingImage(false)
    }
  }

  const formContent = (
    <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name - English */}
          <div className="space-y-2">
            <Label htmlFor="name_en" className={cn("flex items-center gap-2", errors.nameEn ? 'text-red-600' : '')}>
              Product Name (English) <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
            </Label>
            <Input
              id="name_en"
              value={nameEn}
              onChange={(e) => {
                setNameEn(e.target.value)
                if (errors.nameEn) setErrors(prev => ({ ...prev, nameEn: undefined }))
              }}
              placeholder="Enter product name in English"
              dir="ltr"
              className={errors.nameEn ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.nameEn && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.nameEn}
              </p>
            )}
          </div>

          {/* Product Name - Arabic */}
          <div className="space-y-2">
            <Label htmlFor="name_ar" className={cn("flex items-center gap-2", errors.nameAr ? 'text-red-600' : '')}>
              Product Name (Arabic) <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
            </Label>
            <Input
              id="name_ar"
              value={nameAr}
              onChange={(e) => {
                setNameAr(e.target.value)
                if (errors.nameAr) setErrors(prev => ({ ...prev, nameAr: undefined }))
              }}
              placeholder="أدخل اسم المنتج بالعربية"
              dir="rtl"
              className={errors.nameAr ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.nameAr && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.nameAr}
              </p>
            )}
          </div>

          {/* Description - English */}
          <div className="space-y-2">
            <Label htmlFor="description_en">Description (English)</Label>
            <Textarea
              id="description_en"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="Enter product description in English"
              rows={3}
              dir="ltr"
            />
          </div>

          {/* Description - Arabic */}
          <div className="space-y-2">
            <Label htmlFor="description_ar">Description (Arabic)</Label>
            <Textarea
              id="description_ar"
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder="أدخل وصف المنتج بالعربية"
              rows={3}
              dir="rtl"
            />
          </div>

          {/* Product Images Section */}
          <div className="rounded-2xl bg-gray-100/50 overflow-hidden">
            {existingImages.length === 0 && imagePreviews.length === 0 ? (
              /* Empty State */
              <div className="py-16 px-8 flex flex-col items-center justify-center">
                {/* Stacked Image Placeholders */}
                <div className="relative h-32 w-48 mb-8">
                  {/* Left card */}
                  <div className="absolute left-0 top-4 w-20 h-28 bg-white rounded-xl shadow-lg transform -rotate-12 overflow-hidden border border-gray-200">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-300" />
                    </div>
                  </div>
                  {/* Center card */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-20 h-28 bg-white rounded-xl shadow-xl z-10 overflow-hidden border border-gray-200">
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-150 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  {/* Right card */}
                  <div className="absolute right-0 top-4 w-20 h-28 bg-white rounded-xl shadow-lg transform rotate-12 overflow-hidden border border-gray-200">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-300" />
                    </div>
                  </div>
                </div>
                
                {/* Text Content */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                  Upload product images
                </h3>
                <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                  Add multiple images to showcase your product from different angles. High-quality images help increase sales.
                </p>
                
                {/* Upload Button */}
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <Button 
                    type="button" 
                    className="bg-[#F4610B] hover:bg-[#E5550A] text-white px-8 py-3 h-auto text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                    asChild
                  >
                    <span>
                      <ImageIcon className="h-5 w-5 mr-2" />
                      Upload images
                    </span>
                  </Button>
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            ) : (
              /* Images Grid - When images exist */
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-gray-600" />
                    Product Images
                    <span className="text-xs font-medium text-white bg-[#F4610B] px-2.5 py-1 rounded-full">
                      {existingImages.length + imagePreviews.length}
                    </span>
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Existing Images */}
                  {existingImages.map((img, index) => (
                    <div key={img.id} className="relative group pt-2 pr-2">
                      {/* Fixed Remove Button - Offset from image */}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.id)}
                        className="absolute top-0 right-0 h-6 w-6 bg-[#F4610B] rounded-full shadow-md flex items-center justify-center hover:bg-[#E5550A] transition-colors z-10"
                        title="Remove image"
                      >
                        <X className="h-3.5 w-3.5 text-white" />
                      </button>
                      <div className={cn(
                        "relative aspect-square rounded-xl overflow-hidden bg-white transition-all duration-200",
                        img.is_primary && "ring-2 ring-[#F4610B] ring-offset-2"
                      )}>
                        <Image
                          src={img.url}
                          alt={`Product image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {img.is_primary && (
                          <div className="absolute top-2 left-2 bg-[#F4610B] text-white text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1 shadow-lg">
                            <Star className="h-2.5 w-2.5 fill-white" />
                            Primary
                          </div>
                        )}
                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-[#F4610B]/0 group-hover:bg-[#F4610B]/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          {!img.is_primary && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              onClick={() => setPrimaryImage(img.id)}
                              className="h-8 w-8 bg-white hover:bg-white shadow-lg"
                              title="Set as primary"
                            >
                              <Star className="h-4 w-4 text-[#F4610B]" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* New Image Previews */}
                  {imagePreviews.map((preview, index) => {
                    const isFeatured = index === featuredNewImageIndex && !existingImages.some(img => img.is_primary)
                    return (
                    <div key={`new-${index}`} className="relative group pt-2 pr-2">
                      {/* Fixed Remove Button - Offset from image */}
                      <button
                        type="button"
                          onClick={() => {
                            removeImage(index)
                            // Adjust featured index if needed
                            if (index === featuredNewImageIndex && imagePreviews.length > 1) {
                              setFeaturedNewImageIndex(0)
                            } else if (index < featuredNewImageIndex) {
                              setFeaturedNewImageIndex(prev => prev - 1)
                            }
                          }}
                        className="absolute top-0 right-0 h-6 w-6 bg-[#F4610B] rounded-full shadow-md flex items-center justify-center hover:bg-[#E5550A] transition-colors z-10"
                        title="Remove image"
                      >
                        <X className="h-3.5 w-3.5 text-white" />
                      </button>
                        <div className={cn(
                          "relative aspect-square rounded-xl overflow-hidden bg-white transition-all duration-200",
                          isFeatured && "ring-2 ring-[#F4610B] ring-offset-2"
                        )}>
                        <img
                          src={preview}
                          alt={`New image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                          {/* Featured Badge */}
                          {isFeatured && (
                            <div className="absolute top-2 left-2 bg-[#F4610B] text-white text-[10px] px-2 py-1 rounded-md font-semibold flex items-center gap-1 shadow-lg">
                              <Star className="h-2.5 w-2.5 fill-white" />
                              Primary
                      </div>
                          )}
                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-[#F4610B]/0 group-hover:bg-[#F4610B]/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            {!isFeatured && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                onClick={() => {
                                  // Clear any existing primary from existingImages
                                  setExistingImages(imgs => imgs.map(img => ({ ...img, is_primary: false })))
                                  setFeaturedNewImageIndex(index)
                                }}
                                className="h-8 w-8 bg-white hover:bg-white shadow-lg"
                                title="Set as primary"
                              >
                                <Star className="h-4 w-4 text-[#F4610B]" />
                              </Button>
                            )}
                    </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Add More Image Card */}
                  <div className="relative group">
                    <Label htmlFor="image-upload-more" className="cursor-pointer block">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 hover:bg-gray-300 transition-all duration-200 flex items-center justify-center">
                        <Plus className="h-8 w-8 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                      </div>
                    </Label>
                    <Input
                      id="image-upload-more"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Categories Section */}
          <div className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Tag className="h-4 w-4 text-gray-600" />
              </div>
              Product Category <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
            </h4>
            <p className="text-xs text-gray-500 -mt-2">Categorize your product for better organization and discoverability</p>
            
            {isCategoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Main Category */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#F4610B] text-white text-xs flex items-center justify-center font-medium">1</span>
                    Main Category
                  </Label>
                  <Select
                    value={selectedMainCategory}
                    onValueChange={(value) => {
                      setSelectedMainCategory(value)
                      setSelectedSubCategory('')
                      setSelectedSubSubCategory('')
                    }}
                  >
                    <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20">
                      <SelectValue placeholder="Select main category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories
                        .filter(cat => cat.parent_id === null && cat.level === 0)
                        .map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              {cat.icon && <span>{cat.icon}</span>}
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub Category - Only show if main category selected and has children */}
                {selectedMainCategory && allCategories.some(cat => cat.parent_id === selectedMainCategory) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-[#F4610B]/80 text-white text-xs flex items-center justify-center font-medium">2</span>
                      Sub Category
                    </Label>
                    <Select
                      value={selectedSubCategory}
                      onValueChange={(value) => {
                        setSelectedSubCategory(value)
                        setSelectedSubSubCategory('')
                      }}
                    >
                      <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20">
                        <SelectValue placeholder="Select sub category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories
                          .filter(cat => cat.parent_id === selectedMainCategory)
                          .map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="flex items-center gap-2">
                                {cat.icon && <span>{cat.icon}</span>}
                                {cat.name}
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sub-Sub Category - Only show if sub category selected and has children */}
                {selectedSubCategory && allCategories.some(cat => cat.parent_id === selectedSubCategory) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-[#F4610B]/60 text-white text-xs flex items-center justify-center font-medium">3</span>
                      Sub-Sub Category
                    </Label>
                    <Select
                      value={selectedSubSubCategory}
                      onValueChange={setSelectedSubSubCategory}
                    >
                      <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20">
                        <SelectValue placeholder="Select sub-sub category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories
                          .filter(cat => cat.parent_id === selectedSubCategory)
                          .map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="flex items-center gap-2">
                                {cat.icon && <span>{cat.icon}</span>}
                                {cat.name}
                              </span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selected Category Path Display */}
                {selectedMainCategory && (
                  <div className="flex items-center gap-2 text-xs text-[#F4610B] bg-[#F4610B]/10 px-3 py-2 rounded-lg mt-3">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">
                      {(() => {
                        const parts: string[] = []
                        const main = allCategories.find(c => c.id === selectedMainCategory)
                        const sub = allCategories.find(c => c.id === selectedSubCategory)
                        const subSub = allCategories.find(c => c.id === selectedSubSubCategory)
                        if (main) parts.push(main.name)
                        if (sub) parts.push(sub.name)
                        if (subSub) parts.push(subSub.name)
                        return parts.join(' → ')
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Classification Section */}
          <div className="space-y-5 p-5 bg-white rounded-2xl border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Package className="h-4 w-4 text-gray-600" />
              </div>
              Product Classification
            </h4>
            
            {/* Product Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm text-gray-600">Product Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'physical', label: 'Physical', desc: 'Tangible goods', icon: Package },
                  { value: 'digital', label: 'Digital', desc: 'Downloads & files', icon: CloudDownload },
                  { value: 'service', label: 'Experience', desc: 'Events & activities', icon: Sparkles },
                  { value: 'bundle', label: 'Bundle', desc: 'Multi-product box', icon: Gift },
                ] as const).map((type) => {
                  const Icon = type.icon
                  const isSelected = productType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setProductType(type.value)
                        if (type.value === 'digital') {
                          setSellingMethod('unit')
                          setFulfillmentTypes(['digital'])
                        } else if (type.value === 'service') {
                          setSellingMethod('time')
                          setFulfillmentTypes(['onsite'])
                          setRequiresScheduling(true)
                        } else if (type.value === 'bundle') {
                          setSellingMethod('unit')
                          setFulfillmentTypes(['pickup', 'delivery'])
                          setRequiresScheduling(false)
                        } else {
                          setSellingMethod('unit')
                          setFulfillmentTypes(['pickup'])
                          setRequiresScheduling(false)
                        }
                      }}
                      className={cn(
                        "relative flex items-center gap-3 p-4 rounded-xl transition-all text-left border-2",
                        isSelected
                          ? "bg-[#F4610B]/5 border-[#F4610B] text-gray-900"
                          : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-[#F4610B]/10" : "bg-gray-100"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          isSelected ? "text-[#F4610B]" : "text-gray-600"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium text-sm",
                          isSelected ? "text-gray-900" : "text-gray-700"
                        )}>{type.label}</div>
                        <div className="text-xs truncate text-gray-500">
                          {type.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selling Method */}
            <div className="space-y-3">
              <Label className="text-sm text-gray-600">Selling Method</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'unit', label: 'Per Unit', disabled: productType === 'service' },
                  { value: 'weight', label: 'By Weight', disabled: productType !== 'physical' },
                  { value: 'length', label: 'By Length', disabled: productType !== 'physical' },
                  { value: 'time', label: 'By Time', disabled: productType !== 'service' },
                  { value: 'subscription', label: 'Subscription', disabled: productType === 'bundle' ? false : false },
                ].filter(method => !method.disabled).map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => {
                      setSellingMethod(method.value as any)
                      if (method.value === 'weight') setSellingUnit('kg')
                      else if (method.value === 'length') setSellingUnit('m')
                      else if (method.value === 'time') setSellingUnit('hour')
                      else setSellingUnit('')
                    }}
                    className={cn(
                      "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                      sellingMethod === method.value
                        ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                    )}
                  >
                    {sellingMethod === method.value && (
                      <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selling Unit */}
            {(sellingMethod === 'weight' || sellingMethod === 'length' || sellingMethod === 'time') && (
              <div className="space-y-3">
                <Label className="text-sm text-gray-600">Unit</Label>
                <div className="flex flex-wrap gap-2">
                  {sellingMethod === 'weight' && (
                    <>
                      {['kg', 'g', 'lb', 'oz'].map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setSellingUnit(unit)}
                          className={cn(
                            "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                            sellingUnit === unit
                              ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                          )}
                        >
                          {sellingUnit === unit && (
                            <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {unit}
                        </button>
                      ))}
                    </>
                  )}
                  {sellingMethod === 'length' && (
                    <>
                      {['m', 'cm', 'ft', 'in'].map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setSellingUnit(unit)}
                          className={cn(
                            "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                            sellingUnit === unit
                              ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                          )}
                        >
                          {sellingUnit === unit && (
                            <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {unit}
                        </button>
                      ))}
                    </>
                  )}
                  {sellingMethod === 'time' && (
                    <>
                      {['hour', 'day', 'week', 'month'].map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setSellingUnit(unit)}
                          className={cn(
                            "py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2 border",
                            sellingUnit === unit
                              ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                          )}
                        >
                          {sellingUnit === unit && (
                            <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {unit}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Subscription Interval */}
            {sellingMethod === 'subscription' && (
              <div className="space-y-3">
                <Label className="text-sm text-gray-600">Billing Cycle</Label>
                <div className="flex flex-wrap gap-2">
                  {['daily', 'weekly', 'monthly', 'yearly'].map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      onClick={() => setSubscriptionInterval(interval)}
                      className={cn(
                        "py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize flex items-center gap-2 border",
                        subscriptionInterval === interval
                          ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                      )}
                    >
                      {subscriptionInterval === interval && (
                        <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {interval}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fulfillment Types */}
            <div className="space-y-3">
              <Label className="text-sm text-gray-600">Fulfillment</Label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'pickup', label: 'Pickup', disabled: productType === 'digital' || productType === 'service' },
                  { value: 'delivery', label: 'Delivery', disabled: productType === 'digital' || productType === 'service' },
                  { value: 'digital', label: 'Digital', disabled: productType !== 'digital' },
                  { value: 'onsite', label: 'On-Site', disabled: productType !== 'service' },
                ] as const).filter(type => !type.disabled).map((type) => {
                  const isChecked = fulfillmentTypes.includes(type.value)
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setFulfillmentTypes(fulfillmentTypes.filter(t => t !== type.value))
                        } else {
                          setFulfillmentTypes([...fulfillmentTypes, type.value])
                        }
                      }}
                      className={cn(
                        "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                        isChecked
                          ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                      )}
                    >
                      {isChecked && (
                        <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {type.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Requires Scheduling */}
            {productType === 'service' && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequiresScheduling(!requiresScheduling)}
                  className={cn(
                    "h-5 w-9 rounded-full transition-all relative",
                    requiresScheduling ? "bg-[#F4610B]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                    requiresScheduling ? "left-4" : "left-0.5"
                  )} />
                </button>
                <span className="text-sm text-gray-700">Requires appointment scheduling</span>
              </div>
            )}
          </div>

          {/* Bundle Composition Section */}
          {productType === 'bundle' && (
            <div className={cn(
              "space-y-4 p-5 bg-white rounded-2xl border",
              errors.bundleItems ? "border-red-300" : "border-gray-200"
            )}>
              <h4 className={cn(
                "text-sm font-semibold flex items-center gap-2",
                errors.bundleItems ? "text-red-600" : "text-gray-900"
              )}>
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  errors.bundleItems ? "bg-red-100" : "bg-gray-100"
                )}>
                  <Gift className={cn(
                    "h-4 w-4",
                    errors.bundleItems ? "text-red-600" : "text-gray-600"
                  )} />
                </div>
                Bundle Contents <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
                {bundleItems.length > 0 && (
                  <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {bundleItems.length} {bundleItems.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </h4>

              {/* Bundle Items List */}
              {bundleItems.length > 0 ? (
                <div className="space-y-2">
                  {bundleItems.map((item, index) => (
                    <div
                      key={item.product_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-400">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      
                      {/* Product Image */}
                      <div className="h-12 w-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.product?.name_en || 'Unknown Product'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.product?.sku || 'No SKU'}
                          {item.substitutes && item.substitutes.length > 0 && (
                            <span className="ml-2 text-[#F4610B]">
                              • {item.substitutes.length} substitute{item.substitutes.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {/* Quantity */}
                      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              setBundleItems(items => 
                                items.map((i, idx) => 
                                  idx === index ? { ...i, quantity: i.quantity - 1 } : i
                                )
                              )
                            }
                          }}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBundleItems(items => 
                              items.map((i, idx) => 
                                idx === index ? { ...i, quantity: i.quantity + 1 } : i
                              )
                            )
                          }}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Required Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setBundleItems(items => 
                            items.map((i, idx) => 
                              idx === index ? { ...i, is_required: !i.is_required } : i
                            )
                          )
                        }}
                        className={cn(
                          "text-xs px-2 py-1 rounded-lg transition-colors",
                          item.is_required 
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        )}
                      >
                        {item.is_required ? 'Required' : 'Optional'}
                      </button>
                      
                      {/* Add Substitute Button */}
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Open substitute selection modal
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#F4610B]"
                        title="Add substitute"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </button>
                      
                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setBundleItems(items => items.filter((_, idx) => idx !== index))
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "text-center py-8 border-2 border-dashed rounded-xl",
                  errors.bundleItems ? "border-red-300 bg-red-50" : "border-gray-200"
                )}>
                  <Gift className={cn(
                    "h-10 w-10 mx-auto mb-3",
                    errors.bundleItems ? "text-red-400" : "text-gray-300"
                  )} />
                  <p className={cn(
                    "text-sm",
                    errors.bundleItems ? "text-red-600" : "text-gray-500"
                  )}>
                    {errors.bundleItems || "No products added to this bundle yet"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Add products below to create your bundle</p>
                </div>
              )}

              {/* Add Product to Bundle */}
              <div className="space-y-3 pt-2">
                <Label className="text-sm text-gray-600">Add Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search products to add..."
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value)
                      // TODO: Implement product search
                    }}
                    className="pl-10 h-11 rounded-xl border-gray-200"
                  />
                </div>
                
                {/* Quick Add Buttons - Show available products */}
                {availableProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {availableProducts
                      .filter(p => 
                        p.product_type !== 'bundle' && 
                        !bundleItems.some(bi => bi.product_id === p.id)
                      )
                      .slice(0, 6)
                      .map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setBundleItems(items => [...items, {
                              product_id: product.id,
                              product: product,
                              quantity: 1,
                              is_required: true,
                              sort_order: items.length,
                              substitutes: []
                            }])
                            if (errors.bundleItems) setErrors(prev => ({ ...prev, bundleItems: undefined }))
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors border border-gray-200 hover:border-gray-300"
                        >
                          <Plus className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate max-w-[150px]">{product.name_en}</span>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Bundle Info */}
              {bundleItems.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Add substitutes to items that may go out of stock. The system will automatically use substitutes when needed.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Variants Section */}
          <div className={cn(
            "bg-white rounded-2xl border overflow-hidden transition-all",
            hasVariants ? "border-[#F4610B]/30" : "border-gray-200"
          )}>
            {/* Section Header with Toggle */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setHasVariants(!hasVariants)
                if (!hasVariants) {
                  setVariantOptions([])
                  setVariants([])
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHasVariants(!hasVariants) } }}
              className={cn(
                "w-full flex items-center justify-between p-5 cursor-pointer transition-colors",
                hasVariants ? "bg-[#F4610B]/5" : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                  hasVariants ? "bg-[#F4610B]/10" : "bg-gray-100"
                )}>
                  <ArrowRightLeft className={cn(
                    "h-4 w-4 transition-colors",
                    hasVariants ? "text-[#F4610B]" : "text-gray-600"
                  )} />
                </div>
                <div className="text-left">
                  <h4 className={cn(
                    "text-sm font-semibold",
                    hasVariants ? "text-[#F4610B]" : "text-gray-900"
                  )}>
                    Product Variants
                  </h4>
                  <p className="text-xs text-gray-500">
                    {hasVariants ? `${variantOptions.length} option${variantOptions.length !== 1 ? 's' : ''} configured` : "Add size, color, or other variations"}
                  </p>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={hasVariants}
                  onCheckedChange={(checked) => {
                    setHasVariants(checked)
                    if (!checked) {
                      setVariantOptions([])
                      setVariants([])
                    }
                  }}
                  className={cn(hasVariants ? "!bg-[#F4610B]" : "")}
                />
              </div>
            </div>

            {/* Variant Options - Only shown when enabled */}
            {hasVariants && (
              <div className="space-y-4 p-5 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Existing Options */}
                {variantOptions.map((option, optionIndex) => (
                  <div key={option.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-[#F4610B] text-white text-xs flex items-center justify-center font-medium">
                          {optionIndex + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{option.name}</span>
                        <Badge className="text-xs bg-[#F4610B]/10 text-[#F4610B] border-[#F4610B]/20">
                          {option.values.length} value{option.values.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVariantOptions(variantOptions.filter(o => o.id !== option.id))
                          // Regenerate variants without this option
                          setVariants([])
                        }}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Option Values */}
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value, valueIndex) => (
                        <Badge
                          key={valueIndex}
                          className="px-3 py-1.5 text-sm bg-[#F4610B] text-white border-0 hover:bg-[#E5550A]"
                        >
                          {value}
            <button
              type="button"
                            onClick={() => {
                              const newOptions = [...variantOptions]
                              newOptions[optionIndex].values = option.values.filter((_, i) => i !== valueIndex)
                              setVariantOptions(newOptions)
                              setVariants([])
                            }}
                            className="ml-2 hover:text-white/70"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    {/* Add Value Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Add ${option.name.toLowerCase()} value...`}
                        value={newOptionValues[option.id] || ''}
                        onChange={(e) => setNewOptionValues({ ...newOptionValues, [option.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newOptionValues[option.id]?.trim()) {
                            e.preventDefault()
                            const newOptions = [...variantOptions]
                            if (!newOptions[optionIndex].values.includes(newOptionValues[option.id].trim())) {
                              newOptions[optionIndex].values.push(newOptionValues[option.id].trim())
                              setVariantOptions(newOptions)
                              setVariants([])
                            }
                            setNewOptionValues({ ...newOptionValues, [option.id]: '' })
                          }
                        }}
                        className="flex-1 h-9 text-sm bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newOptionValues[option.id]?.trim()) {
                            const newOptions = [...variantOptions]
                            if (!newOptions[optionIndex].values.includes(newOptionValues[option.id].trim())) {
                              newOptions[optionIndex].values.push(newOptionValues[option.id].trim())
                              setVariantOptions(newOptions)
                              setVariants([])
                            }
                            setNewOptionValues({ ...newOptionValues, [option.id]: '' })
                          }
                        }}
                        className="h-9"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add New Option */}
                {variantOptions.length < 3 && (
                  <div className="p-4 rounded-xl">
                    {!isAddingCustomOption ? (
                      <>
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value === 'Custom') {
                              setIsAddingCustomOption(true)
                              setCustomOptionName('')
                            } else if (value) {
                              setVariantOptions([
                                ...variantOptions,
                                { id: `opt-${Date.now()}`, name: value, values: [] }
                              ])
                            }
                          }}
                        >
                          <SelectTrigger className="h-12 w-full bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20 transition-all">
                            <SelectValue placeholder="+ Add option (Size, Color, Material...)" className="text-gray-500" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-2 border-gray-200 shadow-lg">
                            {['Size', 'Color', 'Material', 'Style', 'Pattern', 'Weight', 'Length', 'Custom'].filter(
                              opt => opt === 'Custom' || !variantOptions.some(vo => vo.name === opt)
                            ).map(opt => (
                              <SelectItem 
                                key={opt} 
                                value={opt}
                                className="cursor-pointer rounded-lg mx-1 my-0.5 focus:bg-[#F4610B] focus:text-white data-[highlighted]:bg-[#F4610B] data-[highlighted]:text-white"
                              >
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-2">
                          You can add up to 3 options (e.g., Size, Color, Material)
                        </p>
                      </>
                    ) : (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-gray-700">Custom Option</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAddingCustomOption(false)
                              setCustomOptionName('')
                            }}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-600">Option Name</Label>
                          <Input
                            placeholder="e.g., Flavor, Scent, Finish..."
                            value={customOptionName}
                            onChange={(e) => setCustomOptionName(e.target.value)}
                            className="h-10 bg-white border-2 border-gray-200 rounded-xl focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (customOptionName.trim()) {
                              setVariantOptions([
                                ...variantOptions,
                                { id: `opt-${Date.now()}`, name: customOptionName.trim(), values: [] }
                              ])
                              setIsAddingCustomOption(false)
                              setCustomOptionName('')
                            }
                          }}
                          disabled={!customOptionName.trim()}
                          className="w-full h-10 bg-[#F4610B] hover:bg-[#E5550A] text-white rounded-xl"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add "{customOptionName || '...'}" Option
                        </Button>
                      </div>
                  )}
                </div>
                )}

                {/* Generate Variants Button */}
                {variantOptions.length > 0 && variantOptions.some(o => o.values.length > 0) && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Generate all combinations
                        const generateCombinations = (options: typeof variantOptions): Array<Record<string, string>> => {
                          if (options.length === 0) return [{}]
                          const [first, ...rest] = options
                          const restCombinations = generateCombinations(rest)
                          const combinations: Array<Record<string, string>> = []
                          for (const value of first.values) {
                            for (const combo of restCombinations) {
                              combinations.push({ [first.name]: value, ...combo })
                            }
                          }
                          return combinations
                        }
                        
                        const combinations = generateCombinations(variantOptions.filter(o => o.values.length > 0))
                        setVariants(combinations.map((combo, i) => ({
                          id: `var-${Date.now()}-${i}`,
                          options: combo,
                          price: price || '',
                          sku: sku ? `${sku}-${Object.values(combo).join('-').toUpperCase().replace(/\s+/g, '')}` : '',
                          stock: stockQuantity || '0',
                          enabled: true
                        })))
                      }}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {(() => {
                        const count = variantOptions.filter(o => o.values.length > 0).reduce((acc, o) => acc * o.values.length, 1)
                        return count
                      })()} Variant{(() => {
                        const count = variantOptions.filter(o => o.values.length > 0).reduce((acc, o) => acc * o.values.length, 1)
                        return count !== 1 ? 's' : ''
                      })()}
                    </Button>
                  </div>
                )}

                {/* Variants Table */}
                {variants.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">Variant</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">Stock</th>
                            <th className="text-center px-4 py-3 font-medium text-gray-600 w-16">Active</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {variants.map((variant, index) => (
                            <tr key={variant.id} className={cn(!variant.enabled && "opacity-50 bg-gray-50")}>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(variant.options).map(([key, value]) => (
                                    <Badge key={key} variant="secondary" className="text-xs">
                                      {value}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="text"
                                  value={variant.price}
                                  onChange={(e) => {
                                    const newVariants = [...variants]
                                    newVariants[index].price = e.target.value.replace(/[^0-9.]/g, '')
                                    setVariants(newVariants)
                                  }}
                                  className="h-8 w-24 text-sm"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="text"
                                  value={variant.sku}
                                  onChange={(e) => {
                                    const newVariants = [...variants]
                                    newVariants[index].sku = e.target.value.toUpperCase()
                                    setVariants(newVariants)
                                  }}
                                  className="h-8 w-32 text-sm font-mono"
                                  placeholder="SKU"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) => {
                                    const newVariants = [...variants]
                                    newVariants[index].stock = e.target.value
                                    setVariants(newVariants)
                                  }}
                                  className="h-8 w-20 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Switch
                                    checked={variant.enabled}
                                    onCheckedChange={(checked) => {
                                      const newVariants = [...variants]
                                      newVariants[index].enabled = checked
                                      setVariants(newVariants)
                                    }}
                                    className={cn(variant.enabled ? "!bg-[#F4610B]" : "")}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                      <span>{variants.filter(v => v.enabled).length} of {variants.length} variants active</span>
                      <span>Total stock: {variants.filter(v => v.enabled).reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0)} units</span>
                    </div>
                  </div>
                        )}
                      </div>
                      )}
                    </div>

          {/* Inventory Section */}
          <div className={cn(
            "bg-white rounded-2xl border overflow-hidden transition-all",
            trackInventory ? "border-[#F4610B]/30" : "border-gray-200"
          )}>
            {/* Section Header with Toggle */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setTrackInventory(!trackInventory)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTrackInventory(!trackInventory) } }}
              className={cn(
                "w-full flex items-center justify-between p-5 cursor-pointer transition-colors",
                trackInventory ? "bg-[#F4610B]/5" : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                  trackInventory ? "bg-[#F4610B]/10" : "bg-gray-100"
                )}>
                  <Package className={cn(
                    "h-4 w-4 transition-colors",
                    trackInventory ? "text-[#F4610B]" : "text-gray-600"
                  )} />
                </div>
                <div className="text-left">
                  <h4 className={cn(
                    "text-sm font-semibold",
                    trackInventory ? "text-[#F4610B]" : "text-gray-900"
                  )}>
                    Inventory Management
                  </h4>
                  <p className="text-xs text-gray-500">
                    {trackInventory 
                      ? stockQuantity 
                        ? `${stockQuantity} units in stock` 
                        : "Configure stock levels below"
                      : "Enable to track stock levels"}
                  </p>
              </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={trackInventory}
                  onCheckedChange={setTrackInventory}
                  className={cn(trackInventory ? "!bg-[#F4610B]" : "")}
                />
              </div>
            </div>

            {/* Inventory Fields - Only shown when tracking is enabled */}
            {trackInventory && (
              <div className="space-y-4 p-5 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Stock Quantity */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity" className="text-sm text-gray-600">
                      Stock Quantity <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        placeholder="0"
                        className="pl-12 h-12 text-lg font-semibold border-2 border-gray-200 rounded-xl focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="low_stock_threshold" className="text-sm text-gray-600">
                      Low Stock Alert
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        id="low_stock_threshold"
                        type="number"
                        min="0"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        placeholder="10"
                        className="pl-12 h-12 text-lg font-semibold border-2 border-gray-200 rounded-xl focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Alert when stock falls below this</p>
                  </div>
                </div>

                {/* Stock Status Display */}
                {stockQuantity && (
              <div className={cn(
                    "flex items-center gap-2 text-xs px-3 py-2 rounded-lg",
                    parseInt(stockQuantity) === 0 
                      ? "text-red-600 bg-red-50"
                      : parseInt(stockQuantity) <= parseInt(lowStockThreshold || '10')
                        ? "text-amber-600 bg-amber-50"
                        : "text-green-600 bg-green-50"
                  )}>
                    {parseInt(stockQuantity) === 0 ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Out of stock</span>
                      </>
                    ) : parseInt(stockQuantity) <= parseInt(lowStockThreshold || '10') ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Low stock - {stockQuantity} units remaining</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">In stock - {stockQuantity} units available</span>
                      </>
                    )}
                  </div>
                )}

                {/* Out of Stock Options */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <Label className="text-sm text-gray-600">When out of stock</Label>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setContinueSellingOutOfStock(!continueSellingOutOfStock)
                        if (!continueSellingOutOfStock) setAllowBackorders(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        continueSellingOutOfStock
                          ? "bg-[#F4610B]/5 border-[#F4610B]"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center",
                          continueSellingOutOfStock ? "bg-[#F4610B]" : "bg-gray-100"
                        )}>
                          {continueSellingOutOfStock && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className={cn(
                            "text-sm font-medium",
                            continueSellingOutOfStock ? "text-[#F4610B]" : "text-gray-700"
                          )}>Continue selling when out of stock</p>
                          <p className="text-xs text-gray-500">Allow customers to purchase even with zero inventory</p>
                        </div>
              </div>
            </button>

                    {continueSellingOutOfStock && (
                      <button
                        type="button"
                        onClick={() => setAllowBackorders(!allowBackorders)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ml-6 animate-in fade-in slide-in-from-top-1 duration-150",
                          allowBackorders
                            ? "bg-[#F4610B]/5 border-[#F4610B]"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        )}
                        style={{ width: 'calc(100% - 1.5rem)' }}
                      >
                        <div className="flex items-center gap-3">
            <div className={cn(
                            "h-6 w-6 rounded-md flex items-center justify-center",
                            allowBackorders ? "bg-[#F4610B]" : "bg-gray-100"
                          )}>
                            {allowBackorders && (
                              <Check className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div>
                            <p className={cn(
                              "text-sm font-medium",
                              allowBackorders ? "text-[#F4610B]" : "text-gray-700"
                            )}>Allow backorders</p>
                            <p className="text-xs text-gray-500">Notify customers about delayed shipping</p>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Product Identifiers Section */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <div className="w-full flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-gray-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Product Identifiers
                  </h4>
                  <p className="text-xs text-gray-500">
                    {sku || barcode 
                      ? `${sku ? `SKU: ${sku}` : ''}${sku && barcode ? ' • ' : ''}${barcode ? `Barcode: ${barcode}` : ''}`
                      : "SKU and barcode for product tracking"}
                  </p>
                </div>
              </div>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateBoth}
                      className="h-8 text-xs"
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      Auto Generate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate both SKU and Barcode</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Content */}
            <div className="space-y-4 p-5 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                {/* SKU Field */}
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-xs text-gray-600">SKU (Stock Keeping Unit)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="sku"
                        value={sku}
                        onChange={(e) => setSku(e.target.value.toUpperCase())}
                        placeholder="Enter or generate"
                        className="font-mono text-sm pr-8"
                        dir="ltr"
                      />
                      {sku && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => copyToClipboard(sku, 'sku')}
                        >
                          {skuCopied ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400" />
                          )}
                        </Button>
                      )}
                    </div>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleGenerateSKU}
                            className="shrink-0 h-9 w-9"
                          >
                            <Wand2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Generate SKU</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Barcode Field */}
                <div className="space-y-2">
                  <Label htmlFor="barcode" className="text-xs text-gray-600">Barcode</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="barcode"
                        value={barcode}
                        onChange={(e) => {
                          setBarcode(e.target.value)
                          const validation = validateBarcode(e.target.value)
                          if (validation.detectedType) {
                            setBarcodeType(validation.detectedType)
                          }
                        }}
                        placeholder="Enter or generate"
                        className={cn(
                          "font-mono text-sm",
                          barcode ? "pr-20" : "pr-8"
                        )}
                        dir="ltr"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        {barcode && (
                          <>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal">
                              {barcodeType}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(barcode, 'barcode')}
                            >
                              {barcodeCopied ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-400" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleGenerateBarcode}
                            className="shrink-0 h-9 w-9"
                          >
                            <Barcode className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Generate Barcode</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              
              <p className="text-[11px] text-gray-500">
                SKU and barcode are used to identify products. You can enter them manually or auto-generate unique values.
              </p>

              {/* Barcode Preview */}
              {barcode && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <BarcodeDisplay
                    barcode={barcode}
                    type={barcodeType as 'EAN13' | 'EAN8' | 'UPC-A' | 'CODE128'}
                    size="md"
                    showValue={true}
                    showCopyButton={true}
                    showDownloadButton={true}
                    showTypeBadge={true}
                    productName={nameEn || nameAr || 'product'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <div className="w-full p-5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                {currencyIcon ? (
                  <img src={currencyIcon} alt="currency" className="h-4 w-4 object-contain" />
                ) : (
                  <DollarSign className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Pricing</h4>
                <p className="text-xs text-gray-500">Set product price and discounts</p>
              </div>
            </div>

            {/* Content */}
              <div className="space-y-5 px-5 pb-5 border-t border-gray-100 pt-4">
                {/* Regular Price - Only shown when no discount */}
                {discountType === 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="price" className={cn("text-sm font-medium", errors.price ? "text-red-600" : "text-gray-700")}>
                      Price <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
                    </Label>
                    <p className="text-xs text-gray-500 -mt-1">The price customers will pay</p>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        {currencyIcon ? (
                          <img 
                            src={currencyIcon} 
                            alt="currency" 
                            className="h-5 w-5 object-contain"
                          />
                        ) : (
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <Input
                        id="price"
                        type="text"
                        inputMode="decimal"
                        value={price ? Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}
                        onChange={(e) => {
                          // Remove all non-numeric characters except decimal point
                          const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                          // Ensure only one decimal point
                          const parts = rawValue.split('.')
                          const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : rawValue
                          // Limit decimal places to 2
                          const [whole, decimal] = sanitized.split('.')
                          const finalValue = decimal !== undefined ? `${whole}.${decimal.slice(0, 2)}` : whole
                          setPrice(finalValue)
                          if (errors.price) setErrors(prev => ({ ...prev, price: undefined }))
                        }}
                        placeholder="0.00"
                        dir="ltr"
                        className={cn(
                          "pl-12 h-12 !text-xl font-semibold border-2 rounded-xl transition-all",
                          errors.price 
                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                            : "border-gray-200 focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20"
                        )}
                      />
                    </div>
                    {errors.price && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.price}
                      </p>
                    )}
                  </div>
                )}

                {/* Original Price - Only shown when discount is active */}
                {discountType !== 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="compare_at_price" className="text-sm font-medium text-gray-700">
                      Original Price <span className="text-gray-400 font-normal">(Compare at)</span>
                    </Label>
                    <p className="text-xs text-gray-500 -mt-1">The regular price before any discount</p>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        {currencyIcon ? (
                          <img 
                            src={currencyIcon} 
                            alt="currency" 
                            className="h-5 w-5 object-contain"
                          />
                        ) : (
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <Input
                        id="compare_at_price"
                        type="text"
                        inputMode="decimal"
                        value={compareAtPrice ? Number(compareAtPrice).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}
                        onChange={(e) => {
                          // Remove all non-numeric characters except decimal point
                          const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                          // Ensure only one decimal point
                          const parts = rawValue.split('.')
                          const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : rawValue
                          // Limit decimal places to 2
                          const [whole, decimal] = sanitized.split('.')
                          const newCompareAt = decimal !== undefined ? `${whole}.${decimal.slice(0, 2)}` : whole
                          setCompareAtPrice(newCompareAt)
                          // Auto-calculate the final price
                          if (discountValue && newCompareAt) {
                            const originalPrice = parseFloat(newCompareAt)
                            const discount = parseFloat(discountValue)
                            if (!isNaN(originalPrice) && !isNaN(discount)) {
                              const finalPrice = discountType === 'percentage'
                                ? originalPrice * (1 - discount / 100)
                                : originalPrice - discount
                              setPrice(Math.max(0, finalPrice).toFixed(2))
                            }
                          }
                        }}
                        placeholder="0.00"
                        dir="ltr"
                        className="pl-12 h-12 !text-xl font-semibold border-2 border-gray-200 rounded-xl transition-all focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Original price before discount (shown crossed out)</p>
                  </div>
                )}

                {/* Discount Type */}
                <div className="space-y-3">
                  <Label className="text-sm text-gray-600">Discount Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: 'none', label: 'No Discount' },
                      { value: 'percentage', label: 'Percentage Off' },
                      { value: 'fixed_amount', label: 'Fixed Amount Off' },
                    ] as const).map((type) => {
                      const isSelected = discountType === type.value
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            const previousType = discountType
                            setDiscountType(type.value)
                            
                            if (type.value === 'none') {
                              // Switching to no discount - restore compare at price as regular price
                              if (compareAtPrice) {
                                setPrice(compareAtPrice)
                              }
                              setCompareAtPrice('')
                              setDiscountValue('')
                            } else {
                              // Switching to a discount type
                              const originalPrice = previousType === 'none' 
                                ? (price && !compareAtPrice ? price : compareAtPrice)
                                : compareAtPrice
                              
                              // Move price to compare at price if coming from no discount
                              if (previousType === 'none' && price && !compareAtPrice) {
                                setCompareAtPrice(price)
                              }
                              
                              const priceNum = parseFloat(originalPrice || price || '0')
                              
                              if (type.value === 'percentage') {
                                // Convert or set default percentage
                                let newPercent = 10
                                if (previousType === 'fixed_amount' && discountValue && !isNaN(priceNum) && priceNum > 0) {
                                  // Convert fixed amount to percentage
                                  newPercent = Math.round((parseFloat(discountValue) / priceNum) * 100)
                                }
                                setDiscountValue(newPercent.toString())
                                // Calculate sale price
                                if (!isNaN(priceNum)) {
                                  setPrice((priceNum * (1 - newPercent / 100)).toFixed(2))
                                }
                              } else if (type.value === 'fixed_amount') {
                                // Convert or set default fixed amount
                                let newAmount = Math.round(priceNum * 0.1)
                                if (previousType === 'percentage' && discountValue && !isNaN(priceNum)) {
                                  // Convert percentage to fixed amount
                                  newAmount = Math.round(priceNum * (parseFloat(discountValue) / 100))
                                }
                                setDiscountValue(newAmount.toString())
                                // Calculate sale price
                                if (!isNaN(priceNum)) {
                                  setPrice((priceNum - newAmount).toFixed(2))
                                }
                              }
                            }
                          }}
                          className={cn(
                            "py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                            isSelected
                              ? "bg-[#F4610B]/5 border-[#F4610B] text-[#F4610B]"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                          )}
                        >
                          {isSelected && (
                            <div className="h-4 w-4 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {type.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Discount Value */}
                {discountType !== 'none' && (
                  <div className="space-y-3">
                    <Label htmlFor="discount_value" className="text-sm text-gray-600">
                      {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                    </Label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          {discountType === 'percentage' ? (
                            <Percent className="h-5 w-5 text-gray-400" />
                          ) : currencyIcon ? (
                            <img 
                              src={currencyIcon} 
                              alt="currency" 
                              className="h-5 w-5 object-contain"
                            />
                          ) : (
                            <DollarSign className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <Input
                          id="discount_value"
                          type="number"
                          step={discountType === 'percentage' ? '1' : '0.01'}
                          min="0"
                          max={discountType === 'percentage' ? '100' : undefined}
                          value={discountValue}
                          onChange={(e) => {
                            const newDiscount = e.target.value
                            setDiscountValue(newDiscount)
                            // Auto-calculate the final price
                            if (compareAtPrice && newDiscount) {
                              const originalPrice = parseFloat(compareAtPrice)
                              const discount = parseFloat(newDiscount)
                              if (!isNaN(originalPrice) && !isNaN(discount)) {
                                const finalPrice = discountType === 'percentage'
                                  ? originalPrice * (1 - discount / 100)
                                  : originalPrice - discount
                                setPrice(Math.max(0, finalPrice).toFixed(2))
                              }
                            }
                          }}
                          placeholder={discountType === 'percentage' ? '25' : '10.00'}
                          dir="ltr"
                          className="pl-12 h-12 !text-xl font-semibold border-2 border-gray-200 rounded-xl transition-all focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    
                    {/* Preset Percentage Buttons - Only for percentage discount */}
                    {discountType === 'percentage' && (
                      <div className="flex flex-wrap gap-2">
                        {[5, 10, 15, 20, 25, 30, 50, 75].map((preset) => {
                          const isSelected = discountValue === String(preset)
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setDiscountValue(String(preset))
                                // Auto-calculate the final price
                                if (compareAtPrice) {
                                  const originalPrice = parseFloat(compareAtPrice)
                                  if (!isNaN(originalPrice)) {
                                    const finalPrice = originalPrice * (1 - preset / 100)
                                    setPrice(Math.max(0, finalPrice).toFixed(2))
                                  }
                                }
                              }}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                isSelected
                                  ? "bg-[#F4610B] text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              )}
                            >
                              {preset}%
                            </button>
                          )
                        })}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      {discountType === 'percentage' 
                        ? 'Select a preset or enter custom percentage' 
                        : 'Enter fixed amount to deduct from compare at price'}
                    </p>
                  </div>
                )}

                {/* Schedule Toggle */}
                {discountType !== 'none' && (
                  <div className="space-y-3">
                    {/* Toggle Button */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const newState = !isScheduleEnabled
                        setIsScheduleEnabled(newState)
                        if (!newState) {
                          // Clear dates when disabling schedule
                          setDiscountStartDate('')
                          setDiscountEndDate('')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          const newState = !isScheduleEnabled
                          setIsScheduleEnabled(newState)
                          if (!newState) {
                            setDiscountStartDate('')
                            setDiscountEndDate('')
                          }
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                        isScheduleEnabled 
                          ? "bg-[#F4610B]/5 border-[#F4610B]" 
                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                          isScheduleEnabled ? "bg-[#F4610B]/10" : "bg-gray-100"
                        )}>
                          <Calendar className={cn(
                            "h-4 w-4 transition-colors",
                            isScheduleEnabled ? "text-[#F4610B]" : "text-gray-400"
                          )} />
                        </div>
                        <div className="text-left">
                          <p className={cn(
                            "text-sm font-medium",
                            isScheduleEnabled ? "text-[#F4610B]" : "text-gray-700"
                          )}>
                            Schedule this discount
                          </p>
                          <p className="text-xs text-gray-500">
                            {isScheduleEnabled ? "Set start and end dates" : "Discount starts immediately"}
                          </p>
                        </div>
                      </div>
                      {/* Toggle Switch */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={isScheduleEnabled}
                          onCheckedChange={(checked) => {
                            setIsScheduleEnabled(checked)
                            if (!checked) {
                              setDiscountStartDate('')
                              setDiscountEndDate('')
                            }
                          }}
                          className={cn(
                            isScheduleEnabled ? "!bg-[#F4610B]" : ""
                          )}
                        />
                      </div>
                    </div>

                    {/* Schedule Fields - Only shown when enabled */}
                    {isScheduleEnabled && (
                      <div className="space-y-4 pl-11 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Quick Duration Presets */}
                        <div className="space-y-2">
                          <Label className="text-xs text-gray-600 font-medium">Quick Duration</Label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: 'Start Now', days: 0 },
                              { label: '1 Week', days: 7 },
                              { label: '2 Weeks', days: 14 },
                              { label: '1 Month', days: 30 },
                              { label: '3 Months', days: 90 },
                            ].map((preset) => {
                              // Check if this preset matches current duration
                              const isSelected = (() => {
                                if (!discountStartDate) return false
                                if (preset.days === 0 && discountStartDate && !discountEndDate) return true
                                if (!discountEndDate) return false
                                const start = new Date(discountStartDate)
                                const end = new Date(discountEndDate)
                                const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                                // Allow some tolerance for time differences
                                return Math.abs(diffDays - preset.days) <= 1
                              })()
                              
                              return (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    const now = new Date()
                                    const startDate = new Date()
                                    const endDate = new Date()
                                    endDate.setDate(endDate.getDate() + preset.days)
                                    
                                    // Format for datetime-local: YYYY-MM-DDTHH:mm
                                    const formatDate = (d: Date) => {
                                      const year = d.getFullYear()
                                      const month = String(d.getMonth() + 1).padStart(2, '0')
                                      const day = String(d.getDate()).padStart(2, '0')
                                      const hours = String(d.getHours()).padStart(2, '0')
                                      const minutes = String(d.getMinutes()).padStart(2, '0')
                                      return `${year}-${month}-${day}T${hours}:${minutes}`
                                    }
                                    
                                    if (preset.days === 0) {
                                      setDiscountStartDate(formatDate(now))
                                      setDiscountEndDate('')
                                    } else {
                                      setDiscountStartDate(formatDate(startDate))
                                      // Set end time to 23:59
                                      endDate.setHours(23, 59)
                                      setDiscountEndDate(formatDate(endDate))
                                    }
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                    isSelected
                                      ? "bg-[#F4610B] text-white"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  )}
                                >
                                  {preset.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Date/Time Cards */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Start Date Card */}
                          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-md bg-green-100 flex items-center justify-center">
                                <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                              </div>
                              <Label className="text-xs font-semibold text-gray-700">Starts</Label>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full h-10 px-3 flex items-center justify-between border border-gray-200 rounded-lg text-sm font-medium bg-white transition-all hover:border-[#F4610B] focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20",
                                    !discountStartDate && "text-gray-400"
                                  )}
                                >
                                  {discountStartDate ? (
                                    <span className="text-gray-900">
                                      {new Date(discountStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {' '}
                                      <span className="text-gray-500">
                                        {new Date(discountStartDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </span>
                                    </span>
                                  ) : (
                                    <span>Select date & time</span>
                                  )}
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <div className="flex">
                                  {/* Calendar */}
                                  <div className="p-3 border-r">
                                    <CalendarPicker
                                      mode="single"
                                      selected={discountStartDate ? new Date(discountStartDate) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          const currentTime = discountStartDate ? new Date(discountStartDate) : new Date()
                                          date.setHours(currentTime.getHours(), currentTime.getMinutes())
                                          const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                                          setDiscountStartDate(formatted)
                                        }
                                      }}
                                      disabled={(date) => {
                                        const today = new Date()
                                        today.setHours(0, 0, 0, 0)
                                        return date < today
                                      }}
                                    />
                                  </div>
                                  {/* Time Picker */}
                                  <div className="p-3 w-32 flex flex-col">
                                    <Label className="text-xs text-gray-600 font-semibold mb-2">Time</Label>
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-64">
                                      {(() => {
                                        const allTimes = [
                                        { time: '00:00', label: '12:00 AM' },
                                        { time: '06:00', label: '6:00 AM' },
                                        { time: '08:00', label: '8:00 AM' },
                                        { time: '09:00', label: '9:00 AM' },
                                        { time: '10:00', label: '10:00 AM' },
                                        { time: '12:00', label: '12:00 PM' },
                                        { time: '14:00', label: '2:00 PM' },
                                        { time: '16:00', label: '4:00 PM' },
                                        { time: '18:00', label: '6:00 PM' },
                                        { time: '20:00', label: '8:00 PM' },
                                        { time: '22:00', label: '10:00 PM' },
                                        { time: '23:59', label: '11:59 PM' },
                                        ]
                                        
                                        const selectedDateStr = discountStartDate?.split('T')[0]
                                        const todayStr = new Date().toISOString().split('T')[0]
                                        const isToday = selectedDateStr === todayStr || !selectedDateStr
                                        const now = new Date()
                                        const currentHour = now.getHours()
                                        const currentMinute = now.getMinutes()
                                        
                                        // Filter times: for today, only show future times; for future dates, show all
                                        const filteredTimes = isToday 
                                          ? allTimes.filter(({ time }) => {
                                              const [hours, minutes] = time.split(':').map(Number)
                                              return hours > currentHour || (hours === currentHour && minutes > currentMinute)
                                            })
                                          : allTimes
                                        
                                        return filteredTimes.map(({ time, label }) => {
                                          const isSelected = discountStartDate?.split('T')[1] === time
                                        
                                        return (
                                          <button
                                            key={time}
                                            type="button"
                                            onClick={() => {
                                              const date = discountStartDate ? discountStartDate.split('T')[0] : new Date().toISOString().split('T')[0]
                                              setDiscountStartDate(`${date}T${time}`)
                                            }}
                                            className={cn(
                                              "px-3 py-1.5 text-xs rounded-lg transition-colors text-left",
                                                isSelected
                                                  ? "bg-[#F4610B] text-white font-medium"
                                                  : "bg-gray-50 hover:bg-[#F4610B]/10 hover:text-[#F4610B] text-gray-600"
                                            )}
                                          >
                                            {label}
                                          </button>
                                        )
                                        })
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            {discountStartDate && (
                              <p className="text-xs text-green-600 font-medium">
                                {new Date(discountStartDate).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>

                          {/* End Date Card */}
                          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-md bg-red-100 flex items-center justify-center">
                                <svg className="h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <Label className="text-xs font-semibold text-gray-700">Ends</Label>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full h-10 px-3 flex items-center justify-between border border-gray-200 rounded-lg text-sm font-medium bg-white transition-all hover:border-[#F4610B] focus:border-[#F4610B] focus:ring-2 focus:ring-[#F4610B]/20",
                                    !discountEndDate && "text-gray-400"
                                  )}
                                >
                                  {discountEndDate ? (
                                    <span className="text-gray-900">
                                      {new Date(discountEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {' '}
                                      <span className="text-gray-500">
                                        {new Date(discountEndDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </span>
                                    </span>
                                  ) : (
                                    <span>No end date</span>
                                  )}
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <div className="flex">
                                  {/* Calendar */}
                                  <div className="p-3 border-r">
                                    <CalendarPicker
                                      mode="single"
                                      selected={discountEndDate ? new Date(discountEndDate) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          const currentTime = discountEndDate ? new Date(discountEndDate) : new Date()
                                          currentTime.setHours(23, 59) // Default to end of day
                                          date.setHours(currentTime.getHours(), currentTime.getMinutes())
                                          const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                                          setDiscountEndDate(formatted)
                                        }
                                      }}
                                      disabled={(date) => discountStartDate ? date < new Date(discountStartDate) : false}
                                    />
                                    {discountEndDate && (
                                      <button
                                        type="button"
                                        onClick={() => setDiscountEndDate('')}
                                        className="w-full text-xs text-red-500 hover:text-red-600 py-2 mt-2 border-t"
                                      >
                                        Remove end date
                                      </button>
                                    )}
                                  </div>
                                  {/* Time Picker */}
                                  <div className="p-3 w-32 flex flex-col">
                                    <Label className="text-xs text-gray-600 font-semibold mb-2">Time</Label>
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-64">
                                      {(() => {
                                        const allTimes = [
                                          { time: '00:00', label: '12:00 AM' },
                                          { time: '06:00', label: '6:00 AM' },
                                          { time: '08:00', label: '8:00 AM' },
                                          { time: '09:00', label: '9:00 AM' },
                                          { time: '10:00', label: '10:00 AM' },
                                        { time: '12:00', label: '12:00 PM' },
                                        { time: '14:00', label: '2:00 PM' },
                                        { time: '16:00', label: '4:00 PM' },
                                        { time: '18:00', label: '6:00 PM' },
                                        { time: '20:00', label: '8:00 PM' },
                                        { time: '21:00', label: '9:00 PM' },
                                        { time: '22:00', label: '10:00 PM' },
                                        { time: '23:00', label: '11:00 PM' },
                                        { time: '23:59', label: '11:59 PM' },
                                        ]
                                        
                                        const endDateStr = discountEndDate?.split('T')[0]
                                        const startDateStr = discountStartDate?.split('T')[0]
                                        const startTimeStr = discountStartDate?.split('T')[1]
                                        const todayStr = new Date().toISOString().split('T')[0]
                                        const now = new Date()
                                        const currentHour = now.getHours()
                                        const currentMinute = now.getMinutes()
                                        
                                        const isSameDayAsStart = !!(endDateStr && startDateStr && endDateStr === startDateStr && startTimeStr)
                                        const isToday = endDateStr === todayStr || !endDateStr
                                        const [startHours, startMinutes] = (startTimeStr || '00:00').split(':').map(Number)
                                        
                                        // Filter times: hide past times for today and times before start time if same day
                                        const filteredTimes = allTimes.filter(({ time }) => {
                                          const [hours, minutes] = time.split(':').map(Number)
                                          
                                          // If today, hide past times
                                          if (isToday) {
                                            if (hours < currentHour || (hours === currentHour && minutes <= currentMinute)) {
                                              return false
                                            }
                                          }
                                          
                                          // If same day as start, hide times before or equal to start time
                                          if (isSameDayAsStart) {
                                            if (hours < startHours || (hours === startHours && minutes <= startMinutes)) {
                                              return false
                                            }
                                          }
                                          
                                          return true
                                        })
                                        
                                        return filteredTimes.map(({ time, label }) => {
                                          const isSelected = discountEndDate?.split('T')[1] === time
                                        
                                        return (
                                          <button
                                            key={time}
                                            type="button"
                                            onClick={() => {
                                              const date = discountEndDate ? discountEndDate.split('T')[0] : new Date().toISOString().split('T')[0]
                                              setDiscountEndDate(`${date}T${time}`)
                                            }}
                                            className={cn(
                                              "px-3 py-1.5 text-xs rounded-lg transition-colors text-left",
                                                isSelected
                                                  ? "bg-[#F4610B] text-white font-medium"
                                                  : "bg-gray-50 hover:bg-[#F4610B]/10 hover:text-[#F4610B] text-gray-600"
                                            )}
                                          >
                                            {label}
                                          </button>
                                        )
                                        })
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            {discountEndDate ? (
                              <p className="text-xs text-red-600 font-medium">
                                {new Date(discountEndDate).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400">No end date (runs forever)</p>
                            )}
                          </div>
                        </div>

                        {/* Duration Summary */}
                        {discountStartDate && discountEndDate && (
                          <div className="flex items-center gap-2 text-xs text-[#F4610B] bg-[#F4610B]/10 px-3 py-2 rounded-lg">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                              Duration: <span className="font-semibold">
                                {(() => {
                                  const start = new Date(discountStartDate)
                                  const end = new Date(discountEndDate)
                                  const diffTime = Math.abs(end.getTime() - start.getTime())
                                  
                                  // Calculate exact duration
                                  const totalHours = Math.floor(diffTime / (1000 * 60 * 60))
                                  const totalDays = Math.floor(totalHours / 24)
                                  
                                  const months = Math.floor(totalDays / 30)
                                  const remainingDaysAfterMonths = totalDays % 30
                                  const weeks = Math.floor(remainingDaysAfterMonths / 7)
                                  const days = remainingDaysAfterMonths % 7
                                  const hours = totalHours % 24
                                  
                                  const parts: string[] = []
                                  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`)
                                  if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? 'week' : 'weeks'}`)
                                  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
                                  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
                                  
                                  if (parts.length === 0) return 'Less than an hour'
                                  return parts.join(', ')
                                })()}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Sale Price Section - Only shown when discount is active */}
                {discountType !== 'none' && (
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    {/* Sale Price Display */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Sale Price</p>
                        <div className="flex items-center gap-2">
                          {currencyIcon ? (
                            <img 
                              src={currencyIcon} 
                              alt="currency" 
                              className="h-6 w-6 object-contain"
                            />
                          ) : (
                            <span className="text-2xl text-gray-400">$</span>
                          )}
                          <span className="text-3xl font-bold text-gray-900">
                            {price ? parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </span>
                        </div>
                        {/* Was price - below final price */}
                        {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price || '0') && (
                          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                            Was
                            <span className="line-through flex items-center gap-0.5">
                              {currencyIcon ? (
                                <img src={currencyIcon} alt="currency" className="h-3 w-3 object-contain opacity-50" />
                              ) : (
                                '$'
                              )}
                              {parseFloat(compareAtPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </p>
                        )}
                      </div>
                      {/* Discount badge with savings */}
                      {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price || '0') && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="bg-[#F4610B] text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                            {Math.round(((parseFloat(compareAtPrice) - parseFloat(price || '0')) / parseFloat(compareAtPrice)) * 100)}% OFF
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-0.5">
                            Save
                            <span className="font-semibold text-gray-700 inline-flex items-center gap-0.5">
                              {currencyIcon ? (
                                <img src={currencyIcon} alt="currency" className="h-3 w-3 object-contain" />
                              ) : (
                                '$'
                              )}
                              {(parseFloat(compareAtPrice) - parseFloat(price || '0')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Sales Channels Section */}
          <div className={cn(
            "space-y-4 p-5 bg-white rounded-2xl border",
            errors.salesChannels ? "border-red-300" : "border-gray-200"
          )}>
            <h4 className={cn(
              "text-sm font-semibold flex items-center gap-2",
              errors.salesChannels ? "text-red-600" : "text-gray-900"
            )}>
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                errors.salesChannels ? "bg-red-100" : "bg-gray-100"
              )}>
                <Store className={cn(
                  "h-4 w-4",
                  errors.salesChannels ? "text-red-600" : "text-gray-600"
                )} />
              </div>
              Sales Channels <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
            </h4>
            
            <div className="space-y-3">
              <Label className={cn("text-sm", errors.salesChannels ? "text-red-600" : "text-gray-600")}>
                Where to sell
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'online', label: 'Online', desc: 'Website & Apps', icon: Globe },
                  { value: 'in_store', label: 'In-Store', desc: 'POS & Physical', icon: Store },
                ] as const).map((channel) => {
                  const Icon = channel.icon
                  const isSelected = salesChannels.includes(channel.value)
                  return (
                    <button
                      key={channel.value}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          // Only allow deselecting if there's more than one selected
                          if (salesChannels.length > 1) {
                          setSalesChannels(salesChannels.filter(c => c !== channel.value))
                            setShowSalesChannelWarning(false)
                          } else {
                            // Show warning when trying to deselect the only option
                            setShowSalesChannelWarning(true)
                            // Auto-hide warning after 3 seconds
                            setTimeout(() => setShowSalesChannelWarning(false), 3000)
                          }
                        } else {
                          setSalesChannels([...salesChannels, channel.value])
                          setShowSalesChannelWarning(false)
                        }
                        if (errors.salesChannels) setErrors(prev => ({ ...prev, salesChannels: undefined }))
                      }}
                      className={cn(
                        "relative flex items-center gap-3 p-4 rounded-xl transition-all text-left border-2",
                        isSelected
                          ? "bg-[#F4610B]/5 border-[#F4610B] text-gray-900"
                          : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-[#F4610B]/10" : "bg-gray-100"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          isSelected ? "text-[#F4610B]" : "text-gray-600"
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className={cn(
                          "font-medium text-sm",
                          isSelected ? "text-gray-900" : "text-gray-700"
                        )}>{channel.label}</div>
                        <div className="text-xs text-gray-500">
                          {channel.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-[#F4610B] flex items-center justify-center flex-shrink-0">
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Warning when trying to deselect the only option */}
            {showSalesChannelWarning && (
              <div className="flex items-center gap-2 text-xs text-[#F4610B] bg-[#F4610B]/10 px-3 py-2 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>At least one sales channel must be selected</span>
              </div>
            )}

            {errors.salesChannels && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errors.salesChannels}</span>
              </div>
            )}
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_available"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_available" className="cursor-pointer">
              Product is available
            </Label>
          </div>

          {/* Only show bottom buttons in dialog mode, not page mode */}
          {!asPage && (
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isUploadingImage}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploadingImage}>
              {isLoading || isUploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isUploadingImage ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                product ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </div>
          )}
        </form>
  )

  if (asPage) {
    return formContent
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update product information' : 'Create a new product for your store'}
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}



