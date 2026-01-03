#!/usr/bin/env node

/**
 * Script to check if product_edit_history table exists and verify RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

async function checkHistory() {
  try {
    console.log('🔍 Checking product_edit_history setup...\n');

    // Check if table exists
    console.log('1. Checking if table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('product_edit_history')
      .select('id')
      .limit(1);

    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('   ❌ Table does not exist!');
        console.log('   📋 You need to run the migration:');
        console.log('      supabase/migrations/20250204000000_create_product_edit_history.sql');
        return;
      } else {
        console.log('   ⚠️  Error checking table:', tableError.message);
      }
    } else {
      console.log('   ✅ Table exists');
    }

    // Check RLS policies
    console.log('\n2. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'product_edit_history'
        ORDER BY policyname;
      `
    }).catch(() => ({ data: null, error: { message: 'Cannot check policies via RPC' } }));

    if (policyError) {
      console.log('   ⚠️  Cannot check policies automatically');
      console.log('   📋 Please check in Supabase Dashboard → Database → Policies');
    } else {
      console.log('   ✅ Policies check completed');
    }

    // Check if there's any history
    console.log('\n3. Checking existing history records...');
    const { data: history, error: historyError, count } = await supabase
      .from('product_edit_history')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (historyError) {
      console.log('   ❌ Error fetching history:', historyError.message);
      console.log('   Code:', historyError.code);
      console.log('   Details:', historyError.details);
      console.log('   Hint:', historyError.hint);
    } else {
      console.log(`   ✅ Found ${count || 0} history records`);
      if (history && history.length > 0) {
        console.log('   Sample record:');
        console.log('   - ID:', history[0].id);
        console.log('   - Product ID:', history[0].product_id);
        console.log('   - Edit Type:', history[0].edit_type);
        console.log('   - Created At:', history[0].created_at);
        console.log('   - Changes:', Object.keys(history[0].changes || {}));
      }
    }

    // Test insert (will be rolled back)
    console.log('\n4. Testing insert capability...');
    const testProductId = '00000000-0000-0000-0000-000000000000'; // Dummy ID
    const { error: insertError } = await supabase
      .from('product_edit_history')
      .insert({
        product_id: testProductId,
        edited_by: '00000000-0000-0000-0000-000000000000',
        changes: { test: { old_value: 'old', new_value: 'new' } },
        edit_type: 'test'
      });

    if (insertError) {
      if (insertError.code === '23503') {
        console.log('   ✅ Insert works (foreign key error expected with dummy ID)');
      } else if (insertError.code === '42501') {
        console.log('   ❌ Permission denied - RLS policy is blocking inserts!');
        console.log('   📋 You need to run the migration:');
        console.log('      supabase/migrations/20250204000001_fix_product_edit_history_rls.sql');
      } else {
        console.log('   ⚠️  Insert error:', insertError.message);
        console.log('   Code:', insertError.code);
      }
    } else {
      console.log('   ✅ Insert works!');
      // Clean up test record
      await supabase
        .from('product_edit_history')
        .delete()
        .eq('product_id', testProductId);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (tableError && tableError.code === '42P01') {
      console.log('❌ ACTION REQUIRED:');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Run: supabase/migrations/20250204000000_create_product_edit_history.sql');
      console.log('   3. Run: supabase/migrations/20250204000001_fix_product_edit_history_rls.sql');
      console.log('   4. Run this script again to verify\n');
    } else {
      console.log('✅ Table exists');
      console.log('📋 Next steps:');
      console.log('   1. Update a product to generate history');
      console.log('   2. Check server console logs for history save messages');
      console.log('   3. Open Edit History dialog to view changes\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkHistory();

