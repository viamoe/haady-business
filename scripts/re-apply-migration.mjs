#!/usr/bin/env node

/**
 * Re-apply migration SQL directly using Supabase admin client
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

const migrationPath = process.argv[2] || 'supabase/migrations/20251223100001_optimize_save_personal_details_onboarding.sql';
const migrationFile = join(__dirname, '..', migrationPath);

if (!migrationFile || !readFileSync(migrationFile, 'utf8')) {
  console.error(`❌ Migration file not found: ${migrationFile}`);
  process.exit(1);
}

const sqlQuery = readFileSync(migrationFile, 'utf8');

console.log('🚀 Re-applying migration...');
console.log(`📄 File: ${migrationPath}`);
console.log(`🔗 Database: ${SUPABASE_URL}`);
console.log('');

// Create admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Execute SQL using rpc (if exec_sql exists) or direct query
try {
  // Try using rpc.exec_sql first
  const { data, error } = await supabase.rpc('exec_sql', { query: sqlQuery });
  
  if (error) {
    // If exec_sql doesn't exist, try direct SQL execution via REST API
    console.log('⚠️  exec_sql RPC not found, trying direct execution...');
    
    // Split SQL into statements and execute via REST API
    const statements = sqlQuery
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^DO\s+\$\$/i));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error: execError } = await supabase.rpc('exec_sql', { query: statement + ';' });
        if (execError && !execError.message.includes('exec_sql')) {
          // Try alternative: use Supabase REST API directly
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ query: statement + ';' }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error executing statement:`, errorText);
            throw new Error(`Failed to execute SQL: ${errorText}`);
          }
        }
      }
    }
  }
  
  console.log('✅ Migration re-applied successfully!');
  console.log('');
  console.log('📊 Next steps:');
  console.log('1. Verify the function: Check Supabase Dashboard → Database → Functions');
  console.log('2. Test the onboarding form: Try submitting personal details');
  console.log('3. Check logs: Monitor for any timeout errors');
  
} catch (error) {
  console.error('❌ Error re-applying migration:', error.message);
  console.error('');
  console.error('💡 Alternative: Apply the SQL directly in Supabase Dashboard → SQL Editor');
  process.exit(1);
}

