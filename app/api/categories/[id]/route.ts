import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UpdateCategoryRequest } from '@/lib/types/categories'
import {
  isValidUUID,
  validateCategorySlug,
  generateSlugFromName,
  calculateCategoryLevel,
  checkCategoryHasChildren,
  checkCategoryInUse,
  checkCircularReference
} from '@/lib/categories'
import { revalidatePath } from 'next/cache'

/**
 * GET /api/categories/[id]
 * Get a single category by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const resolvedParams = params instanceof Promise ? await params : params
    const categoryId = resolvedParams.id

    // Validate UUID
    if (!isValidUUID(categoryId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    // Get category
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single()

    if (error || !category) {
      return NextResponse.json(
        { error: 'Not found', message: 'Category not found' },
        { status: 404 }
      )
    }

    // Get category path if helper function exists
    try {
      const { data: pathData } = await supabase.rpc('get_category_path', {
        category_id: categoryId
      })
      if (pathData) {
        category.path = pathData
      }
    } catch (rpcError) {
      // RPC function might not exist, that's okay
      console.log('get_category_path RPC not available')
    }

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Error in GET /api/categories/[id]:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Failed to fetch category',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/categories/[id]
 * Update a category
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    const resolvedParams = params instanceof Promise ? await params : params
    const categoryId = resolvedParams.id

    // Validate UUID
    if (!isValidUUID(categoryId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    const body: UpdateCategoryRequest = await request.json()
    const { name, name_ar, slug, parent_id, icon, description, description_ar, sort_order, is_active } = body

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single()

    if (fetchError || !existingCategory) {
      return NextResponse.json(
        { error: 'Not found', message: 'Category not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: any = {}

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Category name cannot be empty' },
          { status: 400 }
        )
      }
      if (name.length > 255) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Category name must be 255 characters or less' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (name_ar !== undefined) {
      if (name_ar && name_ar.length > 255) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Arabic name must be 255 characters or less' },
          { status: 400 }
        )
      }
      updateData.name_ar = name_ar?.trim() || null
    }

    if (slug !== undefined) {
      const finalSlug = slug || (name ? generateSlugFromName(name) : existingCategory.slug)
      if (!validateCategorySlug(finalSlug)) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Invalid slug format' },
          { status: 400 }
        )
      }

      // Check if slug is already taken by another category
      if (finalSlug !== existingCategory.slug) {
        const { data: slugExists } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', finalSlug)
          .neq('id', categoryId)
          .single()

        if (slugExists) {
          return NextResponse.json(
            { error: 'Conflict', message: 'A category with this slug already exists' },
            { status: 409 }
          )
        }
      }

      updateData.slug = finalSlug
    }

    if (parent_id !== undefined) {
      const newParentId = parent_id || null

      // Check for circular reference
      if (newParentId) {
        const isCircular = await checkCircularReference(categoryId, newParentId, supabase)
        if (isCircular) {
          return NextResponse.json(
            { error: 'Validation error', message: 'Cannot set parent: would create circular reference' },
            { status: 400 }
          )
        }

        // Validate parent exists and is active
        const { data: parent } = await supabase
          .from('categories')
          .select('id, level, is_active')
          .eq('id', newParentId)
          .single()

        if (!parent) {
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

        // Calculate new level
        updateData.level = parent.level + 1
      } else {
        updateData.level = 0
      }

      updateData.parent_id = newParentId
    }

    if (icon !== undefined) updateData.icon = icon || null
    if (description !== undefined) updateData.description = description?.trim() || null
    if (description_ar !== undefined) updateData.description_ar = description_ar?.trim() || null
    if (sort_order !== undefined) {
      if (sort_order < 0) {
        return NextResponse.json(
          { error: 'Validation error', message: 'sort_order must be non-negative' },
          { status: 400 }
        )
      }
      updateData.sort_order = sort_order
    }
    if (is_active !== undefined) updateData.is_active = is_active

    // Update category
    const { data: category, error: updateError } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating category:', updateError)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to update category',
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      )
    }

    // Invalidate cache
    revalidatePath('/api/categories')

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Error in PUT /api/categories/[id]:', error)
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

/**
 * DELETE /api/categories/[id]
 * Soft delete a category (set is_active = false)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    const resolvedParams = params instanceof Promise ? await params : params
    const categoryId = resolvedParams.id

    // Validate UUID
    if (!isValidUUID(categoryId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    // Check if category exists
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('id, is_active')
      .eq('id', categoryId)
      .single()

    if (fetchError || !category) {
      return NextResponse.json(
        { error: 'Not found', message: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if category has active children
    const hasChildren = await checkCategoryHasChildren(categoryId, supabase)
    if (hasChildren) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Cannot delete category: it has active child categories'
        },
        { status: 400 }
      )
    }

    // Check if category is in use
    const inUse = await checkCategoryInUse(categoryId, supabase)
    if (inUse.inProducts || inUse.inStores) {
      const reasons = []
      if (inUse.inProducts) reasons.push('products')
      if (inUse.inStores) reasons.push('stores')

      return NextResponse.json(
        {
          error: 'Conflict',
          message: `Cannot delete category: it is in use by ${reasons.join(' and ')}`
        },
        { status: 409 }
      )
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', categoryId)

    if (deleteError) {
      console.error('Error deleting category:', deleteError)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to delete category',
          details: deleteError.message
        },
        { status: 500 }
      )
    }

    // Invalidate cache
    revalidatePath('/api/categories')

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/categories/[id]:', error)
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

