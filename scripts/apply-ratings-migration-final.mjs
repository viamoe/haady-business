#!/usr/bin/env node

/**
 * Apply product ratings migration - Final version
 * First creates exec_sql function, then uses it to run the migration
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
  process.exit(1);
}

console.log('🚀 Applying product ratings migration...');
console.log(`🔗 Database: ${SUPABASE_URL}`);
console.log('');

// Create admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// First, create exec_sql function if it doesn't exist
const execSqlFunction = `
CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
`;

// Read migration file
const migrationFile = join(__dirname, '..', 'supabase/migrations/20250201000000_create_product_ratings_table.sql');
const sqlQuery = readFileSync(migrationFile, 'utf8');

async function executeSQL(sql) {
  try {
    // Use the Supabase REST API to execute SQL via exec_sql RPC
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
    throw error;
  }
}

// Main execution
(async () => {
  try {
    console.log('📝 Step 1: Creating exec_sql function...');
    
    try {
      await executeSQL(execSqlFunction);
      console.log('✅ exec_sql function created successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️  exec_sql function already exists');
      } else {
        console.warn(`⚠️  Could not create exec_sql function: ${error.message}`);
        console.log('   Continuing with migration attempt...');
      }
    }
    
    console.log('');
    console.log('📝 Step 2: Executing migration SQL...');
    
    // Split SQL into statements
    const statements = sqlQuery
      .split(';')
      .map((s) => s.trim())
      .filter((s) => {
        if (!s || s.length === 0) return false;
        if (s.startsWith('--')) return false;
        return true;
      });

    console.log(`   Found ${statements.length} SQL statements to execute`);
    console.log('');

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

      try {
        await executeSQL(statement + ';');
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
      } catch (error) {
        console.error(`❌ Statement ${i + 1} failed: ${error.message.substring(0, 100)}`);
        failureCount++;
        
        // If it's a "already exists" error, that's okay
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`   ℹ️  This is expected if migration was partially applied`);
          successCount++;
          failureCount--;
        }
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migration completed: ${successCount} successful, ${failureCount} failed`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (failureCount === 0) {
      console.log('🎉 All statements executed successfully!');
      console.log('');
      console.log('📊 Verification:');
      console.log('1. Check Supabase Dashboard → Database → Tables → product_ratings');
      console.log('2. Verify RLS policies are enabled');
      console.log('3. Test the API endpoints');
    } else {
      console.log('⚠️  Some statements failed. Please check the errors above.');
      console.log('   You may need to apply the migration manually in Supabase Dashboard.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

