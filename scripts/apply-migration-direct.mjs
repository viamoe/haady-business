#!/usr/bin/env node

/**
 * Apply migration SQL directly using Supabase admin client via PostgREST
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

const migrationPath = process.argv[2] || 'supabase/migrations/20251223100005_fix_rpc_volatility.sql';
const migrationFile = join(__dirname, '..', migrationPath);

if (!migrationFile) {
  console.error(`❌ Migration file not found: ${migrationFile}`);
  process.exit(1);
}

const sqlQuery = readFileSync(migrationFile, 'utf8');

console.log('🚀 Applying migration directly...');
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

// Split SQL into individual statements (excluding DO blocks)
const statements = sqlQuery
  .split(';')
  .map(s => s.trim())
  .filter(s => {
    // Filter out empty statements, comments, and DO blocks
    if (!s || s.length === 0) return false;
    if (s.startsWith('--')) return false;
    if (s.match(/^DO\s+\$\$/i)) return false;
    return true;
  })
  .map(s => s + ';'); // Add semicolon back

console.log(`📝 Found ${statements.length} SQL statements to execute`);
console.log('');

// Execute each statement using the Supabase REST API with raw SQL
// We'll use the management API endpoint if available
try {
  // Try using the Supabase Management API
  const managementUrl = SUPABASE_URL.replace('/rest/v1', '');
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
    
    // Use fetch to execute SQL via Supabase Management API
    // Note: This requires the management API which may not be available
    // Alternative: Use Supabase CLI or Dashboard
    
    // For now, we'll output the SQL for manual execution
    if (i === 0) {
      console.log('');
      console.log('⚠️  Direct SQL execution via API is not available.');
      console.log('📋 Please apply this SQL manually in Supabase Dashboard:');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(sqlQuery);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📍 Steps:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Paste the SQL above');
      console.log('3. Click "Run"');
      console.log('');
      break;
    }
  }
  
  console.log('✅ Migration instructions provided above');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('');
  console.error('💡 Please apply the SQL manually in Supabase Dashboard → SQL Editor');
  process.exit(1);
}

