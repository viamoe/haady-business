/**
 * Product Edit Page Types
 * Centralized type definitions for the product edit page and related components
 */

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
  image_url: string | null
  is_available: boolean
  is_active: boolean
  created_at: string
  store_id: string
  brand_id?: string | null
  product_type?: ProductType
  selling_method?: SellingMethod
  selling_unit?: string | null
  fulfillment_type?: FulfillmentType[]
  requires_scheduling?: boolean
  subscription_interval?: string | null
  sales_channels?: SalesChannel[]
  compare_at_price?: number | null
  discount_type?: DiscountType
  discount_value?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
  status?: ProductStatus
}

export type ProductType = 'physical' | 'digital' | 'service' | 'bundle'
export type SellingMethod = 'unit' | 'weight' | 'length' | 'time' | 'subscription'
export type FulfillmentType = 'pickup' | 'delivery' | 'digital' | 'onsite'
export type SalesChannel = 'online' | 'in_store'
export type DiscountType = 'none' | 'percentage' | 'fixed_amount'
export type ProductStatus = 'draft' | 'active' | 'archived' | 'scheduled'

export interface EditHistoryEntry {
  id: string
  changes: Record<string, FieldChange>
  editType: string
  createdAt: string
  editedBy: EditedByUser | null
}

export interface FieldChange {
  old_value: any
  new_value: any
}

export interface EditedByUser {
  id: string
  email: string
  name: string
}

export interface UserHistoryGroup {
  user: EditedByUser | null
  entries: EditHistoryEntry[]
}

export interface Category {
  id: string
  name: string
}

export interface Brand {
  id: string
  name: string
}

