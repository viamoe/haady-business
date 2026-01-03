'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
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
import { Loader2, Upload, X, Image as ImageIcon, Wand2, Tag, Barcode, Copy, Check, CheckCircle2, Package, DollarSign, Star, Plus, Minus, Store, Globe, CloudDownload, Sparkles, AlertCircle, Gift, Trash2, GripVertical, Search, ArrowRightLeft, Percent, BadgePercent, Calendar, ChevronDown, ChevronUp, ChevronRight, MapPin, Truck, Download, Building2, Eye, Maximize2, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useStoreConnection } from '@/lib/store-connection-context'
import { toast } from '@/lib/toast'
import { useLocale } from '@/i18n/context'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { UniversalLoading } from '@/components/universal-loading'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton'

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
  status?: 'draft' | 'active' | 'inactive' | 'archived' | 'scheduled'
  brand_id?: string | null
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
  category_ids?: string[]
  // Inventory
  track_inventory?: boolean
  quantity?: number | null
  low_stock_threshold?: number | null
  allow_backorder?: boolean
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
  onPreview?: (product: Product) => void
  onFormDirtyChange?: (isDirty: boolean) => void
}

export interface ProductFormRef {
  saveDraft: () => Promise<boolean>
  getFormData: () => any
}

export const ProductForm = React.forwardRef<ProductFormRef, ProductFormProps>(function ProductForm({ open, onOpenChange, product, onSuccess, asPage = false, onValidityChange, onProductNameChange, onImageChange, onDescriptionChange, onPreview, onFormDirtyChange }, ref) {
  const { selectedConnectionId, selectedConnection, storeId: nativeStoreId } = useStoreConnection()
  const { locale, isRTL } = useLocale()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [currencyIcon, setCurrencyIcon] = useState<string | null>(null)
  const [currencyIconError, setCurrencyIconError] = useState(false)
  
  // Helper to check if currency icon is a valid URL
  const isValidCurrencyUrl = currencyIcon && (currencyIcon.startsWith('http://') || currencyIcon.startsWith('https://'))
  
  // Check if URL is from sama.gov.sa (known to have redirect issues)
  const isProblematicUrl = isValidCurrencyUrl && currencyIcon.includes('sama.gov.sa')
  
  // Generate fallback SVG as data URI
  const getFallbackSVG = (symbol: string) => {
    // Escape the symbol for use in SVG
    const escapedSymbol = symbol
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
    
    // Create a simple, well-formed SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><text x="12" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" text-anchor="middle" fill="currentColor" dominant-baseline="middle">${escapedSymbol}</text></svg>`
    
    // Use base64 encoding for better browser compatibility
    if (typeof window !== 'undefined' && window.btoa) {
      try {
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
      } catch (e) {
        // Fallback to URL encoding if base64 fails
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
      }
    }
    // Server-side or if btoa is not available, use URL encoding
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }
  
  // Determine fallback symbol
  // If currencyIcon is not a URL, it's already a symbol (use it)
  // Otherwise, use "SAR" as default
  const getLocaleAwareFallback = () => {
    if (currencyIcon && !isValidCurrencyUrl) {
      // currencyIcon is already a symbol, use it
      return currencyIcon
    }
    // Always use "SAR" as fallback
    return 'SAR'
  }
  const fallbackSymbol = getLocaleAwareFallback()
  const fallbackDataUri = getFallbackSVG(fallbackSymbol)
  
  // Get proxied URL for external currency icons to bypass CORS
  // Skip proxy for problematic URLs (like sama.gov.sa with redirect loops)
  // Also use fallback if image failed to load
  const getCurrencyIconSrc = (url: string | null) => {
    if (!url || !isValidCurrencyUrl || isProblematicUrl || currencyIconError) return fallbackDataUri
    return `/api/currency-icon?url=${encodeURIComponent(url)}`
  }
  
  // Reset error when currency icon changes
  React.useEffect(() => {
    setCurrencyIconError(false)
  }, [currencyIcon])
  
  // Form state
  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')
  
  // Refs for auto-resizing textareas
  const nameEnRef = useRef<HTMLTextAreaElement>(null)
  const nameArRef = useRef<HTMLTextAreaElement>(null)
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  
  // Rich text editor stores HTML content
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed_amount'>('none')
  const [discountValue, setDiscountValue] = useState('')
  const [discountStartDate, setDiscountStartDate] = useState('')
  const [discountEndDate, setDiscountEndDate] = useState('')
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false)
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [barcodeType, setBarcodeType] = useState('EAN13')
  const [qrCode, setQrCode] = useState('')
  const [skuCopied, setSkuCopied] = useState(false)
  const [barcodeCopied, setBarcodeCopied] = useState(false)
  const [qrCodeCopied, setQrCodeCopied] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [featuredNewImageIndex, setFeaturedNewImageIndex] = useState<number>(0) // First image is featured by default
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string; is_primary: boolean }>>([])
  const [originalPrimaryImageUrl, setOriginalPrimaryImageUrl] = useState<string | null>(null) // Track original primary for dirty checking
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]) // Track explicitly deleted images
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set())
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; name_ar: string | null; parent_id: string | null; level: number; category_type: 'joyful_gifting' | 'tastes_treats' | 'digital_surprises' | 'moments_meaning' | 'donation_charity' | null; icon: string | null; image_url: string | null; hover_image_url: string | null; description: string | null }>>([])
  const [selectedCategoryType, setSelectedCategoryType] = useState<'joyful_gifting' | 'tastes_treats' | 'digital_surprises' | 'moments_meaning' | 'donation_charity' | null>(null)
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('')
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('')
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState<string>('')
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [openCategoryType, setOpenCategoryType] = useState<string | null>(null)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string; logo_url: string | null } | null>(null)
  const [categoryBrandCount, setCategoryBrandCount] = useState<number | null>(null)
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string; logo_url: string | null; description: string | null; is_featured: boolean }>>([])
  const [isLoadingBrands, setIsLoadingBrands] = useState(false)
  const [failedBrandLogos, setFailedBrandLogos] = useState<Set<string>>(new Set())
  
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
  // Track original inventory values for dirty checking
  const [originalInventory, setOriginalInventory] = useState<{
    trackInventory: boolean
    stockQuantity: string
    lowStockThreshold: string
    allowBackorders: boolean
  } | null>(null)
  // Track original category IDs for dirty checking (loaded separately from product)
  const [originalCategoryIds, setOriginalCategoryIds] = useState<string[]>([])
  // Track original brand ID for dirty checking
  const [originalBrandId, setOriginalBrandId] = useState<string | null>(null)
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

  // Expose methods via ref for parent component
  React.useImperativeHandle(ref, () => ({
    saveDraft: async () => {
      if (!storeId) {
        console.error('Cannot save draft: No store ID')
        return false
      }

      try {
        const draftData = {
          name_en: nameEn || null,
          name_ar: nameAr || null,
          description_en: descriptionEn || null,
          description_ar: descriptionAr || null,
          price: price ? parseFloat(price) : 0,
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
          brand_id: selectedBrandId || null,
          product_type: productType,
          selling_method: sellingMethod,
          selling_unit: sellingUnit || null,
          fulfillment_type: fulfillmentTypes,
          requires_scheduling: requiresScheduling,
          subscription_interval: subscriptionInterval || null,
          sales_channels: salesChannels,
          track_inventory: trackInventory,
          stock_quantity: trackInventory && stockQuantity ? parseInt(stockQuantity, 10) : null,
          low_stock_threshold: trackInventory && lowStockThreshold ? parseInt(lowStockThreshold, 10) : null,
          allow_backorder: trackInventory ? allowBackorders : false,
          status: 'draft',
        }

        // If editing an existing product, use PUT to update instead of creating a new one
        if (product?.id) {
          // Remove store_id from update data - it shouldn't be changed
          const { store_id, ...updateData } = draftData
          
          const response = await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updateData,
              edit_type: 'draft_save', // Track this as a draft save in history
            }),
          })

          if (!response.ok) {
            let errorData: any = {}
            let responseText = ''
            
            try {
              // Try to get response text first (this consumes the body)
              responseText = await response.text()
              
              // Try to parse as JSON
              if (responseText) {
                try {
                  errorData = JSON.parse(responseText)
                } catch (e) {
                  // Not JSON, use text as error message
                  errorData = { error: responseText || `HTTP ${response.status} ${response.statusText}` }
                }
              } else {
                errorData = { error: `HTTP ${response.status} ${response.statusText}` }
              }
            } catch (e) {
              // If we can't read the response at all
              errorData = { 
                error: `Failed to read response: ${e instanceof Error ? e.message : String(e)}`,
                status: response.status,
                statusText: response.statusText
              }
            }
            
            console.error('Failed to update draft:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              productId: product.id,
              responseText: responseText.substring(0, 200) // First 200 chars for debugging
            })
            return false
          }

          return true
        } else {
          // Create new product if no existing product
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draftData),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('Failed to save draft:', errorData)
            return false
          }

          return true
        }
      } catch (error) {
        console.error('Error saving draft:', error)
        return false
      }
    },
    getFormData: () => ({
      nameEn,
      nameAr,
      descriptionEn,
      descriptionAr,
      price,
      compareAtPrice,
      discountType,
      discountValue,
      discountStartDate,
      discountEndDate,
      sku,
      barcode,
      barcodeType,
      isAvailable,
      selectedCategoryIds,
      productType,
      sellingMethod,
      sellingUnit,
      fulfillmentTypes,
      requiresScheduling,
      subscriptionInterval,
      salesChannels,
      trackInventory,
      stockQuantity,
      lowStockThreshold,
      allowBackorders,
    }),
  }), [
    storeId, nameEn, nameAr, descriptionEn, descriptionAr, price, compareAtPrice,
    discountType, discountValue, discountStartDate, discountEndDate,
    sku, barcode, barcodeType, isAvailable, selectedCategoryIds,
    productType, sellingMethod, sellingUnit, fulfillmentTypes,
    requiresScheduling, subscriptionInterval, salesChannels,
    trackInventory, stockQuantity, lowStockThreshold, allowBackorders
  ])
  
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

  // Load product categories when editing - use Supabase client directly to avoid 403
  useEffect(() => {
    const loadProductCategories = async () => {
      if (open && product?.id) {
        try {
          const { data: productCategories, error } = await supabase
            .from('product_categories')
            .select('category_id')
            .eq('product_id', product.id)
          
          if (error) {
            console.error('Error loading product categories:', error)
            setSelectedCategoryIds([])
            setOriginalCategoryIds([])
            return
          }
          
          const categoryIds = (productCategories || []).map((pc: any) => pc.category_id)
          setSelectedCategoryIds(categoryIds)
          setOriginalCategoryIds(categoryIds) // Track original for dirty checking
        } catch (error) {
          console.error('Error loading product categories:', error)
          setSelectedCategoryIds([])
          setOriginalCategoryIds([])
        }
      } else if (!product?.id) {
        // Reset original categories when creating new product
        setOriginalCategoryIds([])
      }
    }

    loadProductCategories()
  }, [open, product?.id])

  // Fetch all categories for hierarchical selector (flat array, not hierarchical)
  useEffect(() => {
    const fetchAllCategories = async () => {
      setIsCategoriesLoading(true)
      try {
        // Fetch ALL categories as flat array (not hierarchical) - increase limit to get all
        const response = await fetch('/api/categories?include_inactive=false&hierarchical=false&limit=500')
        if (response.ok) {
          const data = await response.json()
          // Flatten if hierarchical structure is returned
          const flattenCategories = (cats: any[]): any[] => {
            const result: any[] = []
            cats.forEach(cat => {
              result.push({ ...cat, children: undefined })
              if (cat.children && Array.isArray(cat.children)) {
                result.push(...flattenCategories(cat.children))
              }
            })
            return result
          }
          const categories = data.categories || []
          const flatCategories = categories.some((cat: any) => cat.children) 
            ? flattenCategories(categories)
            : categories
          
          // Debug: Check a specific type to see parent relationships
          const tastesType = flatCategories.find((c: any) => c.category_type === 'tastes_treats' && c.level === 0)
          const tastesMains = flatCategories.filter((c: any) => c.level === 1 && c.parent_id === tastesType?.id)
          
          setAllCategories(flatCategories)
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
    // Prefer the deepest selected level
    if (selectedSubSubCategory) {
      ids.push(selectedSubSubCategory)
    } else if (selectedSubCategory) {
      ids.push(selectedSubCategory)
    } else if (selectedMainCategory) {
      ids.push(selectedMainCategory)
    }
    setSelectedCategoryIds(ids)
  }, [selectedMainCategory, selectedSubCategory, selectedSubSubCategory])

  // Fetch selected brand data
  useEffect(() => {
    const fetchBrand = async () => {
      if (!selectedBrandId) {
        setSelectedBrand(null)
        return
      }

      try {
        const response = await fetch(`/api/brands/${selectedBrandId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch brand: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        if (data.brand) {
          setSelectedBrand({
            id: data.brand.id,
            name: data.brand.name,
            logo_url: data.brand.logo_url
          })
        }
      } catch (error) {
        console.error('Error fetching brand:', error)
        setSelectedBrand(null)
      }
    }

    fetchBrand()
  }, [selectedBrandId])

  // Fetch available brands for selected category
  useEffect(() => {
    const fetchBrands = async () => {
      // Show brands when main category is selected (with or without sub category)
      if (!selectedMainCategory) {
        setAvailableBrands([])
        return
      }

      // Check if main category has sub-categories
      const mainCat = allCategories.find(c => c.id === selectedMainCategory)
      const hasSubCategories = mainCat ? allCategories.some(cat => 
        cat.parent_id === selectedMainCategory && cat.level >= 2
      ) : false

      // If main category has sub-categories, only show brands when sub-category is selected
      if (hasSubCategories && !selectedSubCategory) {
        setAvailableBrands([])
        setCategoryBrandCount(0)
        return
      }

      setIsLoadingBrands(true)
      try {
        // If sub category is selected, try to fetch brands for sub category first
        // Otherwise, fetch brands for main category
        const categoryId = selectedSubCategory || selectedMainCategory
        
        const params = new URLSearchParams({
          is_active: 'true',
          limit: '100',
          sort_by: 'sort_order',
          order: 'asc',
          category_id: categoryId
        })

        const response = await fetch(`/api/brands?${params.toString()}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch brands: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        const brands = (data.brands || []).map((brand: any) => ({
          id: brand.id,
          name: brand.name,
          logo_url: brand.logo_url,
          description: brand.description,
          is_featured: brand.is_featured
        }))
        
        // If sub category is selected but no brands found, fall back to main category brands
        if (selectedSubCategory && brands.length === 0 && data.total === 0) {
          const mainParams = new URLSearchParams({
            is_active: 'true',
            limit: '100',
            sort_by: 'sort_order',
            order: 'asc',
            category_id: selectedMainCategory
          })
          
          const mainResponse = await fetch(`/api/brands?${mainParams.toString()}`)
          if (!mainResponse.ok) {
            throw new Error(`Failed to fetch main category brands: ${mainResponse.status} ${mainResponse.statusText}`)
          }
          
          const mainData = await mainResponse.json()
          setAvailableBrands((mainData.brands || []).map((brand: any) => ({
            id: brand.id,
            name: brand.name,
            logo_url: brand.logo_url,
            description: brand.description,
            is_featured: brand.is_featured
          })))
          setCategoryBrandCount(mainData.total || 0)
        } else {
          setAvailableBrands(brands)
          setCategoryBrandCount(data.total || 0)
        }
      } catch (error) {
        console.error('Error fetching brands:', error)
        setAvailableBrands([])
        setCategoryBrandCount(0)
        // Don't show error to user, just silently fail and show empty state
      } finally {
        setIsLoadingBrands(false)
      }
    }

    fetchBrands()
  }, [selectedSubCategory, selectedMainCategory, allCategories])

  // Fetch brand count for selected category
  useEffect(() => {
    const fetchBrandCount = async () => {
      if (selectedCategoryIds.length === 0) {
        setCategoryBrandCount(null)
        return
      }

      try {
        const categoryId = selectedCategoryIds[0]
        const params = new URLSearchParams({
          is_active: 'true',
          limit: '1', // We only need the count
          category_id: categoryId
        })

        const response = await fetch(`/api/brands?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setCategoryBrandCount(data.total || 0)
        }
      } catch (error) {
        console.error('Error fetching brand count:', error)
        setCategoryBrandCount(null)
      }
    }

    fetchBrandCount()
  }, [selectedCategoryIds])

  // Sync hierarchical selectors when editing existing product
  useEffect(() => {
    if (selectedCategoryIds.length > 0 && allCategories.length > 0) {
      const categoryId = selectedCategoryIds[0]
      const category = allCategories.find(c => c.id === categoryId)
      if (category) {
        // Build the full path by walking up parents
        const getPath = (cat: typeof category): typeof category[] => {
          const path = [cat]
          let current = cat
          while (current.parent_id) {
            const parent = allCategories.find(c => c.id === current.parent_id)
            if (parent) {
              path.unshift(parent)
              current = parent
            } else break
          }
          return path
        }
        const path = getPath(category)
        
        // Find category type (level 0), main category (level 1), and subcategories
        const typeCategory = path.find(c => c.level === 0)
        const mainCategory = path.find(c => c.level === 1)
        const subCategory = path.find(c => c.level === 2)
        
        if (typeCategory) {
          setSelectedCategoryType((typeCategory.category_type as any) || null)
        }
        if (mainCategory) {
          setSelectedMainCategory(mainCategory.id)
        }
        if (subCategory) {
          setSelectedSubCategory(subCategory.id)
        }
      }
    }
  }, [allCategories, selectedCategoryIds]) // Run when categories OR selectedCategoryIds change

  // Load product images when editing
  useEffect(() => {
    const loadProductImages = async () => {
      if (open && product?.id) {
        setIsLoadingImages(true)
        try {
          const response = await fetch(`/api/products/${product.id}/images`)
          if (response.ok) {
            const data = await response.json()
            setExistingImages(data.images || [])
            setDeletedImageIds([]) // Reset deleted images when loading new product
            // Set primary image preview for backward compatibility
            const primaryImage = data.images?.find((img: any) => img.is_primary) || data.images?.[0]
            setOriginalPrimaryImageUrl(primaryImage?.url || null) // Track original for dirty checking
            if (primaryImage) {
              setImageUrl(primaryImage.url)
            }
          }
        } catch (error) {
          console.error('Error loading product images:', error)
          setExistingImages([])
          setDeletedImageIds([])
        } finally {
          setIsLoadingImages(false)
        }
      } else {
        setExistingImages([])
        setDeletedImageIds([])
        setIsLoadingImages(false)
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
        setQrCode(product.qr_code || '')
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
        // Brand
        const productBrandId = (product as any).brand_id || null
        setSelectedBrandId(productBrandId)
        setOriginalBrandId(productBrandId) // Track original for dirty checking
        // Categories will be loaded in separate useEffect
        // Inventory will be loaded in separate useEffect
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
        setOriginalPrimaryImageUrl(null) // Reset original for dirty checking
        setSelectedCategoryIds([])
        // Reset classification fields
        setProductType('physical')
        setSellingMethod('unit')
        setSellingUnit('')
        setFulfillmentTypes(['pickup'])
        setRequiresScheduling(false)
        setSubscriptionInterval('')
        setSalesChannels(['online', 'in_store'])
        // Reset brand
        setSelectedBrandId(null)
        setSelectedBrand(null)
        setOriginalBrandId(null) // Reset original for dirty checking
        setOriginalCategoryIds([]) // Reset original categories for dirty checking
        // Reset bundle items
        setBundleItems([])
        setProductSearchQuery('')
        // Reset errors
        setErrors({})
      }
    }
  }, [open, product])

  // Load inventory data when editing a product
  useEffect(() => {
    const loadInventory = async () => {
      if (open && product?.id) {
        // Use product's store_id if available, otherwise fall back to context storeId
        const productStoreId = product.store_id || storeId
        
        if (!productStoreId) {
          console.warn('No store ID available for loading inventory')
          // Default values when no store ID
          const defaultQty = '0'
          const defaultThreshold = '10'
          const allowBackorder = product.allow_backorder ?? false
          setTrackInventory(true)
          setStockQuantity(defaultQty)
          setLowStockThreshold(defaultThreshold)
          setAllowBackorders(allowBackorder)
          setOriginalInventory({
            trackInventory: true,
            stockQuantity: defaultQty,
            lowStockThreshold: defaultThreshold,
            allowBackorders: allowBackorder
          })
          return
        }

        try {
          // Get the main branch for this store (or use null for store-level inventory)
          const { data: mainBranch } = await supabase
            .from('store_branches')
            .select('id')
            .eq('store_id', productStoreId)
            .eq('is_main_branch', true)
            .maybeSingle()

          // Build inventory query
          let inventoryQuery = supabase
            .from('inventory')
            .select('quantity, low_stock_threshold')
            .eq('product_id', product.id)
            .eq('store_id', productStoreId)
          
          // Check for main branch inventory first, then store-level
          if (mainBranch) {
            inventoryQuery = inventoryQuery.eq('branch_id', mainBranch.id)
          } else {
            inventoryQuery = inventoryQuery.is('branch_id', null)
          }

          const { data: inventory, error } = await inventoryQuery.maybeSingle()
          
          if (inventory && !error) {
            const qty = inventory.quantity?.toString() || '0'
            const threshold = inventory.low_stock_threshold?.toString() || '10'
            const allowBackorder = product.allow_backorder ?? false
            setTrackInventory(true)
            setStockQuantity(qty)
            setLowStockThreshold(threshold)
            setAllowBackorders(allowBackorder)
            // Store original values for dirty checking
            setOriginalInventory({
              trackInventory: true,
              stockQuantity: qty,
              lowStockThreshold: threshold,
              allowBackorders: allowBackorder
            })
          } else {
            // No inventory record found, default to tracking enabled with 0 stock
            const defaultQty = '0'
            const defaultThreshold = '10'
            const allowBackorder = product.allow_backorder ?? false
            setTrackInventory(true)
            setStockQuantity(defaultQty)
            setLowStockThreshold(defaultThreshold)
            setAllowBackorders(allowBackorder)
            // Store original values for dirty checking
            setOriginalInventory({
              trackInventory: true,
              stockQuantity: defaultQty,
              lowStockThreshold: defaultThreshold,
              allowBackorders: allowBackorder
            })
          }
        } catch (error) {
          console.error('Error loading inventory:', error)
          // Default values on error
          const defaultQty = '0'
          const defaultThreshold = '10'
          const allowBackorder = product.allow_backorder ?? false
          setTrackInventory(true)
          setStockQuantity(defaultQty)
          setLowStockThreshold(defaultThreshold)
          setAllowBackorders(allowBackorder)
          setOriginalInventory({
            trackInventory: true,
            stockQuantity: defaultQty,
            lowStockThreshold: defaultThreshold,
            allowBackorders: allowBackorder
          })
        }
      } else if (open && !product) {
        // Create mode - reset to defaults
        setTrackInventory(true)
        setStockQuantity('')
        setLowStockThreshold('10')
        setAllowBackorders(false)
        setContinueSellingOutOfStock(false)
        setOriginalInventory(null)
      }
    }
    
    loadInventory()
  }, [open, product?.id, product?.store_id, storeId])

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

  // Generate SKU based on product name with uniqueness check
  const handleGenerateSKU = async () => {
    try {
      // Build query - scope to store if available, exclude current product
      let query = supabase
        .from('products')
        .select('sku, id')
        .not('sku', 'is', null)
        .neq('sku', '')
      
      // Scope to current store if available
      if (storeId) {
        query = query.eq('store_id', storeId)
      }
      
      const { data: existingProducts } = await query
      
      const existingSkus = (existingProducts || [])
        .filter(p => !product?.id || p.id !== product.id) // Exclude current product if editing
        .map(p => p.sku)
        .filter((sku): sku is string => !!sku)
      
      // Get store-specific SKU settings if available
      let skuPrefix = 'PROD'
      if (storeId) {
        const { data: settings } = await supabase
          .from('sku_settings')
          .select('sku_prefix')
          .eq('store_id', storeId)
          .maybeSingle()
        
        if (settings?.sku_prefix) {
          skuPrefix = settings.sku_prefix
        }
      }
      
      const newSku = generateSKU(nameEn || nameAr, { prefix: skuPrefix }, existingSkus)
      
      if (!newSku) {
        throw new Error('Failed to generate unique SKU after multiple attempts')
      }
      
      setSku(newSku)
    } catch (error) {
      console.error('Error generating SKU:', error)
      // Fallback to generation without uniqueness check
      const newSku = generateSKU(nameEn || nameAr, { prefix: 'PROD' })
      setSku(newSku)
    }
  }

  // Generate barcode with uniqueness check
  const handleGenerateBarcode = async () => {
    try {
      // Build query - scope to store if available, exclude current product
      let query = supabase
        .from('products')
        .select('barcode, id')
        .not('barcode', 'is', null)
        .neq('barcode', '')
      
      // Scope to current store if available
      if (storeId) {
        query = query.eq('store_id', storeId)
      }
      
      const { data: existingProducts } = await query
      
      const existingBarcodes = (existingProducts || [])
        .filter(p => !product?.id || p.id !== product.id) // Exclude current product if editing
        .map(p => p.barcode)
        .filter((barcode): barcode is string => !!barcode)
      
      // Get store-specific barcode settings if available
      let barcodeType = 'INTERNAL' as const
      if (storeId) {
        const { data: settings } = await supabase
          .from('sku_settings')
          .select('barcode_type')
          .eq('store_id', storeId)
          .maybeSingle()
        
        if (settings?.barcode_type) {
          barcodeType = settings.barcode_type as 'INTERNAL' | 'EAN13' | 'EAN8' | 'UPC-A' | 'CODE128'
        }
      }
      
      const result = generateBarcode({ type: barcodeType }, existingBarcodes)
      
      if (!result.barcode) {
        throw new Error('Failed to generate unique barcode after multiple attempts')
      }
      
      setBarcode(result.barcode)
      setBarcodeType(result.type)
    } catch (error) {
      console.error('Error generating barcode:', error)
      // Fallback to generation without uniqueness check
      const result = generateBarcode({ type: 'INTERNAL' })
      setBarcode(result.barcode)
      setBarcodeType(result.type)
    }
  }

  // Generate both with uniqueness checks
  const handleGenerateBoth = async () => {
    try {
      // Build query - scope to store if available, exclude current product
      let query = supabase
        .from('products')
        .select('sku, barcode, id')
      
      // Scope to current store if available
      if (storeId) {
        query = query.eq('store_id', storeId)
      }
      
      const { data: existingProducts } = await query
      
      const existingSkus = (existingProducts || [])
        .filter(p => !product?.id || p.id !== product.id) // Exclude current product if editing
        .map(p => p.sku)
        .filter((sku): sku is string => !!sku && sku !== '')
      
      const existingBarcodes = (existingProducts || [])
        .filter(p => !product?.id || p.id !== product.id) // Exclude current product if editing
        .map(p => p.barcode)
        .filter((barcode): barcode is string => !!barcode && barcode !== '')
      
      // Get store-specific settings if available
      let skuPrefix = 'PROD'
      let barcodeType = 'INTERNAL' as const
      if (storeId) {
        const { data: settings } = await supabase
          .from('sku_settings')
          .select('sku_prefix, barcode_type')
          .eq('store_id', storeId)
          .maybeSingle()
        
        if (settings?.sku_prefix) {
          skuPrefix = settings.sku_prefix
        }
        if (settings?.barcode_type) {
          barcodeType = settings.barcode_type as 'INTERNAL' | 'EAN13' | 'EAN8' | 'UPC-A' | 'CODE128'
        }
      }
      
      // Generate SKU with uniqueness check
      const newSku = generateSKU(nameEn || nameAr, { prefix: skuPrefix }, existingSkus)
      if (!newSku) {
        throw new Error('Failed to generate unique SKU')
      }
      setSku(newSku)
      
      // Generate QR code URL (will be finalized when product is saved with ID)
      // For now, generate a placeholder that will be updated after product creation
      if (product?.id) {
        // Product exists, generate QR code URL
        const { generateQRCodeURL } = await import('@/lib/utils/sku-barcode-generator')
        const qrUrl = generateQRCodeURL(product.id, storeId || undefined)
        setQrCode(qrUrl)
      } else {
        // Product doesn't exist yet, set placeholder (will be generated on save)
        setQrCode('')
      }
      
      // Generate barcode with uniqueness check
      const result = generateBarcode({ type: barcodeType }, existingBarcodes)
      if (!result.barcode) {
        throw new Error('Failed to generate unique barcode')
      }
      setBarcode(result.barcode)
      setBarcodeType(result.type)
    } catch (error) {
      console.error('Error generating identifiers:', error)
      // Fallback to generation without uniqueness check
      const newSku = generateSKU(nameEn || nameAr, { prefix: 'PROD' })
      setSku(newSku)
      const result = generateBarcode({ type: 'INTERNAL' })
      setBarcode(result.barcode)
      setBarcodeType(result.type)
    }
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
          qr_code: qrCode || null,
          qr_code_auto_generated: !!qrCode,
          is_available: isAvailable,
          category_ids: selectedCategoryIds,
          brand_id: selectedBrandId || null,
          product_type: productType,
          selling_method: sellingMethod,
          selling_unit: sellingUnit || null,
          fulfillment_type: fulfillmentTypes,
          requires_scheduling: requiresScheduling,
          subscription_interval: subscriptionInterval || null,
          sales_channels: salesChannels,
          // Inventory fields
          track_inventory: trackInventory,
          stock_quantity: trackInventory && stockQuantity ? parseInt(stockQuantity, 10) : null,
          low_stock_threshold: trackInventory && lowStockThreshold ? parseInt(lowStockThreshold, 10) : null,
          allow_backorder: trackInventory ? (allowBackorders || continueSellingOutOfStock) : false,
        }

        // Generate QR code URL if product exists but QR code is missing
        if (product.id && !qrCode) {
          try {
            const { generateQRCodeURL } = await import('@/lib/utils/sku-barcode-generator')
            const qrUrl = generateQRCodeURL(product.id, storeId || undefined)
            updateData.qr_code = qrUrl
            updateData.qr_code_auto_generated = true
            setQrCode(qrUrl)
          } catch (error) {
            console.error('Error generating QR code:', error)
          }
        } else if (qrCode) {
          updateData.qr_code = qrCode
          updateData.qr_code_auto_generated = true
        }

        // Upload new images if any (batch upload)
        if (imageFiles.length > 0) {
          setIsUploadingImage(true)
          try {
            const formData = new FormData()
            imageFiles.forEach(file => formData.append('files', file))
            
            // Pass featured image index if set (relative to new images only)
            // We need to check if there's already a primary existing image
            const hasExistingPrimary = existingImages.some(img => img.is_primary)
            if (!hasExistingPrimary && featuredNewImageIndex >= 0 && featuredNewImageIndex < imageFiles.length) {
              formData.append('featuredIndex', featuredNewImageIndex.toString())
            }

            const uploadResponse = await fetch(`/api/products/${product.id}/images`, {
              method: 'POST',
              body: formData,
            })

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json()
              throw new Error(errorData.error || 'Failed to upload images')
            }

            const data = await uploadResponse.json()
            if (data.errors && data.errors.length > 0) {
              console.warn('Some images failed to upload:', data.errors)
              toast.warning(`Uploaded ${data.images.length} of ${imageFiles.length} images. Some failed.`)
            }
            
            // Add uploaded images to existingImages state
            if (data.images && data.images.length > 0) {
              setExistingImages(prev => [...prev, ...data.images])
              // Clear the pending uploads since they're now in existingImages
              setImageFiles([])
              setImagePreviews([])
            }
          } finally {
            setIsUploadingImage(false)
          }
        }

        // Update primary image if changed (only if user explicitly set a different existing image as primary)
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

        // Get primary image for toast - check updated existingImages first, then fallback
        const toastPrimaryImage = existingImages.find(img => img.is_primary) || existingImages[0]
        // Also check if we have new preview images
        const newPrimaryPreview = imagePreviews.length > 0 && featuredNewImageIndex >= 0 
          ? imagePreviews[featuredNewImageIndex] 
          : imagePreviews[0]
        const productImageUrl = toastPrimaryImage?.url || newPrimaryPreview || imageUrl || product.image_url
        const productNameForToast = nameEn || nameAr || product.name_en || product.name_ar || 'Product'

        toast.success('updated successfully', {
          productImage: productImageUrl || null,
          productName: productNameForToast
        })
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
          // Inventory fields
          track_inventory: trackInventory,
          stock_quantity: trackInventory && stockQuantity ? parseInt(stockQuantity, 10) : null,
          low_stock_threshold: trackInventory && lowStockThreshold ? parseInt(lowStockThreshold, 10) : null,
          allow_backorder: trackInventory ? (allowBackorders || continueSellingOutOfStock) : false,
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
          
          console.error('Product creation failed:', { status: createResponse.status, errorData, errorMessage })
          
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
          
          // Generate QR code URL after product is created (we now have the product ID)
          if (!qrCode && newProduct.id) {
            const { generateQRCodeURL } = await import('@/lib/utils/sku-barcode-generator')
            const qrUrl = generateQRCodeURL(newProduct.id, storeId || undefined)
            
            // Update product with QR code
            await fetch(`/api/products/${newProduct.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                qr_code: qrUrl,
                qr_code_auto_generated: true,
              }),
            })
            
            setQrCode(qrUrl)
            newProduct.qr_code = qrUrl
          }
        } catch (parseError) {
          console.error('Error parsing success response:', parseError)
          throw new Error('Failed to parse product creation response')
        }

        // Upload images if provided (batch upload)
        if (imageFiles.length > 0 && newProduct?.id) {
          setIsUploadingImage(true)
          try {
            // Use batch upload endpoint
            const formData = new FormData()
            imageFiles.forEach(file => formData.append('files', file))
            
            // Pass featured image index if set
            if (featuredNewImageIndex >= 0 && featuredNewImageIndex < imageFiles.length) {
              formData.append('featuredIndex', featuredNewImageIndex.toString())
            }

            const uploadResponse = await fetch(`/api/products/${newProduct.id}/images`, {
              method: 'POST',
              body: formData,
            })

            if (uploadResponse.ok) {
              const data = await uploadResponse.json()
              if (data.errors && data.errors.length > 0) {
                console.warn('Some images failed to upload:', data.errors)
                // Show toast notification for partial success
                toast.warning(`Uploaded ${data.images.length} of ${imageFiles.length} images. Some failed.`)
              }
            } else {
              const errorData = await uploadResponse.json()
              console.error('Failed to upload images:', errorData)
              toast.error(errorData.error || 'Failed to upload images')
            }
          } finally {
            setIsUploadingImage(false)
          }
        }

        // Get primary image for toast
        let productImageUrl: string | null = null
        if (newProduct?.id) {
          // Fetch the uploaded images to get the primary one
          try {
            const imagesResponse = await fetch(`/api/products/${newProduct.id}/images`)
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json()
              const primaryImage = imagesData.images?.find((img: any) => img.is_primary) || imagesData.images?.[0]
              productImageUrl = primaryImage?.url || null
            }
          } catch (error) {
            console.error('Error fetching product images for toast:', error)
          }
        }
        // Fallback to first preview if no uploaded image yet
        if (!productImageUrl && imagePreviews.length > 0) {
          productImageUrl = imagePreviews[featuredNewImageIndex >= 0 ? featuredNewImageIndex : 0]
        }

        toast.success('added successfully', {
          productImage: productImageUrl,
          productName: nameEn || nameAr || 'Product'
        })
      }

      // Reload product data after successful update to reset dirty state
      if (product?.id && asPage) {
        try {
          const reloadResponse = await fetch(`/api/products/${product.id}`)
          if (reloadResponse.ok) {
            const reloadData = await reloadResponse.json()
            // Update the product prop by calling onSuccess which should reload it
            // The parent component should handle reloading the product
          }
        } catch (error) {
          console.error('Error reloading product after update:', error)
        }
      }
      
      if (!asPage) {
        onOpenChange(false)
      }
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

  // Track if initial load is complete (to avoid false dirty state on mount)
  const isInitialLoadRef = useRef(true)
  useEffect(() => {
    // Reset to true when product changes
    isInitialLoadRef.current = true
    
    // After async data loads (categories, inventory, images), mark initial load as complete
    // Use longer timeout to ensure all async operations complete
    const timer = setTimeout(() => {
      isInitialLoadRef.current = false
    }, 1500)
    return () => clearTimeout(timer)
  }, [product?.id]) // Reset when product changes

  // Auto-resize name textareas on initial load and when values change
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready (especially for sheets/modals)
    const resizeNameEn = () => {
      if (nameEnRef.current) {
        nameEnRef.current.style.height = 'auto'
        nameEnRef.current.style.height = nameEnRef.current.scrollHeight + 'px'
      }
    }
    requestAnimationFrame(resizeNameEn)
    // Also run after a short delay for sheet animations
    const timer = setTimeout(resizeNameEn, 100)
    return () => clearTimeout(timer)
  }, [nameEn, open])

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready (especially for sheets/modals)
    const resizeNameAr = () => {
      if (nameArRef.current) {
        nameArRef.current.style.height = 'auto'
        nameArRef.current.style.height = nameArRef.current.scrollHeight + 'px'
      }
    }
    requestAnimationFrame(resizeNameAr)
    // Also run after a short delay for sheet animations
    const timer = setTimeout(resizeNameAr, 100)
    return () => clearTimeout(timer)
  }, [nameAr, open])

  // Track form dirty state
  useEffect(() => {
    if (!onFormDirtyChange) return
    
    // Skip dirty check during initial load
    if (isInitialLoadRef.current) {
      onFormDirtyChange(false)
      return
    }
    
    // Skip dirty check if we're still loading async data (categories, inventory, images)
    // originalCategoryIds should be set (even if empty array) once loaded
    // originalInventory should be set once loaded for existing products
    if (product && originalCategoryIds.length === 0 && selectedCategoryIds.length > 0) {
      // Categories are selected but original not yet loaded - skip
      onFormDirtyChange(false)
      return
    }

    let isDirty = false

    if (product) {
      // Get original inventory values for comparison
      // Use originalInventory if available (from loaded inventory), otherwise fall back to product fields
      const originalStockQuantity = originalInventory?.stockQuantity || product.quantity?.toString() || '0'
      const originalLowStockThreshold = originalInventory?.lowStockThreshold || product.low_stock_threshold?.toString() || '10'
      const originalTrackInventory = originalInventory?.trackInventory ?? product.track_inventory ?? true
      const originalAllowBackorder = originalInventory?.allowBackorders ?? product.allow_backorder ?? false
      
      // Edit mode: Compare current form values with original product values
      isDirty = 
        nameEn !== (product.name_en || '') ||
        nameAr !== (product.name_ar || '') ||
        descriptionEn !== (product.description_en || '') ||
        descriptionAr !== (product.description_ar || '') ||
        price !== (product.price?.toString() || '') ||
        compareAtPrice !== (product.compare_at_price?.toString() || '') ||
        sku !== (product.sku || '') ||
        barcode !== (product.barcode || '') ||
        isAvailable !== product.is_available ||
        productType !== (product.product_type || 'physical') ||
        sellingMethod !== (product.selling_method || 'unit') ||
        sellingUnit !== (product.selling_unit || '') ||
        JSON.stringify([...selectedCategoryIds].sort()) !== JSON.stringify([...originalCategoryIds].sort()) ||
        selectedBrandId !== originalBrandId ||
        JSON.stringify(salesChannels.sort()) !== JSON.stringify((product.sales_channels || []).sort()) ||
        JSON.stringify(fulfillmentTypes.sort()) !== JSON.stringify((product.fulfillment_type || []).sort()) ||
        discountType !== (product.discount_type || 'none') ||
        discountValue !== (product.discount_value?.toString() || '') ||
        discountStartDate !== (product.discount_start_date || '') ||
        discountEndDate !== (product.discount_end_date || '') ||
        requiresScheduling !== (product.requires_scheduling || false) ||
        subscriptionInterval !== (product.subscription_interval || '') ||
        trackInventory !== originalTrackInventory ||
        stockQuantity !== originalStockQuantity ||
        lowStockThreshold !== originalLowStockThreshold ||
        allowBackorders !== originalAllowBackorder ||
        imageFiles.length > 0 ||
        deletedImageIds.length > 0 ||
        // Check if primary image changed (compare current primary vs original primary)
        (() => {
          const currentPrimary = existingImages.find(img => img.is_primary)?.url || null
          return currentPrimary !== originalPrimaryImageUrl
        })()
    } else {
      // New product mode: Form is dirty if any meaningful field has a value
      isDirty = 
        nameEn.trim() !== '' ||
        nameAr.trim() !== '' ||
        descriptionEn.trim() !== '' ||
        descriptionAr.trim() !== '' ||
        price !== '' ||
        compareAtPrice !== '' ||
        sku !== '' ||
        barcode !== '' ||
        selectedCategoryIds.length > 0 ||
        imageFiles.length > 0 ||
        (trackInventory && stockQuantity !== '' && stockQuantity !== '0') ||
        (trackInventory && lowStockThreshold !== '10') ||
        (trackInventory && allowBackorders)
    }

    onFormDirtyChange(isDirty)
  }, [
    nameEn, nameAr, descriptionEn, descriptionAr, price, compareAtPrice,
    sku, barcode, isAvailable, productType, sellingMethod, sellingUnit,
    selectedCategoryIds, originalCategoryIds,
    selectedBrandId, originalBrandId,
    salesChannels, fulfillmentTypes,
    discountType, discountValue, discountStartDate, discountEndDate,
    requiresScheduling, subscriptionInterval,
    trackInventory, stockQuantity, lowStockThreshold, allowBackorders,
    originalInventory,
    imageFiles, deletedImageIds, existingImages, originalPrimaryImageUrl,
    product, onFormDirtyChange
  ])

  const formContent = (
    <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name - English (Notion-style inline input) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">English</span>
                {!nameEn.trim() && (
                  <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium tabular-nums",
                nameEn.length > 200 ? "text-red-500" : "text-[#F4610B]"
              )}>
                {nameEn.length}/200
              </span>
            </div>
            <textarea
              ref={nameEnRef}
              id="name_en"
              value={nameEn}
              onChange={(e) => {
                setNameEn(e.target.value)
                if (errors.nameEn) setErrors(prev => ({ ...prev, nameEn: undefined }))
              }}
              placeholder="Product name..."
              dir="ltr"
              rows={1}
              className={cn(
                "w-full text-2xl font-semibold text-gray-900 placeholder:text-gray-300 placeholder:font-semibold",
                "bg-transparent border-none outline-none resize-none overflow-hidden",
                "px-0 py-1.5",
                "!ring-0 !border-0 focus:!ring-0 focus:!border-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!border-0",
                "hover:bg-gray-50 focus:bg-gray-50 rounded-lg transition-colors -mx-2 px-2",
                errors.nameEn && "text-red-600 placeholder:text-red-300"
              )}
              style={{ boxShadow: 'none' }}
            />
            {errors.nameEn && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.nameEn}
              </p>
            )}
          </div>

          {/* Product Name - Arabic (Notion-style inline input) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>العربية</span>
                {!nameAr.trim() && (
                  <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium tabular-nums",
                nameAr.length > 200 ? "text-red-500" : "text-[#F4610B]"
              )}>
                {nameAr.length}/200
              </span>
            </div>
            <textarea
              ref={nameArRef}
              id="name_ar"
              value={nameAr}
              onChange={(e) => {
                setNameAr(e.target.value)
                if (errors.nameAr) setErrors(prev => ({ ...prev, nameAr: undefined }))
              }}
              placeholder="اسم المنتج..."
              dir="rtl"
              rows={1}
              className={cn(
                "w-full text-2xl font-semibold text-gray-900 placeholder:text-gray-300 placeholder:font-semibold",
                "bg-transparent border-none outline-none resize-none overflow-hidden",
                "px-0 py-1.5",
                "!ring-0 !border-0 focus:!ring-0 focus:!border-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!border-0",
                "hover:bg-gray-50 focus:bg-gray-50 rounded-lg transition-colors -mx-2 px-2",
                errors.nameAr && "text-red-600 placeholder:text-red-300"
              )}
              style={{ boxShadow: 'none' }}
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
            <RichTextEditor
              value={descriptionEn}
              onChange={setDescriptionEn}
              placeholder="Enter product description in English"
              dir="ltr"
              minHeight="120px"
            />
          </div>

          {/* Description - Arabic */}
          <div className="space-y-2">
            <Label htmlFor="description_ar">Description (Arabic)</Label>
            <RichTextEditor
              value={descriptionAr}
              onChange={setDescriptionAr}
              placeholder="أدخل وصف المنتج بالعربية"
              dir="rtl"
              minHeight="120px"
            />
          </div>

          {/* Product Images Section */}
          <div className="rounded-2xl bg-gray-100/50 overflow-hidden">
            {isLoadingImages ? (
              /* Loading State */
              <div className="py-16 px-8 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-[#F4610B] animate-spin mb-3" />
                <p className="text-sm text-gray-500">Loading images...</p>
              </div>
            ) : existingImages.length === 0 && imagePreviews.length === 0 ? (
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
          <div className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200 mb-8">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Tag className="h-4 w-4 text-gray-600" />
              </div>
              Product Category <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">required</span>
            </h4>
            
            {isCategoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Step 1: Category Type Selection - Grid Layout (only show when not selected) */}
                {!selectedCategoryType && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                      <Label className="text-base font-semibold text-gray-900">
                        Product Category
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {allCategories
                        .filter(cat => cat.level === 0 && cat.category_type !== null)
                        .map(typeCategory => {
                          const mainCats = allCategories.filter(cat => 
                            cat.level === 1 && cat.parent_id === typeCategory.id
                          )
                          
                          return (
                            <button
                              key={typeCategory.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategoryType(typeCategory.category_type as any)
                                setSelectedMainCategory('')
                      setSelectedSubCategory('')
                      setSelectedSubSubCategory('')
                      setSelectedBrandId(null)
                      setSelectedBrand(null)
                                setOpenCategoryType(null)
                              }}
                              className={cn(
                                "relative p-4 rounded-3xl transition-all duration-200 text-left group",
                                "shadow-[0_0_50px_rgba(15,23,42,0.08)]",
                                "bg-white border-0 hover:-translate-y-1"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {typeCategory.image_url ? (
                                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white p-2 relative">
                                    <ImageWithSkeleton
                                      src={typeCategory.image_url || ''}
                                      alt={typeCategory.name}
                                      hoverImageSrc={typeCategory.hover_image_url || undefined}
                                      className="w-full h-full object-contain"
                                      skeletonClassName="w-full h-full"
                                      containerClassName="w-full h-full"
                                      objectFit="contain"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  </div>
                                ) : typeCategory.icon ? (
                                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-2xl">{typeCategory.icon}</span>
                                  </div>
                                ) : null}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-gray-900 mb-1">
                                    {typeCategory.name}
                                  </div>
                                  {mainCats.length > 0 && (
                                    <div className="text-xs text-gray-500">
                                      {mainCats.length} {mainCats.length === 1 ? 'category' : 'categories'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Selected Category Type Display - Show when category type is selected */}
                {selectedCategoryType && (() => {
                  const typeCategory = allCategories.find(c => c.category_type === selectedCategoryType)
                  if (!typeCategory) return null
                  
                  const mainCats = allCategories.filter(cat => 
                    cat.level === 1 && cat.parent_id === typeCategory.id
                  )
                  
                  return (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                       <div className="space-y-1">
                         <Label className="text-base font-semibold text-gray-900">
                           Product Category
                         </Label>
                         <p className="text-sm text-gray-500">
                           Categorize your product for better organization and discoverability
                        </p>
                      </div>
                      <div className="rounded-3xl shadow-[0_0_50px_rgba(15,23,42,0.08)] bg-white border-0 transition-all duration-200 overflow-hidden">
                        <div className="flex items-center justify-between p-4 transition-transform duration-200">
                          <div className="flex items-center gap-3">
                            {typeCategory.image_url ? (
                              <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-white p-2 relative">
                                <div className="w-full h-full rounded-lg overflow-hidden relative">
                                  <img
                                    src={typeCategory.image_url || ''}
                                    alt={typeCategory.name}
                                    className={cn(
                                      "w-full h-full object-contain transition-opacity duration-300",
                                      typeCategory.hover_image_url ? "group-hover:opacity-0" : ""
                                    )}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                  {typeCategory.hover_image_url && (
                                    <img
                                      src={typeCategory.hover_image_url}
                                      alt={typeCategory.name}
                                      className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F4610B] flex items-center justify-center border-2 border-white z-10">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            ) : typeCategory.icon ? (
                              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 relative">
                                <span className="text-2xl">{typeCategory.icon}</span>
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F4610B] flex items-center justify-center border-2 border-white z-10">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            ) : null}
                            <div>
                              <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                {typeCategory.name}
                                {mainCats.length > 0 && (
                                  <Badge className="bg-[#F4610B]/10 text-[#F4610B] border border-[#F4610B] text-xs font-medium px-2 py-0.5">
                                    {mainCats.length} {mainCats.length === 1 ? 'category' : 'categories'} available
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryType(null)
                              setSelectedMainCategory('')
                              setSelectedSubCategory('')
                        setSelectedSubSubCategory('')
                              setSelectedBrandId(null)
                              setSelectedBrand(null)
                              setOpenCategoryType(null)
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-[#F4610B] bg-transparent rounded-full hover:bg-[#F4610B] hover:text-white transition-colors flex items-center gap-1"
                          >
                            Change Type
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        
                        {/* Main Categories inside the parent card - Show when no main category is selected */}
                        {mainCats.length > 0 && !selectedMainCategory && (
                          <div className="px-4 pb-4 pt-0">
                            <div className="grid grid-cols-2 gap-3">
                              {mainCats.map((mainCat, index) => (
                                <button
                                  key={mainCat.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMainCategory(mainCat.id)
                                    setSelectedSubCategory('')
                                    setSelectedSubSubCategory('')
                                    setSelectedBrandId(null)
                                    setSelectedBrand(null)
                                  }}
                                  className={cn(
                                    "relative p-4 rounded-3xl transition-all duration-200 text-left group",
                                    "shadow-[0_0_50px_rgba(15,23,42,0.08)]",
                                    "bg-white border-0 hover:-translate-y-1"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    {mainCat.image_url ? (
                                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                        <ImageWithSkeleton
                                          src={mainCat.image_url || ''}
                                          alt={mainCat.name}
                                          hoverImageSrc={mainCat.hover_image_url || undefined}
                                          className="w-full h-full object-cover"
                                          skeletonClassName="w-full h-full"
                                          containerClassName="w-full h-full"
                                          objectFit="cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      </div>
                                    ) : mainCat.icon ? (
                                      <span className="text-2xl flex-shrink-0">{mainCat.icon}</span>
                                    ) : null}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate text-gray-900">
                                        {mainCat.name}
                                      </div>
                                      {mainCat.description && (
                                        <div className="text-xs text-gray-500 truncate mt-0.5">
                                          {mainCat.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                  </div>
                )}

                        {/* Selected Main Category inside the parent card - Show when main category is selected */}
                        {selectedMainCategory && (() => {
                          const mainCat = allCategories.find(c => c.id === selectedMainCategory)
                          if (!mainCat) return null
                          
                          const subCats = allCategories.filter(cat => 
                            cat.parent_id === selectedMainCategory && cat.level >= 2
                          )
                          
                          return (
                            <div className="px-4 pb-4 pt-0">
                              <div className="rounded-3xl shadow-[0_0_50px_rgba(15,23,42,0.08)] bg-white border-0 transition-all duration-200 overflow-hidden">
                                <div className="flex items-center justify-between p-4 transition-transform duration-200">
                                  <div className="flex items-center gap-3">
                                    {mainCat.image_url ? (
                                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                        <ImageWithSkeleton
                                          src={mainCat.image_url || ''}
                                          alt={mainCat.name}
                                          hoverImageSrc={mainCat.hover_image_url || undefined}
                                          className="w-full h-full object-cover"
                                          skeletonClassName="w-full h-full"
                                          containerClassName="w-full h-full"
                                          objectFit="cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      </div>
                                    ) : mainCat.icon ? (
                                      <span className="text-2xl flex-shrink-0">{mainCat.icon}</span>
                                    ) : null}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm text-gray-900">
                                        {mainCat.name}
                                      </div>
                                      {mainCat.description && (
                                        <div className="text-xs text-gray-500 truncate mt-0.5">
                                          {mainCat.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMainCategory('')
                                      setSelectedSubCategory('')
                                      setSelectedSubSubCategory('')
                                      setSelectedBrandId(null)
                                      setSelectedBrand(null)
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-[#F4610B] bg-transparent rounded-full hover:bg-[#F4610B] hover:text-white transition-colors flex items-center gap-1"
                                  >
                                    Change Category
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                
                                {/* Sub Categories inside the main category card - Show when no sub category is selected */}
                                {subCats.length > 0 && !selectedSubCategory && (
                                  <div className="px-4 pb-4 pt-0">
                                    <div className="grid grid-cols-2 gap-3">
                                      {subCats.map(subCat => (
                                        <button
                                          key={subCat.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedSubCategory(subCat.id)
                                            setSelectedSubSubCategory('')
                                          }}
                                          className={cn(
                                            "relative p-4 rounded-3xl transition-all duration-200 text-left group",
                                            "shadow-[0_0_50px_rgba(15,23,42,0.08)]",
                                            "bg-white border-0 hover:-translate-y-1"
                                          )}
                                        >
                                          <div className="flex items-center gap-3">
                                            {subCat.image_url ? (
                                              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                <ImageWithSkeleton
                                                  src={subCat.image_url || ''}
                                                  alt={subCat.name}
                                                  hoverImageSrc={subCat.hover_image_url || undefined}
                                                  className="w-full h-full object-cover"
                                                  skeletonClassName="w-full h-full"
                                                  containerClassName="w-full h-full"
                                                  objectFit="cover"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                  }}
                                                />
                                              </div>
                                            ) : subCat.icon ? (
                                              <span className="text-2xl flex-shrink-0">{subCat.icon}</span>
                                            ) : null}
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium text-sm truncate text-gray-900">
                                                {subCat.name}
                                              </div>
                                              {subCat.description && (
                                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                                  {subCat.description}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Brand Selection inside main category card - Show when no sub category is selected and main category has no sub-categories */}
                                {!selectedSubCategory && (() => {
                                  // Check if main category has sub-categories
                                  const hasSubCategories = subCats.length > 0
                                  
                                  // If main category has sub-categories, don't show brands
                                  if (hasSubCategories) {
                                    return null
                                  }
                                  
                                  if (selectedBrandId && selectedBrand) {
                                    return (
                                      <div className="px-4 pb-4 pt-0">
                                        <div className="flex items-center justify-between p-4 rounded-3xl shadow-[0_0_50px_rgba(15,23,42,0.08)] bg-white border-0 hover:-translate-y-1 transition-all duration-200">
                                          <div className="flex items-center gap-3">
                                            {selectedBrand.logo_url && !failedBrandLogos.has(selectedBrand.id) ? (
                                              <img
                                                src={selectedBrand.logo_url}
                                                alt={selectedBrand.name}
                                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                                onError={() => {
                                                  setFailedBrandLogos(prev => new Set(prev).add(selectedBrand.id))
                                                }}
                                              />
                                            ) : (
                                              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-2xl">{selectedBrand.name.charAt(0).toUpperCase()}</span>
                                              </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium text-sm text-gray-900">
                                                {selectedBrand.name}
                                              </div>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedBrandId(null)
                                              setSelectedBrand(null)
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-[#F4610B] bg-transparent rounded-full hover:bg-[#F4610B] hover:text-white transition-colors flex items-center gap-1"
                                          >
                                            Change Brand
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  }

                                  if (isLoadingBrands) {
                                    return (
                                      <div className="px-4 pb-4 pt-0">
                                        <div className="flex items-center justify-center py-4">
                                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        </div>
                                      </div>
                                    )
                                  }

                                  if (availableBrands.length === 0) {
                                    return null
                                  }

                                  return (
                                    <div className="px-4 pb-4 pt-0">
                                      <Label className="text-xs font-medium text-gray-700 mb-2 block">
                                        Select Brand (Optional)
                                      </Label>
                                      <div className="grid grid-cols-2 gap-3">
                                        {availableBrands.map((brand) => (
                                          <button
                                            key={brand.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedBrandId(brand.id)
                                              setSelectedBrand({
                                                id: brand.id,
                                                name: brand.name,
                                                logo_url: brand.logo_url
                                              })
                                            }}
                                            className={cn(
                                              "relative p-4 rounded-3xl transition-all duration-200 text-left group",
                                              "shadow-[0_0_50px_rgba(15,23,42,0.08)]",
                                              "bg-white border-0 hover:-translate-y-1"
                                            )}
                                          >
                                            <div className="flex items-center gap-3">
                                              {brand.logo_url && !failedBrandLogos.has(brand.id) ? (
                                                <img
                                                  src={brand.logo_url}
                                                  alt={brand.name}
                                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                                  onError={() => {
                                                    setFailedBrandLogos(prev => new Set(prev).add(brand.id))
                                                  }}
                                                />
                                              ) : (
                                                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                  <span className="text-2xl">{brand.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                              )}
                                              <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate text-gray-900">
                                                  {brand.name}
                                                </div>
                                                {brand.description && (
                                                  <div className="text-xs text-gray-500 truncate mt-0.5">
                                                    {brand.description}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })()}

                                {/* Selected Sub Category inside the main category card - Show when sub category is selected */}
                                {selectedSubCategory && (() => {
                                  const subCat = allCategories.find(c => c.id === selectedSubCategory)
                                  if (!subCat) return null
                                  
                                  return (
                                    <div className="px-4 pb-4 pt-0">
                                      <div className="rounded-3xl shadow-[0_0_50px_rgba(15,23,42,0.08)] bg-white border-0 transition-all duration-200 overflow-hidden">
                                        <div className="flex items-center justify-between p-4 transition-transform duration-200">
                                          <div className="flex items-center gap-3">
                                            {subCat.image_url ? (
                                              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                <ImageWithSkeleton
                                                  src={subCat.image_url || ''}
                                                  alt={subCat.name}
                                                  hoverImageSrc={subCat.hover_image_url || undefined}
                                                  className="w-full h-full object-cover"
                                                  skeletonClassName="w-full h-full"
                                                  containerClassName="w-full h-full"
                                                  objectFit="cover"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                  }}
                                                />
                                              </div>
                                            ) : subCat.icon ? (
                                              <span className="text-2xl flex-shrink-0">{subCat.icon}</span>
                                            ) : null}
                                            <div className="flex-1 min-w-0">
                                              <div className="font-medium text-sm text-gray-900">
                                                {subCat.name}
                                              </div>
                                              {subCat.description && (
                                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                                  {subCat.description}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedSubCategory('')
                                              setSelectedSubSubCategory('')
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-[#F4610B] bg-transparent rounded-full hover:bg-[#F4610B] hover:text-white transition-colors flex items-center gap-1"
                                          >
                                            Change Sub-Category
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                        
                                        {/* Brand Selection inside the sub category card */}
                                        {(() => {
                                          if (selectedBrandId && selectedBrand) {
                                            return (
                                              <div className="px-4 pb-4 pt-0">
                                                <div className="flex items-center justify-between p-4 rounded-3xl shadow-[0_0_50px_rgba(15,23,42,0.08)] bg-white border-0 hover:-translate-y-1 transition-all duration-200">
                                                  <div className="flex items-center gap-3">
                                                    {selectedBrand.logo_url && !failedBrandLogos.has(selectedBrand.id) ? (
                                                      <img
                                                        src={selectedBrand.logo_url}
                                                        alt={selectedBrand.name}
                                                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                                        onError={() => {
                                                          setFailedBrandLogos(prev => new Set(prev).add(selectedBrand.id))
                                                        }}
                                                      />
                                                    ) : (
                                                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-2xl">{selectedBrand.name.charAt(0).toUpperCase()}</span>
                                                      </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                      <div className="font-medium text-sm text-gray-900">
                                                        {selectedBrand.name}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedBrandId(null)
                                                      setSelectedBrand(null)
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-[#F4610B] bg-transparent rounded-full hover:bg-[#F4610B] hover:text-white transition-colors flex items-center gap-1"
                                                  >
                                                    Change Brand
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              </div>
                                            )
                                          }

                                          if (isLoadingBrands) {
                                            return (
                                              <div className="px-4 pb-4 pt-0">
                                                <div className="flex items-center justify-center py-4">
                                                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                </div>
                                              </div>
                                            )
                                          }

                                          if (availableBrands.length === 0) {
                                            return null
                                          }

                                          return (
                                            <div className="px-4 pb-4 pt-0">
                                              <Label className="text-xs font-medium text-gray-700 mb-2 block">
                                                Select Brand (Optional)
                                              </Label>
                                              <div className="grid grid-cols-2 gap-3">
                                                {availableBrands.map((brand) => (
                                                  <button
                                                    key={brand.id}
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedBrandId(brand.id)
                                                      setSelectedBrand({
                                                        id: brand.id,
                                                        name: brand.name,
                                                        logo_url: brand.logo_url
                                                      })
                                                    }}
                                                    className={cn(
                                                      "relative p-4 rounded-3xl transition-all duration-200 text-left group",
                                                      "shadow-[0_0_50px_rgba(15,23,42,0.08)]",
                                                      "bg-white border-0 hover:-translate-y-1"
                                                    )}
                                                  >
                                                    <div className="flex items-center gap-3">
                                                      {brand.logo_url ? (
                                                        <img
                                                          src={brand.logo_url}
                                                          alt={brand.name}
                                                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                                          onError={(e) => {
                                                            e.currentTarget.style.display = 'none'
                                                          }}
                                                        />
                                                      ) : (
                                                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                          <span className="text-2xl">{brand.name.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                      )}
                                                      <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm truncate text-gray-900">
                                                          {brand.name}
                                                        </div>
                                                        {brand.description && (
                                                          <div className="text-xs text-gray-500 truncate mt-0.5">
                                                            {brand.description}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )
                                        })()}
                                      </div>
                                    </div>
                                  )
                                })()}
                                
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })()}




                {/* Selected Category Path Display - Breadcrumb */}
                {(selectedMainCategory || selectedBrand) && (
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {(() => {
                      const type = allCategories.find(c => c.category_type === selectedCategoryType)
                      const main = allCategories.find(c => c.id === selectedMainCategory)
                      const sub = allCategories.find(c => c.id === selectedSubCategory)
                      const subSub = allCategories.find(c => c.id === selectedSubSubCategory)
                      const breadcrumbs = []
                      
                      if (type) {
                        breadcrumbs.push({ type: 'category', data: type })
                      }
                      if (main) {
                        breadcrumbs.push({ type: 'category', data: main })
                      }
                      if (sub) {
                        breadcrumbs.push({ type: 'category', data: sub })
                      }
                      if (subSub) {
                        breadcrumbs.push({ type: 'category', data: subSub })
                      }
                      if (selectedBrand) {
                        breadcrumbs.push({ type: 'brand', data: selectedBrand })
                      }
                      
                      return breadcrumbs.map((item, index) => (
                        <div key={item.data.id} className="flex items-center gap-2">
                          {index > 0 && (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F4610B]/10 text-xs text-[#F4610B]">
                            {item.type === 'category' ? (
                              <>
                                {'image_url' in item.data && item.data.image_url ? (
                                  <img
                                    src={item.data.image_url}
                                    alt={item.data.name}
                                    className="w-5 h-5 rounded object-cover flex-shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : 'icon' in item.data && item.data.icon ? (
                                  <span className="text-sm flex-shrink-0">{item.data.icon}</span>
                                ) : null}
                                <span className="font-medium">{item.data.name}</span>
                              </>
                            ) : (
                              <>
                                {'logo_url' in item.data && item.data.logo_url ? (
                                  <img
                                    src={item.data.logo_url}
                                    alt={item.data.name}
                                    className="w-5 h-5 rounded object-cover flex-shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <span className="text-sm flex-shrink-0">🏷️</span>
                                )}
                                <span className="font-medium">{item.data.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    })()}
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
            {/* Sales Channels - First because other options depend on it */}
            <div className="space-y-3">
              <Label className={cn("text-sm", errors.salesChannels ? "text-red-600" : "text-gray-600")}>
                Sales Channels <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full ml-1">required</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'online', label: 'Online', desc: 'Website & Apps', icon: Globe },
                  { value: 'in_store', label: 'In-Store', desc: 'POS & Physical', icon: Store },
                ] as const)
                  // Hide In-Store when Digital product type is selected
                  .filter(channel => !(channel.value === 'in_store' && productType === 'digital'))
                  .map((channel) => {
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
                            // If removing online and product is digital, switch to physical
                            if (channel.value === 'online' && productType === 'digital') {
                              setProductType('physical')
                              setSellingMethod('unit')
                              setFulfillmentTypes(['pickup'])
                            }
                            // If removing in_store, also remove pickup from fulfillment types
                            if (channel.value === 'in_store' && fulfillmentTypes.includes('pickup')) {
                              const newFulfillment = fulfillmentTypes.filter(f => f !== 'pickup')
                              // Ensure at least one fulfillment type remains for physical/bundle products
                              if (newFulfillment.length === 0 && (productType === 'physical' || productType === 'bundle')) {
                                setFulfillmentTypes(['delivery'])
                              } else {
                                setFulfillmentTypes(newFulfillment)
                              }
                            }
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
              {productType === 'digital' && (
                <p className="text-xs text-gray-400">Digital products can only be sold online</p>
              )}
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
                  { value: 'pickup', label: 'Pickup', icon: MapPin, disabled: productType === 'digital' || productType === 'service' },
                  { value: 'delivery', label: 'Delivery', icon: Truck, disabled: productType === 'digital' || productType === 'service' },
                  { value: 'digital', label: 'Digital', icon: Download, disabled: productType !== 'digital' },
                  { value: 'onsite', label: 'On-Site', icon: Building2, disabled: productType !== 'service' },
                ] as const).filter(type => !type.disabled).map((type) => {
                  const isChecked = fulfillmentTypes.includes(type.value)
                  const Icon = type.icon
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
                      <Icon className="h-4 w-4" />
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

          {/* Pricing Section */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <div className="w-full p-5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <img 
                  src={isValidCurrencyUrl && !currencyIconError ? getCurrencyIconSrc(currencyIcon) : fallbackDataUri} 
                  alt="currency" 
                  className="h-4 w-4 object-contain" 
                  onError={() => setCurrencyIconError(true)}
                />
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
                        <img 
                          src={isValidCurrencyUrl && !currencyIconError ? getCurrencyIconSrc(currencyIcon) : fallbackDataUri} 
                          alt="currency" 
                          className="h-5 w-5 object-contain"
                          onError={() => setCurrencyIconError(true)}
                        />
                      </div>
                      <Input
                        id="price"
                        type="text"
                        inputMode="decimal"
                        value={price || ''}
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
                        <img 
                          src={isValidCurrencyUrl && !currencyIconError ? getCurrencyIconSrc(currencyIcon) : fallbackDataUri} 
                          alt="currency" 
                          className="h-5 w-5 object-contain"
                          onError={() => setCurrencyIconError(true)}
                        />
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
                          ) : isValidCurrencyUrl && !currencyIconError ? (
                            <img 
                              src={currencyIcon} 
                              alt="currency" 
                              className="h-5 w-5 object-contain"
                              onError={() => setCurrencyIconError(true)}
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
                          <img 
                            src={isValidCurrencyUrl && !currencyIconError ? getCurrencyIconSrc(currencyIcon) : fallbackDataUri} 
                            alt="currency" 
                            className="h-6 w-6 object-contain"
                            onError={() => setCurrencyIconError(true)}
                          />
                          <span className="text-3xl font-bold text-gray-900 inline-flex items-baseline">
                            {price ? (() => {
                              const num = parseFloat(price)
                              const integerPart = Math.floor(num)
                              const decimalPart = Math.round((num - integerPart) * 100)
                              const decimalStr = decimalPart.toString().padStart(2, '0')
                              return (
                                <>
                                  <span>{integerPart.toLocaleString('en-US')}</span>
                                  <sup className="text-[0.8em] leading-none" style={{ fontSize: '0.8em', lineHeight: 0, verticalAlign: 'baseline', top: '-0.2em', marginLeft: '2px' }}>
                                    {decimalStr}
                                  </sup>
                                </>
                              )
                            })() : (
                              <>
                                <span>0</span>
                                <sup className="text-[0.8em] leading-none" style={{ fontSize: '0.8em', lineHeight: 0, verticalAlign: 'baseline', top: '-0.2em', marginLeft: '2px' }}>00</sup>
                              </>
                            )}
                          </span>
                        </div>
                        {/* Was price - below final price */}
                        {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price || '0') && (
                          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                            Was
                            <span className="line-through flex items-center gap-0.5">
                              <img 
                                src={isValidCurrencyUrl && !currencyIconError ? getCurrencyIconSrc(currencyIcon) : fallbackDataUri} 
                                alt="currency" 
                                className="h-3 w-3 object-contain opacity-50" 
                                onError={() => setCurrencyIconError(true)}
                              />
                              {(() => {
                                const num = parseFloat(compareAtPrice)
                                const integerPart = Math.floor(num)
                                const decimalPart = Math.round((num - integerPart) * 100)
                                const decimalStr = decimalPart.toString().padStart(2, '0')
                                return (
                                  <span className="inline-flex items-baseline">
                                    <span>{integerPart.toLocaleString('en-US')}</span>
                                    <sup className="text-[0.8em] leading-none" style={{ fontSize: '0.8em', lineHeight: 0, verticalAlign: 'baseline', top: '-0.2em', marginLeft: '2px' }}>
                                      {decimalStr}
                                    </sup>
                                  </span>
                                )
                              })()}
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
                              <img 
                                src={isValidCurrencyUrl && !currencyIconError ? getCurrencyIconSrc(currencyIcon) : fallbackDataUri} 
                                alt="currency" 
                                className="h-3 w-3 object-contain" 
                                onError={() => setCurrencyIconError(true)}
                              />
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
                        disabled={!!product?.id}
                        readOnly={!!product?.id}
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
                    {!product?.id && (
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
                    )}
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
                          if (product?.id) return
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
                        disabled={!!product?.id}
                        readOnly={!!product?.id}
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
                    {!product?.id && (
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
                    )}
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

          {/* Product QR Code Section */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <div className="w-full flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <QrCode className="h-4 w-4 text-gray-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Product QR Code
                  </h4>
                  <p className="text-xs text-gray-500">
                    {qrCode 
                      ? "QR code for in-store gifting and mobile app"
                      : "Generate QR code for product scanning"}
                  </p>
                </div>
              </div>
              {product?.id && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (product?.id) {
                            try {
                              const { generateQRCodeURL } = await import('@/lib/utils/sku-barcode-generator')
                              const qrUrl = generateQRCodeURL(product.id, storeId || undefined)
                              setQrCode(qrUrl)
                              
                              // Update product in database
                              const { error } = await supabase
                                .from('products')
                                .update({
                                  qr_code: qrUrl,
                                  qr_code_auto_generated: true,
                                })
                                .eq('id', product.id)
                              
                              if (error) {
                                console.error('Error saving QR code to database:', error)
                              }
                            } catch (err) {
                              console.error('Error generating QR code:', err)
                            }
                          }
                        }}
                        className="h-8 text-xs"
                      >
                        <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                        {qrCode ? 'Regenerate' : 'Generate'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Generate QR code for this product</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Content */}
            <div className="space-y-4 p-5 border-t border-gray-100">
              {/* QR Code URL Field */}
              <div className="space-y-2">
                <Label htmlFor="qrCode" className="text-xs text-gray-600">QR Code URL</Label>
                <div className="relative">
                  <Input
                    id="qrCode"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    placeholder={product?.id 
                      ? "Click Generate to create QR code"
                      : "QR code will be generated after product is saved"}
                    className="pr-20"
                    readOnly={!product?.id}
                  />
                  {qrCode && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(qrCode)
                          setQrCodeCopied(true)
                          setTimeout(() => setQrCodeCopied(false), 2000)
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Copy QR code URL"
                      >
                        {qrCodeCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!qrCode) return
                          try {
                            const response = await fetch('/api/barcode', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                value: qrCode,
                                type: 'QR',
                                format: 'png',
                                scale: 10,
                                height: 200,
                                includeText: false,
                                returnDataUrl: true,
                              }),
                            })
                            if (response.ok) {
                              const data = await response.json()
                              const link = document.createElement('a')
                              link.href = data.dataUrl
                              link.download = `product-qr-${product?.id || 'new'}.png`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            }
                          } catch (error) {
                            console.error('Error downloading QR code:', error)
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Download QR code image"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {!product?.id && (
                  <p className="text-[11px] text-gray-500">
                    Save the product first to generate a QR code
                  </p>
                )}
              </div>

              {/* QR Code Preview */}
              {qrCode && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <Label className="text-xs text-gray-500 mb-3 block">QR Code Preview</Label>
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex justify-center">
                        <BarcodeDisplay
                          barcode={qrCode}
                          type="QR"
                          size="lg"
                          showValue={false}
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-xs text-gray-600 font-medium">Scan this QR code to:</p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• Open product in mobile app</li>
                          <li>• View product on website</li>
                          <li>• Send as gift in-store</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Information */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-3">
                      <QrCode className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-blue-900">How it works</p>
                        <p className="text-xs text-blue-700">
                          Customers can scan this QR code with their phone camera to instantly open the product 
                          in the Haady app or website. Perfect for in-store gifting and seamless shopping experiences.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!qrCode && product?.id && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-600 text-center">
                    Click "Generate" to create a QR code for this product
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Loading Overlay - Shows during submission */}
          {(isLoading || isUploadingImage) && (
            <UniversalLoading
              overlay
              message={
                isUploadingImage 
                  ? 'Uploading images...' 
                  : product 
                    ? 'Updating product...' 
                    : 'Creating product...'
              }
              subMessage={
                isUploadingImage 
                  ? 'Please wait while we process your images' 
                  : 'Please wait, this may take a moment'
              }
            />
          )}
        </form>
  )

  if (asPage) {
    return formContent
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Prevent closing during submission
        if (!isOpen && (isLoading || isUploadingImage)) {
          return
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent 
        className="max-w-2xl max-h-[90vh] [&>button]:hidden p-0 pr-3 flex flex-col overflow-hidden"
        onInteractOutside={(e) => {
          // Prevent closing on backdrop click
          e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">
          {product ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        {/* Header spacer with Close and Expand buttons */}
        <div className="h-14 flex-shrink-0 relative">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Expand button */}
            {product && (
          <button
            type="button"
            onClick={() => {
              if (isLoading || isUploadingImage) return
              onOpenChange(false)
                  router.push(`/dashboard/products/new?edit=${product.id}`)
            }}
            disabled={isLoading || isUploadingImage}
            className="!block rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-6 w-6 flex items-center justify-center text-gray-900 hover:text-gray-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                title="Open in full page"
          >
                <Maximize2 className="h-5 w-5 text-current" />
                <span className="sr-only">Open in full page</span>
          </button>
            )}
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                if (isLoading || isUploadingImage) return
                onOpenChange(false)
              }}
              disabled={isLoading || isUploadingImage}
              className="!block rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-6 w-6 flex items-center justify-center text-gray-900 hover:text-gray-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              title="Close"
            >
              <X className="h-5 w-5 text-current" />
              <span className="sr-only">Close</span>
            </button>
        </div>
        </div>
        <div className="flex-1 overflow-y-auto pl-6 pr-0 pt-0 pb-4">
          <div className="pr-6">
            {formContent}
          </div>
        </div>
        {/* Fixed footer with buttons */}
        {!asPage && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white z-10 flex-shrink-0 sticky bottom-0">
            {product && onPreview && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onPreview(product)
                }}
                disabled={isLoading || isUploadingImage}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            )}
            <Button 
              type="submit" 
              form="product-form"
              disabled={isLoading || isUploadingImage}
            >
              {isLoading || isUploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isUploadingImage ? 'Uploading images...' : product ? 'Updating product...' : 'Creating product...'}
                </>
              ) : (
                product ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
})
