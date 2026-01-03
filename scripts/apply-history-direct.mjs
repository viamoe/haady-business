#!/usr/bin/env node

/**
 * Direct migration application using Supabase REST API
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function applyMigration() {
  const migration1Path = join(__dirname, '..', 'supabase', 'migrations', '20250204000000_create_product_edit_history.sql');
  const migration2Path = join(__dirname, '..', 'supabase', 'migrations', '20250204000001_fix_product_edit_history_rls.sql');

  const migration1SQL = readFileSync(migration1Path, 'utf8');
  const migration2SQL = readFileSync(migration2Path, 'utf8');
  const combinedSQL = migration1SQL + '\n\n' + migration2SQL;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 COPY THIS SQL AND RUN IT IN SUPABASE DASHBOARD:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(combinedSQL);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📍 Steps:');
  console.log('   1. Open: https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to: SQL Editor (left sidebar)');
  console.log('   4. Click "New query"');
  console.log('   5. Paste the SQL above');
  console.log('   6. Click "Run" (or press Cmd/Ctrl + Enter)');
  console.log('   7. Wait for "Success" message\n');
  console.log('✅ After running, edit a product and check Edit History!\n');
}

applyMigration();

