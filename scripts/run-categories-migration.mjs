#!/usr/bin/env node

/**
 * Categories Migration Script
 * Migrates to single categories table structure
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
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Categories Migration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Database: ${SUPABASE_URL}`);
console.log('');

async function runMigration() {
  try {
    // Read migration SQL file
    const migrationPath = join(__dirname, '..', 'docs', 'database', 'migrate_to_single_categories_table.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');
    console.log('');

    // Split SQL into individual statements (basic split on semicolons)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('IF NOT EXISTS') ||
              error.message.includes('ON CONFLICT DO NOTHING')) {
            skipCount++;
            process.stdout.write('⊙');
          } else {
            throw error;
          }
        } else {
          successCount++;
          process.stdout.write('✓');
        }
        
        // New line every 50 statements
        if ((i + 1) % 50 === 0) {
          console.log('');
        }
      } catch (err) {
        console.log('');
        console.log('');
        console.error(`❌ Error in statement ${i + 1}:`);
        console.error(err.message);
        console.error('');
        console.error('Statement:');
        console.error(statement.substring(0, 200) + '...');
        throw err;
      }
    }

    console.log('');
    console.log('');
    console.log('✅ Migration completed!');
    console.log(`   Executed: ${successCount} statements`);
    console.log(`   Skipped: ${skipCount} (already exists)`);
    console.log('');

    // Verify migration
    console.log('🔍 Verifying migration...');
    
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true });
    
    const { data: storeCategories, error: storeCatError } = await supabase
      .from('store_categories')
      .select('id', { count: 'exact', head: true });

    if (!catError) {
      console.log(`   ✓ categories table: ${categories?.length || 0} rows`);
    }
    if (!storeCatError) {
      console.log(`   ✓ store_categories table: ${storeCategories?.length || 0} rows`);
    }
    
    console.log('');
    console.log('🎉 Migration successful!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Test the onboarding flow');
    console.log('   2. Verify categories load correctly');
    console.log('   3. Check Arabic localization');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:');
    console.error(error);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check your Supabase credentials');
    console.error('   2. Verify database permissions');
    console.error('   3. Run in Supabase SQL Editor instead');
    console.error('');
    process.exit(1);
  }
}

// Run migration
runMigration();

