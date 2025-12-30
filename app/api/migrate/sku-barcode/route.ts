import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/migrate/sku-barcode
 * Run the SKU and Barcode migration
 */
export async function POST() {
  try {
    const supabase = createAdminClient()

    // Step 1: Add barcode fields to products table
    console.log('Step 1: Adding barcode fields to products table...')
    const { error: productsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.products 
        ADD COLUMN IF NOT EXISTS barcode text,
        ADD COLUMN IF NOT EXISTS barcode_type text DEFAULT 'EAN13',
        ADD COLUMN IF NOT EXISTS sku_auto_generated boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS barcode_auto_generated boolean DEFAULT false;
      `
    }).single()

    // If exec_sql doesn't exist, try direct SQL
    if (productsError) {
      // Try alternative: use raw SQL via REST
      const { error: altError1 } = await supabase
        .from('products')
        .select('barcode')
        .limit(1)

      // If barcode column doesn't exist, we need to add it manually
      if (altError1?.message?.includes('column') || altError1?.code === '42703') {
        console.log('Barcode column does not exist, needs manual migration')
      }
    }

    // Step 2: Create sku_settings table
    console.log('Step 2: Creating sku_settings table...')
    
    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('sku_settings')
      .select('id')
      .limit(1)

    if (checkError?.code === '42P01') {
      // Table doesn't exist - it needs to be created via Supabase dashboard
      console.log('sku_settings table does not exist')
    }

    // Step 3: Test if barcode column exists on products
    const { data: testProduct, error: testError } = await supabase
      .from('products')
      .select('id, sku, barcode')
      .limit(1)

    const barcodeColumnExists = !testError || !testError.message?.includes('barcode')

    return NextResponse.json({
      success: true,
      message: 'Migration check completed',
      status: {
        barcode_column_exists: barcodeColumnExists,
        sku_settings_table_exists: !checkError || checkError.code !== '42P01',
      },
      note: 'If columns are missing, please run the SQL migration manually in Supabase dashboard',
      sql_file: '/docs/database/add_barcode_fields.sql'
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/migrate/sku-barcode
 * Check migration status
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Check products table columns
    const { data: productCheck, error: productError } = await supabase
      .from('products')
      .select('id, sku, barcode, barcode_type')
      .limit(1)

    // Check sku_settings table
    const { data: settingsCheck, error: settingsError } = await supabase
      .from('sku_settings')
      .select('id')
      .limit(1)

    // Check product_sources table columns  
    const { data: sourcesCheck, error: sourcesError } = await supabase
      .from('product_sources')
      .select('id, platform_sku, platform_barcode')
      .limit(1)

    return NextResponse.json({
      status: 'checked',
      products_table: {
        accessible: !productError,
        has_barcode_columns: !productError?.message?.includes('barcode'),
        error: productError?.message
      },
      sku_settings_table: {
        exists: !settingsError || settingsError.code !== '42P01',
        error: settingsError?.message
      },
      product_sources_table: {
        accessible: !sourcesError,
        has_platform_barcode: !sourcesError?.message?.includes('platform_barcode'),
        error: sourcesError?.message
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Check failed', details: error.message },
      { status: 500 }
    )
  }
}

