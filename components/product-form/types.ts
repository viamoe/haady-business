// Upload Progress Type
export interface UploadProgress {
  currentIndex: number
  totalFiles: number
  currentFileProgress: number // 0-100 for current file
  currentFileName: string
  isUploading: boolean
}

export const defaultUploadProgress: UploadProgress = {
  currentIndex: 0,
  totalFiles: 0,
  currentFileProgress: 0,
  currentFileName: '',
  isUploading: false,
}

// Product Types
export interface Product {
  id: string
  name_en: string | null
  name_ar: string | null
  description_en: string | null
  description_ar: string | null
  price: number | null
  sku: string | null
  barcode: string | null
  barcode_type: string | null
  qr_code: string | null
  qr_code_auto_generated: boolean | null
  image_url: string | null
  is_available: boolean
  is_active: boolean
  created_at: string
  store_id: string
  // Classification fields
  product_type?: ProductType
  selling_method?: SellingMethod
  selling_unit?: string | null
  fulfillment_type?: FulfillmentType[]
  requires_scheduling?: boolean
  subscription_interval?: string | null
  // Sales channels
  sales_channels?: SalesChannel[]
  // Pricing & Discounts
  compare_at_price?: number | null
  discount_type?: DiscountType
  discount_value?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
  // Inventory tracking
  track_inventory?: boolean
  allow_backorder?: boolean
  low_stock_threshold?: number | null
  // Brand
  brand_id?: string | null
}

export type ProductType = 'physical' | 'digital' | 'service' | 'bundle'
export type SellingMethod = 'unit' | 'weight' | 'length' | 'time' | 'subscription'
export type FulfillmentType = 'pickup' | 'delivery' | 'digital' | 'onsite'
export type SalesChannel = 'online' | 'in_store'
export type DiscountType = 'none' | 'percentage' | 'fixed_amount'
export type BarcodeType = 'EAN13' | 'UPC' | 'CODE128' | 'QR'

// Bundle Types
export interface BundleItem {
  id?: string
  product_id: string
  product?: Product
  quantity: number
  is_required: boolean
  sort_order: number
  substitutes?: BundleSubstitute[]
}

export interface BundleSubstitute {
  id?: string
  substitute_product_id: string
  substitute_product?: Product
  priority: number
}

// Image Types
export interface ProductImage {
  id: string
  url: string
  is_primary: boolean
}

// Category Types
export interface Category {
  id: string
  name: string
  name_ar: string | null
  slug: string
  parent_id: string | null
  level: number
  category_type: 'joyful_gifting' | 'tastes_treats' | 'digital_surprises' | 'moments_meaning' | 'donation_charity' | null
  icon: string | null
  image_url: string | null
  hover_image_url: string | null
  description: string | null
  description_ar: string | null
  is_active: boolean
  is_system: boolean
  sort_order: number
  created_at: string
  updated_at: string
  path?: string
  children?: Category[]
}

// Variant Types
export interface VariantOption {
  id: string
  name: string
  values: string[]
}

export interface ProductVariant {
  id: string
  options: Record<string, string>
  price: string
  sku: string
  stock: string
  enabled: boolean
}

// Form Data Types
export interface ProductFormData {
  // Basic Info
  nameEn: string
  nameAr: string
  descriptionEn: string
  descriptionAr: string
  
  // Pricing
  price: string
  compareAtPrice: string
  discountType: DiscountType
  discountValue: string
  discountStartDate: string
  discountEndDate: string
  isScheduleEnabled: boolean
  
  // SKU & Barcode
  sku: string
  barcode: string
  barcodeType: BarcodeType
  qrCode: string
  
  // Availability
  isAvailable: boolean
  
  // Classification
  productType: ProductType
  sellingMethod: SellingMethod
  sellingUnit: string
  fulfillmentTypes: FulfillmentType[]
  requiresScheduling: boolean
  subscriptionInterval: string
  salesChannels: SalesChannel[]
  
  // Categories
  selectedCategoryIds: string[]
  
  // Brand
  selectedBrandId: string | null
  
  // Inventory
  trackInventory: boolean
  stockQuantity: string
  lowStockThreshold: string
  allowBackorders: boolean
  continueSellingOutOfStock: boolean
  
  // Variants
  hasVariants: boolean
  variantOptions: VariantOption[]
  variants: ProductVariant[]
  
  // Bundle
  bundleItems: BundleItem[]
}

export interface ProductFormErrors {
  nameEn?: string
  nameAr?: string
  price?: string
  salesChannels?: string
  bundleItems?: string
  selectedCategoryIds?: string
}

// Props Types
export interface ProductFormProps {
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

// Context Types
export interface ProductFormContextValue {
  // Form data
  formData: ProductFormData
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>
  updateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void
  
  // Images
  imageFiles: File[]
  setImageFiles: React.Dispatch<React.SetStateAction<File[]>>
  imagePreviews: string[]
  setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>
  existingImages: ProductImage[]
  setExistingImages: React.Dispatch<React.SetStateAction<ProductImage[]>>
  deletedImageIds: string[]
  setDeletedImageIds: React.Dispatch<React.SetStateAction<string[]>>
  featuredNewImageIndex: number
  setFeaturedNewImageIndex: React.Dispatch<React.SetStateAction<number>>
  
  // Categories
  allCategories: Category[]
  setAllCategories: React.Dispatch<React.SetStateAction<Category[]>>
  isCategoriesLoading: boolean
  
  // Available products (for bundles)
  availableProducts: Product[]
  setAvailableProducts: React.Dispatch<React.SetStateAction<Product[]>>
  
  // Errors
  errors: ProductFormErrors
  setErrors: React.Dispatch<React.SetStateAction<ProductFormErrors>>
  clearError: (field: keyof ProductFormErrors) => void
  
  // Loading states
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  isUploadingImage: boolean
  setIsUploadingImage: React.Dispatch<React.SetStateAction<boolean>>
  
  // Upload progress
  uploadProgress: UploadProgress
  setUploadProgress: React.Dispatch<React.SetStateAction<UploadProgress>>
  
  // Store info
  storeId: string | null
  currencyIcon: string | null
  
  // Product being edited
  product: Product | null
  
  // Locale
  locale: string
  isRTL: boolean
}

// Default form data
export const defaultFormData: ProductFormData = {
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  price: '',
  compareAtPrice: '',
  discountType: 'none',
  discountValue: '',
  discountStartDate: '',
  discountEndDate: '',
  isScheduleEnabled: false,
  sku: '',
  barcode: '',
  barcodeType: 'EAN13',
  qrCode: '',
  isAvailable: true,
  productType: 'physical',
  sellingMethod: 'unit',
  sellingUnit: '',
  fulfillmentTypes: ['pickup'],
  requiresScheduling: false,
  subscriptionInterval: '',
  salesChannels: ['online', 'in_store'],
  selectedCategoryIds: [],
  selectedBrandId: null,
  trackInventory: true,
  stockQuantity: '',
  lowStockThreshold: '10',
  allowBackorders: false,
  continueSellingOutOfStock: false,
  hasVariants: false,
  variantOptions: [],
  variants: [],
  bundleItems: [],
}

