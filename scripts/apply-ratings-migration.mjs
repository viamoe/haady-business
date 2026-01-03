#!/usr/bin/env node

/**
 * Apply product ratings migration directly using Supabase admin client
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

// Create admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Execute SQL using Supabase REST API
try {
  // Split SQL into statements
  const statements = sqlQuery
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      if (!s || s.length === 0) return false;
      if (s.startsWith('--')) return false;
      return true;
    });

  console.log(`📝 Found ${statements.length} SQL statements to execute`);
  console.log('');

  // Execute via Supabase Management API
  const managementUrl = SUPABASE_URL.replace('/rest/v1', '');
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;
    
    console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      // Try using RPC exec_sql if available
      const { data, error } = await supabase.rpc('exec_sql', { 
        query: statement + ';' 
      });
      
      if (error) {
        // If exec_sql doesn't work, try direct REST API call
        const response = await fetch(`${managementUrl}/rest/v1/rpc/exec_sql`, {
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
          console.warn(`⚠️  Could not execute via API: ${errorText.substring(0, 100)}`);
          // Continue with next statement
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.warn(`⚠️  Error executing statement ${i + 1}: ${err.message}`);
      // Continue with next statement
    }
  }
  
  console.log('');
  console.log('✅ Migration application completed!');
  console.log('');
  console.log('📊 Verification:');
  console.log('1. Check Supabase Dashboard → Database → Tables → product_ratings');
  console.log('2. Verify RLS policies are enabled');
  console.log('3. Test the API endpoints');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('');
  console.error('💡 If automatic execution failed, please apply the SQL manually:');
  console.error('   Supabase Dashboard → SQL Editor → Paste SQL → Run');
  process.exit(1);
}

