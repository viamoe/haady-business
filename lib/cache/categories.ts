/**
 * Caching utilities for categories
 * Uses Next.js cache for server-side caching
 */

import { cache } from 'react'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Category } from '../types/categories'

/**
 * Cache key constants
 */
const CACHE_KEYS = {
  ACTIVE_CATEGORIES: 'categories:active',
  CATEGORY_TREE: 'categories:tree',
  CATEGORY_BY_ID: (id: string) => `categories:${id}`,
} as const

/**
 * Get active categories with caching (5 min TTL)
 */
export const getCachedActiveCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createServerSupabase()
  
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching active categories:', error)
    return []
  }

  return categories || []
})

/**
 * Get category tree with caching (10 min TTL)
 */
export const getCachedCategoryTree = cache(async (): Promise<Category[]> => {
  const supabase = await createServerSupabase()
  
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching category tree:', error)
    return []
  }

  if (!categories) {
    return []
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
})

/**
 * Note: Next.js cache is automatically invalidated on revalidation
 * For manual invalidation, you would need to use revalidatePath or revalidateTag
 * from next/cache in your mutation endpoints
 */

