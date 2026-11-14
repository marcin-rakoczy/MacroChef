#!/usr/bin/env node

/**
 * MacroChef Database Schema Import Script (Node.js / Cross-platform)
 * Imports PostgreSQL/Supabase schema from exported file
 * 
 * Usage:
 *   node scripts/import-db-schema.js <schema-file>
 * 
 * Environment Variables:
 *   SUPABASE_URL - Full database URL (e.g., postgresql://user:password@host:port/dbname)
 *   or separate:
 *   SUPABASE_HOST - Database host
 *   SUPABASE_PORT - Database port (default: 5432)
 *   SUPABASE_DB - Database name (default: postgres)
 *   SUPABASE_USER - Database user (default: postgres)
 *   SUPABASE_PASSWORD - Database password
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(colors.red, `❌ Error: ${message}`);
  process.exit(1);
}

function warning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function info(message) {
  log(colors.yellow, `ℹ️  ${message}`);
}

async function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Configuration
const schemaFile = process.argv[2];
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseFullUrl = process.env.DATABASE_URL || supabaseUrl;

let dbConfig = {
  host: process.env.SUPABASE_HOST,
  port: process.env.SUPABASE_PORT || 5432,
  database: process.env.SUPABASE_DB || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres',
  password: process.env.SUPABASE_PASSWORD,
};

// Parse full database URL if provided
if (supabaseFullUrl && supabaseFullUrl.startsWith('postgresql://')) {
  const url = new URL(supabaseFullUrl);
  dbConfig.host = url.hostname;
  dbConfig.port = url.port || 5432;
  dbConfig.database = url.pathname.slice(1);
  dbConfig.user = url.username;
  dbConfig.password = url.password;
}

log(colors.yellow, '\n🔄 MacroChef Database Schema Import');
log(colors.yellow, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Validate arguments
if (!schemaFile) {
  error('Schema file not provided. Usage: node scripts/import-db-schema.js <schema-file>');
}

if (!fs.existsSync(schemaFile)) {
  error(`File not found: ${schemaFile}`);
}

// Validate configuration
if (!dbConfig.host) {
  error('SUPABASE_HOST or DATABASE_URL not set');
}

if (!dbConfig.password) {
  error('SUPABASE_PASSWORD or DATABASE_URL password not set');
}

const stats = fs.statSync(schemaFile);
const sizeKB = (stats.size / 1024).toFixed(2);

info(`Configuration:`);
console.log(`   Schema File: ${schemaFile}`);
console.log(`   File Size: ${sizeKB} KB`);
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}\n`);

// Confirmation
(async () => {
  warning(`This will DROP and RECREATE all tables!`);
  log(colors.blue, `   All existing data will be LOST!\n`);

  const shouldContinue = await confirm('Are you sure? (type "yes" to continue): ');

  if (!shouldContinue) {
    log(colors.yellow, '⏸️  Import cancelled\n');
    process.exit(0);
  }

  log(colors.yellow, '⏳ Importing schema...\n');

  try {
    // Read schema file
    const schemaContent = fs.readFileSync(schemaFile, 'utf8');

    // Prepare psql command
    const psqlArgs = [
      `-h ${dbConfig.host}`,
      `-U ${dbConfig.user}`,
      `-d ${dbConfig.database}`,
      `-p ${dbConfig.port}`,
      `--set ON_ERROR_STOP=on`,
      `-f "${schemaFile}"`,
    ];

    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    const command = `psql ${psqlArgs.join(' ')}`;

    console.log(`Command: psql [args] -f ${schemaFile}\n`);

    // Execute psql
    if (process.platform === 'win32') {
      // Windows: use cmd
      execSync(command, {
        env,
        stdio: 'inherit',
        shell: true,
      });
    } else {
      // Unix: use bash
      execSync(command, {
        env,
        stdio: 'inherit',
        shell: '/bin/bash',
      });
    }

    success(`Schema imported successfully\n`);

    info(`Verification:`);
    console.log(`   Run this query to verify tables:`);
    console.log(`   psql -h ${dbConfig.host} -U ${dbConfig.user} -d ${dbConfig.database} -c '\\dt'\n`);

    info(`Next steps:`);
    console.log(`   1. Verify tables and indexes`);
    console.log(`   2. Check RLS policies are in place`);
    console.log(`   3. Run application tests`);
    console.log(`   4. Import seed data (if needed)\n`);
  } catch (err) {
    error(`Import failed: ${err.message}`);
  }
})();
