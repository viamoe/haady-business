#!/usr/bin/env node

/**
 * Apply product ratings migration using Supabase Management API
 * This requires the Management API key (different from service role key)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL');
  console.error('   Required: SUPABASE_ACCESS_TOKEN or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const migrationFile = join(__dirname, '..', 'supabase/migrations/20250201000000_create_product_ratings_table.sql');
const sqlQuery = readFileSync(migrationFile, 'utf8');

console.log('🚀 Applying product ratings migration via Management API...');
console.log(`📄 File: supabase/migrations/20250201000000_create_product_ratings_table.sql`);
console.log(`🔗 Database: ${SUPABASE_URL}`);
console.log('');

// Extract project reference from URL
const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from SUPABASE_URL');
  process.exit(1);
}

// Use Supabase Management API
const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function executeMigration() {
  try {
    console.log('📝 Executing migration SQL...');
    console.log('');

    const response = await fetch(managementApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        query: sqlQuery,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Migration failed!');
      console.error(`Status: ${response.status}`);
      console.error(`Response: ${errorText}`);
      
      // If Management API doesn't work, provide manual instructions
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  Automatic migration failed. Please apply manually:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📍 Steps:');
      console.log('1. Go to: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Navigate to: SQL Editor');
      console.log('4. Paste the SQL below');
      console.log('5. Click "Run"');
      console.log('');
      console.log('SQL to execute:');
      console.log('─'.repeat(80));
      console.log(sqlQuery);
      console.log('─'.repeat(80));
      
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully!');
    console.log('');
    console.log('📊 Verification:');
    console.log('1. Check Supabase Dashboard → Database → Tables → product_ratings');
    console.log('2. Verify RLS policies are enabled');
    console.log('3. Test the API endpoints');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('💡 Please apply the migration manually in Supabase Dashboard → SQL Editor');
    process.exit(1);
  }
}

executeMigration();

