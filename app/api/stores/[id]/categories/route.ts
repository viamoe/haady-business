import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * GET /api/stores/[id]/categories
 * Get all categories available for a store (default + enabled)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: storeId } = await Promise.resolve(params)
    const supabase = await createServerSupabase()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all default/system categories
    const { data: defaultCategories, error: defaultError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_system', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (defaultError) {
      console.error('Error fetching default categories:', defaultError)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    // Get store's enabled categories
    const { data: enabledCategories, error: enabledError } = await supabase
      .from('store_enabled_categories')
      .select('category_id, is_enabled')
      .eq('store_id', storeId)

    if (enabledError) {
      console.error('Error fetching enabled categories:', enabledError)
    }

    // Create a map of enabled categories
    const enabledMap = new Map(
      (enabledCategories || []).map(ec => [ec.category_id, ec.is_enabled])
    )

    // Merge default categories with enabled status
    const categoriesWithStatus = (defaultCategories || []).map(category => ({
      ...category,
      is_enabled: enabledMap.get(category.id) ?? true, // Default to enabled if not in map
      is_custom: false,
    }))

    // Get custom categories (non-system) for this store
    const { data: customCategories, error: customError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_system', false)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (customError) {
      console.error('Error fetching custom categories:', customError)
    }

    const customWithStatus = (customCategories || []).map(category => ({
      ...category,
      is_enabled: enabledMap.get(category.id) ?? true,
      is_custom: true,
    }))

    return NextResponse.json({
      categories: [...categoriesWithStatus, ...customWithStatus],
      total: categoriesWithStatus.length + customWithStatus.length,
    })
  } catch (error) {
    console.error('Error in GET /api/stores/[storeId]/categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stores/[id]/categories
 * Enable or disable a category for a store
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: storeId } = await Promise.resolve(params)
    const body = await request.json()
    const { categoryId, isEnabled } = body

    if (!categoryId || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'categoryId and isEnabled are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabase()

    // Verify user is authenticated and owns the store
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, business_id')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('id, auth_user_id')
      .eq('id', store.business_id)
      .single()

    if (!businessProfile || businessProfile.auth_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Upsert the enabled category
    const { data, error } = await supabase
      .from('store_enabled_categories')
      .upsert({
        store_id: storeId,
        category_id: categoryId,
        is_enabled: isEnabled,
      }, {
        onConflict: 'store_id,category_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating enabled category:', error)
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      category: data,
    })
  } catch (error) {
    console.error('Error in POST /api/stores/[storeId]/categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

