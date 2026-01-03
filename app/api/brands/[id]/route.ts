import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/categories'

// GET /api/brands/[id] - Get a single brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const { id } = await Promise.resolve(params)

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'ID must be a valid UUID' },
        { status: 400 }
      )
    }

    const { data: brand, error } = await supabase
      .from('brands')
      .select(`
        *,
        brand_categories (
          category_id,
          categories (
            id,
            name,
            slug
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found', message: 'Brand not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching brand:', error)
      return NextResponse.json(
        { error: 'Failed to fetch brand', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ brand })
  } catch (error: any) {
    console.error('Error in GET /api/brands/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/brands/[id] - Update a brand (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const { id } = await Promise.resolve(params)

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'ID must be a valid UUID' },
        { status: 400 }
      )
    }

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      )
    }

    // TODO: Add admin check here

    const body = await request.json()
    const {
      name,
      name_ar,
      slug,
      description,
      description_ar,
      logo_url,
      is_active,
      is_featured,
      is_verified,
      sort_order,
      meta_title,
      meta_description,
      tags,
      category_ids
    } = body

    // Build update object (only include provided fields)
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (name_ar !== undefined) updates.name_ar = name_ar?.trim() || null
    if (slug !== undefined) updates.slug = slug.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (description_ar !== undefined) updates.description_ar = description_ar?.trim() || null
    if (logo_url !== undefined) updates.logo_url = logo_url || null
    if (is_active !== undefined) updates.is_active = is_active
    if (is_featured !== undefined) updates.is_featured = is_featured
    if (is_verified !== undefined) updates.is_verified = is_verified
    if (sort_order !== undefined) updates.sort_order = sort_order
    if (meta_title !== undefined) updates.meta_title = meta_title || null
    if (meta_description !== undefined) updates.meta_description = meta_description || null
    if (tags !== undefined) updates.tags = tags || []

    // Check slug uniqueness if slug is being updated
    if (slug !== undefined) {
      const { data: existingBrand } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single()

      if (existingBrand) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Brand with this slug already exists' },
          { status: 400 }
        )
      }
    }

    const { data: brand, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating brand:', error)
      return NextResponse.json(
        { error: 'Failed to update brand', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ brand })
  } catch (error: any) {
    console.error('Error in PUT /api/brands/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/brands/[id] - Delete a brand (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const { id } = await Promise.resolve(params)

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'ID must be a valid UUID' },
        { status: 400 }
      )
    }

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      )
    }

    // TODO: Add admin check here

    // Check if brand is used by any products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('brand_id', id)
      .limit(1)

    if (productsError) {
      console.error('Error checking brand usage:', productsError)
      return NextResponse.json(
        { error: 'Failed to check brand usage', message: productsError.message },
        { status: 500 }
      )
    }

    if (products && products.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete brand', message: 'Brand is being used by products. Deactivate it instead.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting brand:', error)
      return NextResponse.json(
        { error: 'Failed to delete brand', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Brand deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/brands/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

