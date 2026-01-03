import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get product recommendations based on ratings
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const strategy = searchParams.get('strategy') || 'similar_ratings' // similar_ratings, top_rated, trending

    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    // Get user's store
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('store_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!businessProfile?.store_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    let recommendations: any[] = []

    switch (strategy) {
      case 'similar_ratings': {
        // Find products with similar average ratings (within 0.5 stars)
        const { data: currentProduct } = await supabase
          .from('products')
          .select('id')
          .eq('id', productId)
          .single()

        if (!currentProduct) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Get current product's average rating
        const { data: currentStats } = await supabase
          .rpc('get_product_rating_stats', { product_uuid: productId })

        if (!currentStats || currentStats.length === 0 || currentStats[0].average_rating === 0) {
          // If no ratings, just break - will return empty recommendations
          break
        }

        const targetRating = currentStats[0].average_rating
        const minRating = Math.max(1, targetRating - 0.5)
        const maxRating = Math.min(5, targetRating + 0.5)

        // Get all products with ratings in similar range
        const { data: similarProducts } = await supabase
          .from('product_ratings')
          .select('product_id, rating')
          .neq('product_id', productId)

        if (!similarProducts || similarProducts.length === 0) {
          break
        }

        // Calculate average ratings for each product
        const productRatings = new Map<string, { sum: number; count: number }>()
        similarProducts.forEach((pr) => {
          const existing = productRatings.get(pr.product_id) || { sum: 0, count: 0 }
          productRatings.set(pr.product_id, {
            sum: existing.sum + pr.rating,
            count: existing.count + 1
          })
        })

        // Filter products with similar ratings
        const similarProductIds = Array.from(productRatings.entries())
          .filter(([_, stats]) => {
            const avg = stats.sum / stats.count
            return avg >= minRating && avg <= maxRating
          })
          .map(([id]) => id)
          .slice(0, limit)

        if (similarProductIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name_en, name_ar, price, image_url, status')
            .in('id', similarProductIds)
            .eq('store_id', businessProfile.store_id)
            .eq('is_active', true)
            .limit(limit)

          recommendations = products || []
        }
        break
      }

      case 'top_rated': {
        // Get top rated products
        const { data: allRatings } = await supabase
          .from('product_ratings')
          .select('product_id, rating')

        if (!allRatings || allRatings.length === 0) {
          break
        }

        // Calculate average ratings
        const productRatings = new Map<string, { sum: number; count: number }>()
        allRatings.forEach((pr) => {
          const existing = productRatings.get(pr.product_id) || { sum: 0, count: 0 }
          productRatings.set(pr.product_id, {
            sum: existing.sum + pr.rating,
            count: existing.count + 1
          })
        })

        // Sort by average rating and get top products
        const topProductIds = Array.from(productRatings.entries())
          .map(([id, stats]) => ({
            id,
            avgRating: stats.sum / stats.count,
            count: stats.count
          }))
          .sort((a, b) => {
            // Sort by average rating, then by number of ratings
            if (Math.abs(a.avgRating - b.avgRating) < 0.1) {
              return b.count - a.count
            }
            return b.avgRating - a.avgRating
          })
          .filter((p) => p.id !== productId)
          .slice(0, limit)
          .map((p) => p.id)

        if (topProductIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name_en, name_ar, price, image_url, status')
            .in('id', topProductIds)
            .eq('store_id', businessProfile.store_id)
            .eq('is_active', true)
            .limit(limit)

          recommendations = products || []
        }
        break
      }

      case 'trending': {
        // Get products with recent ratings (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: recentRatings } = await supabase
          .from('product_ratings')
          .select('product_id, rating, created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())

        if (!recentRatings || recentRatings.length === 0) {
          break
        }

        // Calculate average ratings for recently rated products
        const productRatings = new Map<string, { sum: number; count: number }>()
        recentRatings.forEach((pr) => {
          const existing = productRatings.get(pr.product_id) || { sum: 0, count: 0 }
          productRatings.set(pr.product_id, {
            sum: existing.sum + pr.rating,
            count: existing.count + 1
          })
        })

        // Sort by number of recent ratings
        const trendingProductIds = Array.from(productRatings.entries())
          .map(([id, stats]) => ({
            id,
            count: stats.count,
            avgRating: stats.sum / stats.count
          }))
          .sort((a, b) => {
            // Sort by number of ratings, then by average rating
            if (a.count === b.count) {
              return b.avgRating - a.avgRating
            }
            return b.count - a.count
          })
          .filter((p) => p.id !== productId)
          .slice(0, limit)
          .map((p) => p.id)

        if (trendingProductIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name_en, name_ar, price, image_url, status')
            .in('id', trendingProductIds)
            .eq('store_id', businessProfile.store_id)
            .eq('is_active', true)
            .limit(limit)

          recommendations = products || []
        }
        break
      }
    }

    // If no recommendations found, return empty array
    return NextResponse.json({
      recommendations,
      strategy,
      count: recommendations.length
    })
  } catch (error: any) {
    console.error('Error in GET /api/products/recommendations:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

