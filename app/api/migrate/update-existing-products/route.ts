import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// SKU Generation utilities
function generateSku(prefix: string = 'PROD', sequence: number): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// EAN-13 Barcode generation with valid check digit
function generateEAN13(prefix: string = '200'): string {
  // Generate 9 random digits after the prefix (prefix is 3 digits)
  const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
  const baseCode = prefix + randomPart
  
  // Calculate check digit for EAN-13
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(baseCode[i])
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  
  return baseCode + checkDigit
}

/**
 * POST /api/migrate/update-existing-products
 * Update existing products with barcodes and flags
 */
export async function POST() {
  try {
    const supabase = createAdminClient()

    // Get all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, barcode, sku_auto_generated, barcode_auto_generated')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products found to update',
        updated: 0
      })
    }

    const updates: any[] = []
    const results: any[] = []

    for (const product of products) {
      const updateData: any = {}
      let needsUpdate = false

      // Check if product has a manually entered SKU (not auto-generated format)
      const hasManualSku = product.sku && !product.sku.startsWith('PROD-')
      const hasAutoSku = product.sku && product.sku.startsWith('PROD-')
      
      // Set sku_auto_generated flag based on SKU pattern
      if (hasAutoSku && !product.sku_auto_generated) {
        updateData.sku_auto_generated = true
        needsUpdate = true
      } else if (hasManualSku && product.sku_auto_generated !== false) {
        updateData.sku_auto_generated = false
        needsUpdate = true
      }

      // Generate barcode if missing
      if (!product.barcode) {
        updateData.barcode = generateEAN13('200')
        updateData.barcode_type = 'EAN13'
        updateData.barcode_auto_generated = true
        needsUpdate = true
      }

      if (needsUpdate) {
        updates.push({
          id: product.id,
          ...updateData
        })
      }

      results.push({
        id: product.id,
        sku: product.sku,
        had_barcode: !!product.barcode,
        new_barcode: updateData.barcode || product.barcode,
        sku_auto_generated: updateData.sku_auto_generated ?? product.sku_auto_generated,
        barcode_auto_generated: updateData.barcode_auto_generated ?? product.barcode_auto_generated,
        updated: needsUpdate
      })
    }

    // Apply updates
    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (const update of updates) {
      const { id, ...data } = update
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)

      if (error) {
        errorCount++
        errors.push({ id, error: error.message })
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${successCount} products, ${errorCount} errors`,
      total_products: products.length,
      updated: successCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors : undefined,
      details: results
    })

  } catch (error: any) {
    console.error('Update error:', error)
    return NextResponse.json(
      { error: 'Update failed', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/migrate/update-existing-products
 * Preview what will be updated
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Get all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, barcode, sku_auto_generated, barcode_auto_generated, name_en')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    const preview = products?.map(product => ({
      id: product.id,
      name: product.name_en,
      sku: product.sku,
      barcode: product.barcode,
      sku_auto_generated: product.sku_auto_generated,
      barcode_auto_generated: product.barcode_auto_generated,
      needs_barcode: !product.barcode,
      has_manual_sku: product.sku && !product.sku.startsWith('PROD-'),
    }))

    const needsBarcode = preview?.filter(p => p.needs_barcode).length || 0
    const hasManualSku = preview?.filter(p => p.has_manual_sku).length || 0

    return NextResponse.json({
      total_products: products?.length || 0,
      needs_barcode_generation: needsBarcode,
      has_manual_sku: hasManualSku,
      products: preview
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Preview failed', details: error.message },
      { status: 500 }
    )
  }
}

