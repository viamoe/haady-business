import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/products/[id]/restore
 * Restore a soft-deleted product from trash
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

    // Check if product exists and is deleted
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, store_id, deleted_at')
      .eq('id', productId)
      .single()

    if (fetchError || !existingProduct) {
      console.error('Error fetching product for restore:', {
        error: fetchError,
        productId,
        businessProfileId: businessProfile.id
      })
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if product is actually deleted
    if (!existingProduct.deleted_at) {
      return NextResponse.json(
        { error: 'Product is not in trash' },
        { status: 400 }
      )
    }

    // Verify business ownership through store (separate query to avoid RLS issues)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, business_id')
      .eq('id', existingProduct.store_id)
      .eq('business_id', businessProfile.id)
      .single()

    if (storeError || !store) {
      console.error('Error verifying store ownership for restore:', {
        error: storeError,
        storeId: existingProduct.store_id,
        businessProfileId: businessProfile.id
      })
      return NextResponse.json(
        { error: 'Access denied: Product does not belong to your business' },
        { status: 403 }
      )
    }

    // Restore product by setting deleted_at to NULL and status to 'archived'
    const { data: restoredProduct, error: updateError } = await supabase
      .from('products')
      .update({ 
        deleted_at: null,
        status: 'archived',
        is_active: true
      })
      .eq('id', productId)
      .select()
      .single()

    if (updateError) {
      console.error('Error restoring product:', updateError)
      return NextResponse.json(
        { error: 'Failed to restore product', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, product: restoredProduct })
  } catch (error) {
    console.error('Error in POST /api/products/[id]/restore:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

