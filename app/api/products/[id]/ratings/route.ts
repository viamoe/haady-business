import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Fetch ratings for a product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const sortBy = searchParams.get('sort') || 'created_at' // created_at, rating, helpful_count
    const order = searchParams.get('order') || 'desc' // asc, desc

    // Validate product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('product_ratings')
      .select(`
        id,
        rating,
        review_text,
        is_verified_purchase,
        helpful_count,
        created_at,
        updated_at,
        user_id
      `)
      .eq('product_id', productId)

    // Apply sorting
    const validSortFields = ['created_at', 'rating', 'helpful_count']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const sortOrder = order === 'asc' ? { ascending: true } : { ascending: false }
    
    query = query.order(sortField, sortOrder)

    // Apply pagination
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: ratings, error: ratingsError } = await query

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError)
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
    }

    // Get rating statistics if requested
    let stats = null
    if (includeStats) {
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_product_rating_stats', { product_uuid: productId })

      if (!statsError && statsData && statsData.length > 0) {
        stats = statsData[0]
      }
    }

    return NextResponse.json({
      ratings: ratings || [],
      stats,
      pagination: {
        limit,
        offset,
        total: ratings?.length || 0
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/products/[id]/ratings:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// POST - Create a new rating
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    // Validate product exists and user has access
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await request.json()
    const { rating, review_text, is_verified_purchase } = body

    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check if user already has a rating for this product
    const { data: existingRating } = await supabase
      .from('product_ratings')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingRating) {
      return NextResponse.json({ error: 'You have already rated this product. Use PUT to update your rating.' }, { status: 400 })
    }

    // Insert new rating
    const { data: newRating, error: insertError } = await supabase
      .from('product_ratings')
      .insert({
        product_id: productId,
        user_id: user.id,
        rating,
        review_text: review_text || null,
        is_verified_purchase: is_verified_purchase || false
      })
      .select(`
        id,
        rating,
        review_text,
        is_verified_purchase,
        helpful_count,
        created_at,
        updated_at,
        user_id
      `)
      .single()

    if (insertError) {
      console.error('Error creating rating:', insertError)
      return NextResponse.json({ error: 'Failed to create rating', details: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      rating: newRating,
      message: 'Rating created successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/products/[id]/ratings:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// PUT - Update an existing rating
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    const body = await request.json()
    const { rating, review_text, is_verified_purchase } = body

    // Validate rating if provided
    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Find existing rating
    const { data: existingRating, error: findError } = await supabase
      .from('product_ratings')
      .select('id, user_id')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (findError || !existingRating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
    }

    // Update rating
    const updateData: any = {}
    if (rating !== undefined) updateData.rating = rating
    if (review_text !== undefined) updateData.review_text = review_text
    if (is_verified_purchase !== undefined) updateData.is_verified_purchase = is_verified_purchase

    const { data: updatedRating, error: updateError } = await supabase
      .from('product_ratings')
      .update(updateData)
      .eq('id', existingRating.id)
      .select(`
        id,
        rating,
        review_text,
        is_verified_purchase,
        helpful_count,
        created_at,
        updated_at,
        user_id
      `)
      .single()

    if (updateError) {
      console.error('Error updating rating:', updateError)
      return NextResponse.json({ error: 'Failed to update rating', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      rating: updatedRating,
      message: 'Rating updated successfully'
    })
  } catch (error: any) {
    console.error('Error in PUT /api/products/[id]/ratings:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete a rating
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    // Find and delete rating
    const { error: deleteError } = await supabase
      .from('product_ratings')
      .delete()
      .eq('product_id', productId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting rating:', deleteError)
      return NextResponse.json({ error: 'Failed to delete rating', details: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Rating deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/products/[id]/ratings:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

