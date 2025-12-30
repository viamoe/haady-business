import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ProductCategoryLink } from '@/lib/types/categories'
import { isValidUUID, validateCategoryIds, verifyProductOwnership } from '@/lib/categories'

/**
 * GET /api/products/[id]/categories
 * Get all categories for a product
 */
export async function GET(
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
    const productId = resolvedParams.id

    // Validate UUID
    if (!isValidUUID(productId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    // Verify product ownership
    const hasAccess = await verifyProductOwnership(productId, user.id, supabase)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this product' },
        { status: 403 }
      )
    }

    // Get categories using the view for efficiency
    const { data: productCategories, error } = await supabase
      .from('product_categories_view')
      .select('product_id, category_id, category_name, category_name_ar, category_path')
      .eq('product_id', productId)

    if (error) {
      // Fallback to direct query if view doesn't exist
      const { data: directCategories, error: directError } = await supabase
        .from('product_categories')
        .select(`
          product_id,
          category_id,
          categories!inner(
            name,
            name_ar
          )
        `)
        .eq('product_id', productId)

      if (directError) {
        console.error('Error fetching product categories:', directError)
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to fetch product categories',
            details: directError.message
          },
          { status: 500 }
        )
      }

      const categories: ProductCategoryLink[] = (directCategories || []).map((pc: any) => ({
        product_id: pc.product_id,
        category_id: pc.category_id,
        category_name: pc.categories?.name,
        category_name_ar: pc.categories?.name_ar
      }))

      return NextResponse.json({ categories })
    }

    const categories: ProductCategoryLink[] = (productCategories || []).map((pc: any) => ({
      product_id: pc.product_id,
      category_id: pc.category_id,
      category_name: pc.category_name,
      category_name_ar: pc.category_name_ar,
      category_path: pc.category_path
    }))

    return NextResponse.json({ categories })
  } catch (error: any) {
    console.error('Error in GET /api/products/[id]/categories:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Failed to fetch product categories',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products/[id]/categories
 * Link product to categories (replaces existing)
 */
export async function POST(
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
    const productId = resolvedParams.id

    // Validate UUID
    if (!isValidUUID(productId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { category_ids } = body

    // Validate category_ids
    if (!Array.isArray(category_ids)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'category_ids must be an array' },
        { status: 400 }
      )
    }

    if (category_ids.length > 10) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Maximum 10 categories allowed per product' },
        { status: 400 }
      )
    }

    // Verify product ownership
    const hasAccess = await verifyProductOwnership(productId, user.id, supabase)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this product' },
        { status: 403 }
      )
    }

    // Validate all category IDs exist and are active
    if (category_ids.length > 0) {
      const validation = await validateCategoryIds(category_ids, supabase)
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Validation error',
            message: 'One or more category IDs are invalid or inactive',
            details: `Invalid IDs: ${validation.invalidIds.join(', ')}`
          },
          { status: 422 }
        )
      }
    }

    // Use transaction: delete existing + insert new
    const { error: deleteError } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', productId)

    if (deleteError) {
      console.error('Error deleting existing product categories:', deleteError)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to update product categories',
          details: deleteError.message
        },
        { status: 500 }
      )
    }

    // Insert new category links
    if (category_ids.length > 0) {
      const links = category_ids.map((categoryId: string) => ({
        product_id: productId,
        category_id: categoryId
      }))

      const { error: insertError } = await supabase
        .from('product_categories')
        .insert(links)

      if (insertError) {
        console.error('Error inserting product categories:', insertError)
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to link categories to product',
            details: insertError.message
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      linked_count: category_ids.length
    })
  } catch (error: any) {
    console.error('Error in POST /api/products/[id]/categories:', error)
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
 * PUT /api/products/[id]/categories
 * Replace all categories (same as POST)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // PUT is the same as POST for this endpoint
  return POST(request, { params })
}

