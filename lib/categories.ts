/**
 * Helper functions for Categories Management
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Category, CategoryQueryOptions } from './types/categories'

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate category slug format
 */
export function validateCategorySlug(slug: string): boolean {
  // Slug should be lowercase, alphanumeric with hyphens, 1-100 chars
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugRegex.test(slug) && slug.length >= 1 && slug.length <= 100
}

/**
 * Generate slug from category name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

/**
 * Validate array of category IDs
 */
export async function validateCategoryIds(
  ids: string[],
  supabase: SupabaseClient
): Promise<{ valid: boolean; invalidIds: string[] }> {
  if (!ids || ids.length === 0) {
    return { valid: true, invalidIds: [] }
  }

  // Validate UUID format
  const invalidIds = ids.filter(id => !isValidUUID(id))
  if (invalidIds.length > 0) {
    return { valid: false, invalidIds }
  }

  try {
    // Check if all categories exist and are active
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id')
      .in('id', ids)
      .eq('is_active', true)

    if (error) {
      console.error('Error validating category IDs:', error)
      // Return all as invalid if query fails
      return { valid: false, invalidIds: ids }
    }

    const foundIds = new Set(categories?.map(c => c.id) || [])
    const missingIds = ids.filter(id => !foundIds.has(id))

    return {
      valid: missingIds.length === 0,
      invalidIds: missingIds
    }
  } catch (error) {
    console.error('Exception validating category IDs:', error)
    // Return all as invalid if exception occurs
    return { valid: false, invalidIds: ids }
  }
}

/**
 * Calculate category level based on parent
 */
export async function calculateCategoryLevel(
  parentId: string | null,
  supabase: SupabaseClient
): Promise<number> {
  if (!parentId) {
    return 0
  }

  const { data: parent } = await supabase
    .from('categories')
    .select('level')
    .eq('id', parentId)
    .single()

  if (!parent) {
    throw new Error('Parent category not found')
  }

  return parent.level + 1
}

/**
 * Check if category has active children
 */
export async function checkCategoryHasChildren(
  categoryId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', categoryId)
    .eq('is_active', true)
    .limit(1)

  if (error) {
    console.error('Error checking category children:', error)
    return false
  }

  return (data?.length || 0) > 0
}

/**
 * Check if category is in use by products or stores
 */
export async function checkCategoryInUse(
  categoryId: string,
  supabase: SupabaseClient
): Promise<{ inProducts: boolean; inStores: boolean }> {
  const [productsResult, storesResult] = await Promise.all([
    supabase
      .from('product_categories')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1),
    supabase
      .from('store_categories')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1)
  ])

  return {
    inProducts: (productsResult.data?.length || 0) > 0,
    inStores: (storesResult.data?.length || 0) > 0
  }
}

/**
 * Get categories in hierarchical structure
 */
export async function getCategoriesHierarchical(
  supabase: SupabaseClient,
  options?: CategoryQueryOptions
): Promise<Category[]> {
  const {
    parent_id = undefined, // Default to undefined (not null) to get ALL categories when not specified
    level,
    category_type,
    include_inactive = false,
    hierarchical = false,
    sort_by = 'sort_order',
    order = 'asc'
  } = options || {}

  let query = supabase
    .from('categories')
    .select('*')

  // Filter by parent - only filter if explicitly provided (not undefined)
  // If parent_id is undefined, don't filter (get all categories)
  // If parent_id is null, get only root categories (parent_id IS NULL)
  // If parent_id is a UUID, get only children of that parent
  if (parent_id !== undefined) {
    if (parent_id === null) {
      query = query.is('parent_id', null)
    } else if (parent_id) {
      query = query.eq('parent_id', parent_id)
    }
    // If parent_id is undefined, don't add any filter (get all)
  }

  // Filter by level
  if (level !== undefined) {
    query = query.eq('level', level)
  }

  // Filter by category_type
  if (category_type !== undefined) {
    query = query.eq('category_type', category_type)
  }

  // Filter active/inactive
  if (!include_inactive) {
    query = query.eq('is_active', true)
  }

  // Order by
  query = query.order(sort_by, { ascending: order === 'asc' })

  const { data: categories, error } = await query

  if (error) {
    throw error
  }

  if (!hierarchical || !categories) {
    return categories || []
  }

  // Build hierarchical structure
  const categoryMap = new Map<string, Category>()
  const rootCategories: Category[] = []

  // First pass: create map
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] })
  })

  // Second pass: build tree
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const parent = categoryMap.get(cat.parent_id)!
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(category)
    } else {
      rootCategories.push(category)
    }
  })

  return rootCategories
}

/**
 * Verify product ownership
 */
export async function verifyProductOwnership(
  productId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  // First get the product with store
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, store_id, stores!inner(id, business_id)')
    .eq('id', productId)
    .single()

  if (productError || !product) {
    return false
  }

  const store = product.stores as any
  if (!store?.business_id) {
    return false
  }

  // Then verify the business_profile belongs to the user
  const { data: businessProfile, error: profileError } = await supabase
    .from('business_profile')
    .select('id, auth_user_id')
    .eq('id', store.business_id)
    .eq('auth_user_id', userId)
    .single()

  if (profileError || !businessProfile) {
    return false
  }

  return businessProfile.auth_user_id === userId
}

/**
 * Check for circular parent references
 */
export async function checkCircularReference(
  categoryId: string,
  newParentId: string | null,
  supabase: SupabaseClient
): Promise<boolean> {
  if (!newParentId) {
    return false // No parent means no circular reference
  }

  // If setting parent to self, that's circular
  if (categoryId === newParentId) {
    return true
  }

  // Check if newParentId is a descendant of categoryId
  const visited = new Set<string>()
  let currentId: string | null = newParentId

  while (currentId && !visited.has(currentId)) {
    if (currentId === categoryId) {
      return true // Circular reference found
    }
    visited.add(currentId)

    const { data: parentRow } = await supabase
      .from('categories')
      .select('parent_id')
      .eq('id', currentId)
      .single() as { data: { parent_id: string | null } | null }

    currentId = parentRow?.parent_id || null
  }

  return false
}

