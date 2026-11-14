#!/usr/bin/env node

/**
 * MacroChef Quick Database Backup Script
 * Creates dated schema backups in backups/ directory
 * 
 * Usage:
 *   node scripts/backup-db-schema.js
 *   node scripts/backup-db-schema.js prod
 *   node scripts/backup-db-schema.js test
 *   node scripts/backup-db-schema.js my-project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(colors.reset, `❌ Error: ${message}`);
  process.exit(1);
}

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function info(message) {
  log(colors.yellow, `ℹ️  ${message}`);
}

// Get environment or use argument
const env = process.argv[2] || 'default';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
const backupDir = 'backups';

// Create backups directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  info(`Created backup directory: ${backupDir}/`);
}

// Get database credentials from environment
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL;
const supabasePassword = process.env.SUPABASE_PASSWORD;

let dbConfig = {
  host: process.env.SUPABASE_HOST,
  port: process.env.SUPABASE_PORT || 5432,
  database: process.env.SUPABASE_DB || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres',
  password: supabasePassword,
};

// Parse full database URL if provided
if (supabaseUrl && supabaseUrl.startsWith('postgresql://')) {
  const url = new URL(supabaseUrl);
  dbConfig.host = url.hostname;
  dbConfig.port = url.port || 5432;
  dbConfig.database = url.pathname.slice(1);
  dbConfig.user = url.username;
  dbConfig.password = url.password;
}

// Backup filename
const backupFile = path.join(backupDir, `schema-${env}-${timestamp}.sql`);

log(colors.yellow, '\n📦 MacroChef Database Schema Backup');
log(colors.yellow, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

info(`Environment: ${env}`);
info(`Backup file: ${backupFile}`);
console.log(`   Host: ${dbConfig.host || 'Not configured'}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}\n`);

// Validate configuration
if (!dbConfig.host) {
  error('Database host not configured. Set SUPABASE_HOST or DATABASE_URL');
}

if (!dbConfig.password) {
  error('Database password not configured. Set SUPABASE_PASSWORD or DATABASE_URL');
}

// Run export
log(colors.yellow, '⏳ Creating backup...\n');

try {
  const pgDumpArgs = [
    `-h ${dbConfig.host}`,
    `-U ${dbConfig.user}`,
    `-d ${dbConfig.database}`,
    `-p ${dbConfig.port}`,
    `--schema-only`,
    `--no-owner`,
    `--no-acl`,
    `--compress=0`,
  ];

  const env_vars = { ...process.env, PGPASSWORD: dbConfig.password };
  const command = `pg_dump ${pgDumpArgs.join(' ')} > "${backupFile}"`;

  if (process.platform === 'win32') {
    execSync(command, { env: env_vars, stdio: 'inherit', shell: true });
  } else {
    execSync(command, { env: env_vars, stdio: 'inherit', shell: '/bin/bash' });
  }

  // Verify backup was created
  if (fs.existsSync(backupFile)) {
    const stats = fs.statSync(backupFile);
    const sizeKB = (stats.size / 1024).toFixed(2);

    success(`Backup created successfully`);
    console.log(`   File: ${backupFile}`);
    console.log(`   Size: ${sizeKB} KB\n`);

    // Create latest symlink/copy
    const latestFile = path.join(backupDir, `schema-${env}-latest.sql`);
    try {
      if (fs.existsSync(latestFile)) {
        fs.unlinkSync(latestFile);
      }
      fs.copyFileSync(backupFile, latestFile);
      info(`Latest link: ${latestFile}`);
    } catch (e) {
      // Symlink might not work on all systems, that's ok
    }

    // List recent backups
    console.log();
    info(`Recent backups for '${env}':`);
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith(`schema-${env}-`) && f.endsWith('.sql'))
      .sort()
      .reverse()
      .slice(0, 5);

    if (backups.length > 0) {
      backups.forEach((backup, index) => {
        const fullPath = path.join(backupDir, backup);
        const stats = fs.statSync(fullPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        const mtime = stats.mtime.toLocaleString();
        console.log(`   ${index + 1}. ${backup} (${sizeKB} KB, ${mtime})`);
      });
    }

    console.log();
    info(`Next steps:`);
    console.log(`   1. Restore with: node scripts/import-db-schema.js ${backupFile}`);
    console.log(`   2. Commit backup: git add ${backupFile}`);
    console.log(`   3. Track versions for disaster recovery\n`);
  } else {
    error('Backup file was not created');
  }
} catch (err) {
  error(`Backup failed: ${err.message}`);
}
