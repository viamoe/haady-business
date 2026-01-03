import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// GET /api/brands - List brands with filtering and search
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') || ''
    const is_active = searchParams.get('is_active')
    const is_featured = searchParams.get('is_featured')
    const category_id = searchParams.get('category_id')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))
    const sort_by = searchParams.get('sort_by') || 'sort_order'
    const order = searchParams.get('order') || 'asc'

    // If category_id is provided, we need to filter brands by category
    let query
    if (category_id) {
      // Filter brands that are linked to this category via brand_categories junction table
      query = supabase
        .from('brands')
        .select(`
          *,
          brand_categories!inner (
            category_id
          )
        `, { count: 'exact' })
        .eq('brand_categories.category_id', category_id)
    } else {
      query = supabase
        .from('brands')
        .select('*', { count: 'exact' })
    }

    // Filter by active status
    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    // Filter by featured status
    if (is_featured !== null) {
      query = query.eq('is_featured', is_featured === 'true')
    }

    // Search by name (using ILIKE for case-insensitive)
    if (search) {
      query = query.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    // Order by
    const ascending = order === 'asc'
    query = query.order(sort_by, { ascending })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: brands, error, count } = await query

    if (error) {
      console.error('Error fetching brands:', error)
      return NextResponse.json(
        { error: 'Failed to fetch brands', message: error.message },
        { status: 500 }
      )
    }

    // Clean up the response - remove brand_categories from the response if present
    const cleanedBrands = (brands || []).map((brand: any) => {
      const { brand_categories, ...brandData } = brand
      return brandData
    })

    return NextResponse.json({
      brands: cleanedBrands,
      total: count || 0,
      limit,
      offset
    })
  } catch (error: any) {
    console.error('Error in GET /api/brands:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

// POST /api/brands - Create a new brand (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      )
    }

    // TODO: Add admin check here
    // const isAdmin = await checkAdminRole(user.id)
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const body = await request.json()
    const {
      name,
      name_ar,
      slug,
      description,
      description_ar,
      logo_url,
      is_active = true,
      is_featured = false,
      is_verified = false,
      sort_order = 0,
      meta_title,
      meta_description,
      tags = [],
      category_ids = []
    } = body

    // Validation
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Generate slug if not provided
    let finalSlug = slug
    if (!finalSlug) {
      finalSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }

    // Check if slug already exists
    const { data: existingBrand } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', finalSlug)
      .single()

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Brand with this slug already exists' },
        { status: 400 }
      )
    }

    // Insert brand
    const { data: brand, error } = await supabase
      .from('brands')
      .insert({
        name: name.trim(),
        name_ar: name_ar?.trim() || null,
        slug: finalSlug,
        description: description?.trim() || null,
        description_ar: description_ar?.trim() || null,
        logo_url: logo_url || null,
        is_active,
        is_featured,
        is_verified,
        sort_order,
        meta_title: meta_title || null,
        meta_description: meta_description || null,
        tags: tags || []
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating brand:', error)
      return NextResponse.json(
        { error: 'Failed to create brand', message: error.message },
        { status: 500 }
      )
    }

    // Link categories if provided
    if (category_ids && category_ids.length > 0) {
      const categoryLinks = category_ids.map((categoryId: string) => ({
        brand_id: brand.id,
        category_id: categoryId
      }))

      const { error: categoryError } = await supabase
        .from('brand_categories')
        .insert(categoryLinks)

      if (categoryError) {
        console.error('Error linking categories:', categoryError)
        // Don't fail the request, just log the error
      }
    }

    // Fetch brand with categories
    const { data: brandWithCategories } = await supabase
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
      .eq('id', brand.id)
      .single()

    return NextResponse.json({ brand: brandWithCategories || brand }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/brands:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

