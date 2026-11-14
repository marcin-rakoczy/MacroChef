#!/usr/bin/env node

/**
 * MacroChef Database Schema Export Script (Node.js / Cross-platform)
 * Exports PostgreSQL/Supabase schema (structure only, no data)
 * 
 * Usage:
 *   node scripts/export-db-schema.js [output-file]
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

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// Configuration
const outputFile = process.argv[2] || `schema-backup-${Date.now()}.sql`;
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

log(colors.yellow, '\n🔄 MacroChef Database Schema Export');
log(colors.yellow, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Validate configuration
if (!dbConfig.host) {
  error('SUPABASE_HOST or DATABASE_URL not set');
}

if (!dbConfig.password) {
  error('SUPABASE_PASSWORD or DATABASE_URL password not set');
}

info(`Configuration:`);
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Output: ${outputFile}\n`);

// Prepare pg_dump command
const pgDumpArgs = [
  `-h ${dbConfig.host}`,
  `-U ${dbConfig.user}`,
  `-d ${dbConfig.database}`,
  `-p ${dbConfig.port}`,
  `--schema-only`,
  `--no-owner`,
  `--no-acl`,
  `--verbose`,
  `--compress=0`,
];

log(colors.yellow, '⏳ Exporting schema...\n');

try {
  // Execute pg_dump
  const env = { ...process.env, PGPASSWORD: dbConfig.password };
  const command = `pg_dump ${pgDumpArgs.join(' ')} > "${outputFile}"`;
  
  console.log(`Command: pg_dump [args] > ${outputFile}\n`);

  // For Windows and Unix compatibility
  if (process.platform === 'win32') {
    // Windows: use cmd
    execSync(command, { 
      env,
      stdio: 'inherit',
      shell: true 
    });
  } else {
    // Unix: use bash
    execSync(command, { 
      env,
      stdio: 'inherit',
      shell: '/bin/bash'
    });
  }

  // Verify file was created
  if (fs.existsSync(outputFile)) {
    const stats = fs.statSync(outputFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    success(`Schema exported successfully`);
    console.log(`   File: ${outputFile}`);
    console.log(`   Size: ${sizeKB} KB\n`);
    
    info(`File contains:`);
    console.log(`   • Table definitions`);
    console.log(`   • Indexes`);
    console.log(`   • Triggers`);
    console.log(`   • Functions`);
    console.log(`   • Row Level Security policies`);
    console.log(`   • NO data rows\n`);
    
    info(`Next steps:`);
    console.log(`   1. Review the exported schema`);
    console.log(`   2. Use scripts/import-db-schema.js to restore`);
    console.log(`   3. Commit to version control (optional)\n`);
  } else {
    error('Export file was not created');
  }
} catch (err) {
  error(`Export failed: ${err.message}`);
}
