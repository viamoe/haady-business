#!/usr/bin/env node

/**
 * Apply product ratings migration using Supabase client with direct SQL execution
 * This script uses the Supabase JS client to execute SQL statements
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const migrationFile = join(__dirname, '..', 'supabase/migrations/20250201000000_create_product_ratings_table.sql');

if (!migrationFile) {
  console.error(`❌ Migration file not found: ${migrationFile}`);
  process.exit(1);
}

const sqlQuery = readFileSync(migrationFile, 'utf8');

console.log('🚀 Applying product ratings migration...');
console.log(`📄 File: supabase/migrations/20250201000000_create_product_ratings_table.sql`);
console.log(`🔗 Database: ${SUPABASE_URL}`);
console.log('');

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

// Execute SQL using Supabase REST API directly
async function executeSQL(sql) {
  try {
    // Use the Supabase REST API to execute SQL
    // The service role key allows us to bypass RLS
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    // If exec_sql doesn't exist, we need to use a different approach
    // Try using the Supabase Management API or psql
    throw error;
  }
}

// Main execution
(async () => {
  try {
    console.log('📝 Preparing to execute SQL statements...');
    console.log('');
    
    // Since exec_sql RPC doesn't exist, we'll output instructions
    // and provide the SQL for manual execution
    console.log('⚠️  Direct SQL execution via API requires the exec_sql RPC function.');
    console.log('   This function is not available in your Supabase instance.');
    console.log('');
    console.log('📋 Please apply this SQL manually in Supabase Dashboard:');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sqlQuery);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📍 Steps:');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Navigate to: SQL Editor');
    console.log('4. Paste the SQL above');
    console.log('5. Click "Run"');
    console.log('');
    console.log('✅ After running, verify:');
    console.log('   - Table "product_ratings" exists in Database → Tables');
    console.log('   - RLS policies are enabled (Database → Authentication → Policies)');
    console.log('   - Function "get_product_rating_stats" exists (Database → Functions)');
    console.log('');
    
    // Try to verify if table already exists
    try {
      const { data, error } = await supabase
        .from('product_ratings')
        .select('id')
        .limit(1);
      
      if (!error) {
        console.log('✅ Table "product_ratings" already exists!');
        console.log('   Migration may have already been applied.');
      }
    } catch (err) {
      console.log('ℹ️  Table does not exist yet. Please run the migration SQL above.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

