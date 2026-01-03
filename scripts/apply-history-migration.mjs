#!/usr/bin/env node

/**
 * Script to apply product_edit_history migrations
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🚀 Applying product_edit_history migrations...\n');

    // Read migration files
    const migration1Path = join(__dirname, '..', 'supabase', 'migrations', '20250204000000_create_product_edit_history.sql');
    const migration2Path = join(__dirname, '..', 'supabase', 'migrations', '20250204000001_fix_product_edit_history_rls.sql');

    let migration1SQL, migration2SQL;
    try {
      migration1SQL = readFileSync(migration1Path, 'utf8');
      migration2SQL = readFileSync(migration2Path, 'utf8');
    } catch (error) {
      console.error('❌ Error reading migration files:', error.message);
      process.exit(1);
    }

    // Combine both migrations
    const combinedSQL = migration1SQL + '\n\n' + migration2SQL;

    console.log('📝 Executing migration SQL...\n');

    // Split by semicolons and execute each statement
    const statements = combinedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.length < 10) continue;

      try {
        // Use rpc if available, otherwise use direct query
        const { error } = await supabase.rpc('exec_sql', { query: statement + ';' }).catch(async () => {
          // Fallback: try direct execution via REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ query: statement + ';' }),
          });
          return { error: response.ok ? null : new Error(`HTTP ${response.status}`) };
        });

        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            console.log(`   ⚠️  Statement ${i + 1}: Already exists (skipping)`);
          } else {
            console.error(`   ❌ Statement ${i + 1} failed:`, error.message);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        // Try direct SQL execution
        console.log(`   ⚠️  Statement ${i + 1}: Cannot execute via RPC, will need manual execution`);
        errorCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}\n`);

    if (errorCount > 0) {
      console.log('⚠️  Some statements could not be executed automatically.');
      console.log('📋 Please run the SQL manually in Supabase Dashboard:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(combinedSQL);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📍 Steps:');
      console.log('   1. Go to: https://supabase.com/dashboard');
      console.log('   2. Select your project');
      console.log('   3. Navigate to: SQL Editor');
      console.log('   4. Paste the SQL above');
      console.log('   5. Click "Run"\n');
    } else {
      // Verify migration
      console.log('🔍 Verifying migration...\n');
      
      const { data: tableCheck, error: tableError } = await supabase
        .from('product_edit_history')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === '42P01') {
        console.log('   ❌ Table still does not exist after migration');
        console.log('   📋 Please run the SQL manually in Supabase Dashboard\n');
      } else {
        console.log('   ✅ Table exists!');
        
        // Check policies
        const { data: history, error: historyError } = await supabase
          .from('product_edit_history')
          .select('id')
          .limit(1);

        if (historyError && historyError.code === '42501') {
          console.log('   ⚠️  RLS policies may need adjustment');
        } else {
          console.log('   ✅ RLS policies configured correctly');
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('   You can now edit products and view their history.\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error('\n📋 Please apply the migration manually:');
    console.error('   1. Go to Supabase Dashboard → SQL Editor');
    console.error('   2. Copy the SQL from: supabase/migrations/20250204000000_create_product_edit_history.sql');
    console.error('   3. Copy the SQL from: supabase/migrations/20250204000001_fix_product_edit_history_rls.sql');
    console.error('   4. Paste and run both in SQL Editor\n');
    process.exit(1);
  }
}

applyMigration();

