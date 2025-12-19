#!/usr/bin/env node

/**
 * Run Database Migration Script
 * Executes SQL migrations on Supabase database
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Read migration file
const migrationPath = process.argv[2] || 'docs/database/migrate_to_single_categories_table.sql';
const migrationFile = path.join(__dirname, '..', migrationPath);

if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Migration file not found: ${migrationFile}`);
  process.exit(1);
}

const sqlQuery = fs.readFileSync(migrationFile, 'utf8');

console.log('🚀 Starting migration...');
console.log(`📄 File: ${migrationPath}`);
console.log(`🔗 Database: ${SUPABASE_URL}`);
console.log('');

// Execute SQL via Supabase REST API
const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);

const data = JSON.stringify({ query: sqlQuery });

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('📊 Next steps:');
      console.log('1. Verify migration: Check Supabase Table Editor');
      console.log('2. Test the app: Try creating a new business');
      console.log('3. Check categories: Ensure they load correctly');
      process.exit(0);
    } else {
      console.error('❌ Migration failed!');
      console.error(`Status: ${res.statusCode}`);
      console.error(`Response: ${responseData}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error executing migration:', error.message);
  process.exit(1);
});

req.write(data);
req.end();

