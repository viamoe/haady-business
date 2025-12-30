import { z } from 'zod'

// Base schemas for reusable types
export const productTypeSchema = z.enum(['physical', 'digital', 'service', 'bundle'])
export const sellingMethodSchema = z.enum(['unit', 'weight', 'length', 'time', 'subscription'])
export const fulfillmentTypeSchema = z.enum(['pickup', 'delivery', 'digital', 'onsite'])
export const salesChannelSchema = z.enum(['online', 'in_store'])
export const discountTypeSchema = z.enum(['none', 'percentage', 'fixed_amount'])
export const barcodeTypeSchema = z.enum(['EAN13', 'UPC', 'CODE128', 'QR'])

// Bundle item schema
export const bundleItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  is_required: z.boolean(),
  sort_order: z.number(),
  substitutes: z.array(z.object({
    id: z.string().optional(),
    substitute_product_id: z.string().uuid(),
    priority: z.number(),
  })).optional(),
})

// Variant option schema
export const variantOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Option name is required'),
  values: z.array(z.string()).min(1, 'At least one value is required'),
})

// Product variant schema
export const productVariantSchema = z.object({
  id: z.string(),
  options: z.record(z.string(), z.string()),
  price: z.string().refine(val => !val || parseFloat(val) >= 0, 'Price must be positive'),
  sku: z.string(),
  stock: z.string(),
  enabled: z.boolean(),
})

// Main product form schema
export const productFormSchema = z.object({
  // Basic Info - Required
  nameEn: z.string()
    .min(1, 'Product name in English is required')
    .max(200, 'Product name must be less than 200 characters'),
  nameAr: z.string()
    .min(1, 'Product name in Arabic is required')
    .max(200, 'Product name must be less than 200 characters'),
  
  // Basic Info - Optional
  descriptionEn: z.string().max(5000, 'Description must be less than 5000 characters').optional().or(z.literal('')),
  descriptionAr: z.string().max(5000, 'Description must be less than 5000 characters').optional().or(z.literal('')),
  
  // Pricing - Required
  price: z.string()
    .min(1, 'Price is required')
    .refine(val => parseFloat(val) > 0, 'Price must be greater than 0'),
  
  // Pricing - Optional
  compareAtPrice: z.string()
    .refine(val => !val || parseFloat(val) >= 0, 'Compare at price must be positive')
    .optional()
    .or(z.literal('')),
  discountType: discountTypeSchema,
  discountValue: z.string()
    .refine(val => !val || parseFloat(val) >= 0, 'Discount value must be positive')
    .optional()
    .or(z.literal('')),
  discountStartDate: z.string().optional().or(z.literal('')),
  discountEndDate: z.string().optional().or(z.literal('')),
  isScheduleEnabled: z.boolean(),
  
  // SKU & Barcode
  sku: z.string()
    .max(50, 'SKU must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  barcode: z.string()
    .max(50, 'Barcode must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  barcodeType: barcodeTypeSchema,
  
  // Availability
  isAvailable: z.boolean(),
  
  // Classification
  productType: productTypeSchema,
  sellingMethod: sellingMethodSchema,
  sellingUnit: z.string().optional().or(z.literal('')),
  fulfillmentTypes: z.array(fulfillmentTypeSchema).min(1, 'At least one fulfillment type is required'),
  requiresScheduling: z.boolean(),
  subscriptionInterval: z.string().optional().or(z.literal('')),
  salesChannels: z.array(salesChannelSchema).min(1, 'At least one sales channel is required'),
  
  // Categories
  selectedCategoryIds: z.array(z.string()),
  
  // Inventory
  trackInventory: z.boolean(),
  stockQuantity: z.string()
    .refine(val => !val || parseInt(val) >= 0, 'Stock quantity must be positive')
    .optional()
    .or(z.literal('')),
  lowStockThreshold: z.string()
    .refine(val => !val || parseInt(val) >= 0, 'Low stock threshold must be positive')
    .optional()
    .or(z.literal('')),
  allowBackorders: z.boolean(),
  continueSellingOutOfStock: z.boolean(),
  
  // Variants
  hasVariants: z.boolean(),
  variantOptions: z.array(variantOptionSchema),
  variants: z.array(productVariantSchema),
  
  // Bundle
  bundleItems: z.array(bundleItemSchema),
}).refine(
  // Custom validation: Bundle products must have at least one item
  (data) => {
    if (data.productType === 'bundle') {
      return data.bundleItems.length > 0
    }
    return true
  },
  {
    message: 'Bundle products must have at least one item',
    path: ['bundleItems'],
  }
).refine(
  // Custom validation: Discount dates must be valid when scheduled
  (data) => {
    if (data.isScheduleEnabled && data.discountStartDate && data.discountEndDate) {
      return new Date(data.discountStartDate) <= new Date(data.discountEndDate)
    }
    return true
  },
  {
    message: 'End date must be after start date',
    path: ['discountEndDate'],
  }
).refine(
  // Custom validation: Percentage discount must be <= 100
  (data) => {
    if (data.discountType === 'percentage' && data.discountValue) {
      return parseFloat(data.discountValue) <= 100
    }
    return true
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discountValue'],
  }
).refine(
  // Custom validation: Compare at price must be >= price
  (data) => {
    if (data.compareAtPrice && data.price) {
      return parseFloat(data.compareAtPrice) >= parseFloat(data.price)
    }
    return true
  },
  {
    message: 'Compare at price must be greater than or equal to the selling price',
    path: ['compareAtPrice'],
  }
)

// Type inference from schema
export type ProductFormSchemaType = z.infer<typeof productFormSchema>

// Validation helper function
export function validateProductForm(data: unknown): { 
  success: boolean
  data?: ProductFormSchemaType
  errors?: Record<string, string> 
} {
  const result = productFormSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  // Convert Zod errors to a simple key-value format
  // Zod v4 uses .issues instead of .errors
  const errors: Record<string, string> = {}
  const issues = result.error?.issues || []
  issues.forEach((issue) => {
    const path = issue.path.join('.')
    if (!errors[path]) {
      errors[path] = issue.message
    }
  })
  
  return { success: false, errors }
}

// Partial validation for individual fields
export function validateField<K extends keyof ProductFormSchemaType>(
  field: K,
  value: unknown
): string | null {
  // Get the field schema
  const fieldSchema = productFormSchema.shape[field]
  if (!fieldSchema) return null
  
  const result = fieldSchema.safeParse(value)
  if (result.success) return null
  
  // Zod v4 uses .issues instead of .errors
  const issues = result.error?.issues || []
  return issues[0]?.message || 'Invalid value'
}

