/**
 * Type definitions for Categories Management System
 */

export type CategoryType = 'joyful_gifting' | 'tastes_treats' | 'digital_surprises' | 'moments_meaning' | 'donation_charity'

export interface Category {
  id: string
  name: string
  name_ar: string | null
  slug: string
  parent_id: string | null
  level: number
  category_type: CategoryType | null // Only populated for Level 0 (Category Type)
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
  path?: string // Full path from helper function
  children?: Category[] // For hierarchical structure
}

export interface CreateCategoryRequest {
  name: string
  name_ar?: string | null
  slug?: string
  parent_id?: string | null
  icon?: string | null
  description?: string | null
  description_ar?: string | null
  sort_order?: number
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  is_active?: boolean
}

export interface CategoryListResponse {
  categories: Category[]
  total: number
  page?: number
  limit?: number
}

export interface ProductCategoryLink {
  product_id: string
  category_id: string
  category_name?: string
  category_name_ar?: string
  category_path?: string
}

export interface CategoryQueryOptions {
  parent_id?: string | null
  level?: number
  category_type?: CategoryType
  include_inactive?: boolean
  hierarchical?: boolean
  page?: number
  limit?: number
  sort_by?: 'name' | 'sort_order' | 'created_at'
  order?: 'asc' | 'desc'
}

