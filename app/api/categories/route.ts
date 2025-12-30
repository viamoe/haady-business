import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CreateCategoryRequest, CategoryListResponse } from '@/lib/types/categories'
import {
  validateCategorySlug,
  generateSlugFromName,
  calculateCategoryLevel,
  getCategoriesHierarchical,
  isValidUUID
} from '@/lib/categories'
import { revalidatePath } from 'next/cache'

/**
 * GET /api/categories
 * List categories with optional filtering and pagination
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const parent_id = searchParams.get('parent_id')
    const level = searchParams.get('level') ? parseInt(searchParams.get('level')!, 10) : undefined
    const include_inactive = searchParams.get('include_inactive') === 'true'
    const hierarchical = searchParams.get('hierarchical') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)))
    const sort_by = (searchParams.get('sort_by') || 'sort_order') as 'name' | 'sort_order' | 'created_at'
    const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc'

    // Validate parent_id if provided
    if (parent_id && !isValidUUID(parent_id)) {
      return NextResponse.json(
        { error: 'Invalid parent_id format', message: 'parent_id must be a valid UUID' },
        { status: 400 }
      )
    }

    // Validate level if provided
    if (level !== undefined && (isNaN(level) || level < 0)) {
      return NextResponse.json(
        { error: 'Invalid level', message: 'level must be a non-negative integer' },
        { status: 400 }
      )
    }

    // Get categories
    const options = {
      parent_id: parent_id || null,
      level,
      include_inactive,
      hierarchical,
      sort_by,
      order
    }

    const categories = await getCategoriesHierarchical(supabase, options)

    // Apply pagination if not hierarchical
    let paginatedCategories = categories
    let total = categories.length

    if (!hierarchical) {
      const start = (page - 1) * limit
      const end = start + limit
      paginatedCategories = categories.slice(start, end)
    }

    const response: CategoryListResponse = {
      categories: paginatedCategories,
      total,
      page: hierarchical ? undefined : page,
      limit: hierarchical ? undefined : limit
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in GET /api/categories:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Failed to fetch categories',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: CreateCategoryRequest = await request.json()
    const { name, name_ar, slug, parent_id, icon, description, description_ar, sort_order } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Category name is required' },
        { status: 400 }
      )
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Category name must be 255 characters or less' },
        { status: 400 }
      )
    }

    if (name_ar && name_ar.length > 255) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Arabic name must be 255 characters or less' },
        { status: 400 }
      )
    }

    // Generate or validate slug
    let finalSlug = slug || generateSlugFromName(name)
    if (!validateCategorySlug(finalSlug)) {
      finalSlug = generateSlugFromName(name)
    }

    // Check if slug already exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', finalSlug)
      .single()

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Conflict', message: 'A category with this slug already exists' },
        { status: 409 }
      )
    }

    // Validate parent if provided
    let level = 0
    if (parent_id) {
      if (!isValidUUID(parent_id)) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Invalid parent_id format' },
          { status: 400 }
        )
      }

      // Check if parent exists and is active
      const { data: parent, error: parentError } = await supabase
        .from('categories')
        .select('id, level, is_active')
        .eq('id', parent_id)
        .single()

      if (parentError || !parent) {
        return NextResponse.json(
          { error: 'Not found', message: 'Parent category not found' },
          { status: 404 }
        )
      }

      if (!parent.is_active) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Parent category is not active' },
          { status: 400 }
        )
      }

      level = parent.level + 1
    }

    // Create category
    const { data: category, error: createError } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        name_ar: name_ar?.trim() || null,
        slug: finalSlug,
        parent_id: parent_id || null,
        level,
        icon: icon || null,
        description: description?.trim() || null,
        description_ar: description_ar?.trim() || null,
        sort_order: sort_order || 0,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating category:', createError)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to create category',
          details: createError.message,
          code: createError.code
        },
        { status: 500 }
      )
    }

    // Invalidate cache
    revalidatePath('/api/categories')

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/categories:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      },
      { status: 500 }
    )
  }
}

