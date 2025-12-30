import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID, verifyProductOwnership } from '@/lib/categories'

/**
 * DELETE /api/products/[id]/categories/[categoryId]
 * Unlink a single category from a product
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> | { id: string; categoryId: string } }
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
    const categoryId = resolvedParams.categoryId

    // Validate UUIDs
    if (!isValidUUID(productId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    if (!isValidUUID(categoryId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid category ID format' },
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

    // Delete the category link
    const { error: deleteError } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', productId)
      .eq('category_id', categoryId)

    if (deleteError) {
      console.error('Error deleting product category link:', deleteError)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to unlink category from product',
          details: deleteError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Category unlinked successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/products/[id]/categories/[categoryId]:', error)
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

