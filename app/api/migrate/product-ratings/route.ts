import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST() {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Read migration file
    const migrationFile = join(
      process.cwd(),
      'supabase',
      'migrations',
      '20250201000000_create_product_ratings_table.sql'
    )

    const sqlQuery = readFileSync(migrationFile, 'utf8')

    // Create admin client
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Split SQL into statements
    const statements = sqlQuery
      .split(';')
      .map((s) => s.trim())
      .filter((s) => {
        if (!s || s.length === 0) return false
        if (s.startsWith('--')) return false
        return true
      })

    const results: Array<{ statement: number; success: boolean; error?: string }> = []

    // Execute each statement using raw SQL
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue

      try {
        // Use Supabase REST API to execute SQL
        // Note: This requires the Supabase Management API or a custom RPC function
        // For now, we'll use the REST API with the service role key
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ query: statement + ';' }),
        })

        if (response.ok) {
          results.push({ statement: i + 1, success: true })
        } else {
          const errorText = await response.text()
          results.push({
            statement: i + 1,
            success: false,
            error: errorText.substring(0, 200),
          })
        }
      } catch (error: any) {
        results.push({
          statement: i + 1,
          success: false,
          error: error.message,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      message: 'Migration execution completed',
      total: statements.length,
      successful: successCount,
      failed: failureCount,
      results,
      note: failureCount > 0
        ? 'Some statements failed. Please check Supabase Dashboard or apply SQL manually.'
        : 'All statements executed successfully. Please verify in Supabase Dashboard.',
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    )
  }
}

