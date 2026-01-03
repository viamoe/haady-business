import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/products/[id]/history
 * Get edit history for a product
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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle both sync and async params (Next.js 15 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const productId = resolvedParams.id

    // Verify the product belongs to the user's business
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!businessProfile) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 404 }
      )
    }

    // Verify product ownership
    const { data: product } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', productId)
      .single()

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify store ownership
    const { data: store } = await supabase
      .from('stores')
      .select('id, business_id')
      .eq('id', product.store_id)
      .eq('business_id', businessProfile.id)
      .single()

    if (!store) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get edit history
    const { data: history, error } = await supabase
      .from('product_edit_history')
      .select('id, changes, edit_type, created_at, edited_by')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching edit history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch edit history', details: error.message },
        { status: 500 }
      )
    }

    // Get unique user IDs from history
    const userIds = [...new Set((history || []).map(item => item.edited_by).filter(Boolean))]
    
    // Fetch user names from business_profile
    const userProfiles: Record<string, { name: string; email: string }> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('business_profile')
        .select('auth_user_id, full_name')
        .in('auth_user_id', userIds)
      
      if (profiles) {
        profiles.forEach(profile => {
          if (profile.auth_user_id) {
            userProfiles[profile.auth_user_id] = {
              name: profile.full_name || 'Unknown User',
              email: ''
            }
          }
        })
      }
      
      // Also try to get emails from auth.users via RPC or direct query if possible
      // For now, we'll use the business_profile data
    }

    // Format the response with user info
    const formattedHistory = (history || []).map(item => {
      const userInfo = item.edited_by && userProfiles[item.edited_by]
        ? {
            id: item.edited_by,
            name: userProfiles[item.edited_by].name,
            email: userProfiles[item.edited_by].email
          }
        : item.edited_by
          ? {
              id: item.edited_by,
              name: `User ${item.edited_by.substring(0, 8)}`,
              email: ''
            }
          : null

      return {
        id: item.id,
        changes: item.changes,
        editType: item.edit_type,
        createdAt: item.created_at,
        editedBy: userInfo
      }
    })

    return NextResponse.json({ history: formattedHistory })
  } catch (error: any) {
    console.error('Error in GET /api/products/[id]/history:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    )
  }
}
