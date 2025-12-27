#!/usr/bin/env node

/**
 * Verify and fix the save_personal_details_onboarding RPC function
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('🔍 Verifying RPC function signature...\n');

// Read the migration SQL
const migrationFile = join(__dirname, '..', 'supabase/migrations/20251223100001_optimize_save_personal_details_onboarding.sql');
const sqlQuery = readFileSync(migrationFile, 'utf8');

// Extract just the CREATE FUNCTION part
const createFunctionMatch = sqlQuery.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;[\s\S]*?\$\$;/);
if (!createFunctionMatch) {
  console.error('❌ Could not extract function definition from migration file');
  process.exit(1);
}

const functionSQL = createFunctionMatch[0];

console.log('📝 Applying function update directly...\n');

try {
  // Use the Supabase REST API to execute SQL directly
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: functionSQL }),
  });

  if (!response.ok) {
    // If exec_sql doesn't exist, try using PostgREST directly
    console.log('⚠️  exec_sql RPC not available, trying alternative method...\n');
    
    // Split into statements and execute via psql or direct connection
    // For now, let's use a simpler approach - execute via Supabase JS client
    const statements = functionSQL.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          // Try to execute via REST API with raw SQL
          const sqlStatement = statement.trim() + ';';
          console.log(`Executing: ${sqlStatement.substring(0, 100)}...`);
          
          // Use Supabase's query method - but this won't work for DDL
          // We need to use the management API or psql
          console.log('⚠️  Direct SQL execution requires Supabase Management API or psql');
          console.log('💡 Please apply the migration manually in Supabase Dashboard → SQL Editor\n');
          console.log('SQL to execute:');
          console.log('─'.repeat(80));
          console.log(functionSQL);
          console.log('─'.repeat(80));
          break;
        } catch (err) {
          console.error(`Error: ${err.message}`);
        }
      }
    }
  } else {
    const result = await response.json();
    console.log('✅ Function updated successfully!');
    console.log('Result:', result);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Please apply the SQL manually:');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Copy and paste the following SQL:');
  console.log('\n' + '='.repeat(80));
  console.log(functionSQL);
  console.log('='.repeat(80));
}

