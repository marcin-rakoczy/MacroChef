# Database Schema Backup & Restore Scripts

## Overview

These scripts allow you to export and import MacroChef database schema (structure only, **without data**) for backup, testing, and development purposes.

**New in this version:**
- 🚀 **Quick backup script** (`backup-db-schema.js`) - One command backups with automatic versioning & timestamping
- 📝 **Quick examples guide** ([BACKUP_EXAMPLES.md](./BACKUP_EXAMPLES.md)) - Common workflows and troubleshooting
- 🔧 Both Node.js (Windows/macOS/Linux) and Bash (macOS/Linux) versions available

---

## Quick Start (Recommended)

For most use cases, use the quick backup script:

```bash
# Set your database connection
export DATABASE_URL='postgresql://postgres:password@host:5432/postgres'

# Create backup
node scripts/backup-db-schema.js prod

# Creates: backups/schema-prod-2026-11-14T15-14-19.sql
```

👉 **[Full examples and workflows here →](./BACKUP_EXAMPLES.md)**

---

## Scripts Available

### 0. **backup-db-schema.js** (Node.js - Recommended for Quick Backups)
Creates timestamped schema backups automatically.

**Usage:**
```bash
node scripts/backup-db-schema.js [environment-name]
```

**Features:**
- ✅ Automatic timestamping (creates: `schema-{env}-{timestamp}.sql`)
- ✅ Versioning support (great for disaster recovery)
- ✅ Latest symlink (keeps `schema-{env}-latest.sql` up to date)
- ✅ Size reporting and recent backup listing
- ✅ Cross-platform (Windows, macOS, Linux)

**Examples:**
```bash
# Quick backup for production
DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js prod

# Backup for testing
DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js test

# Backup with custom label (useful for versioning)
DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js v1.0.0
```

**Output:**
```
📦 MacroChef Database Schema Backup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Environment: prod
ℹ️  Backup file: backups/schema-prod-2026-11-14T15-14-19.sql
   Host: db.supabase.co
   Database: postgres
   User: postgres

⏳ Creating backup...

✅ Backup created successfully
   File: backups/schema-prod-2026-11-14T15-14-19.sql
   Size: 42.50 KB

ℹ️  Latest link: backups/schema-prod-latest.sql

ℹ️  Recent backups for 'prod':
   1. schema-prod-2026-11-14T15-14-19.sql (42 KB, 2026-11-14 15:14:19)
   2. schema-prod-2026-11-13T10-22-34.sql (42 KB, 2026-11-13 10:22:34)

ℹ️  Next steps:
   1. Restore with: node scripts/import-db-schema.js backups/schema-prod-2026-11-14T15-14-19.sql
   2. Commit backup: git add backups/schema-prod-2026-11-14T15-14-19.sql
   3. Track versions for disaster recovery
```

---

### 0b. **backup-db-schema.sh** (Bash - Quick Backups for Linux/macOS)
Same as above, native bash implementation.

**Usage:**
```bash
./scripts/backup-db-schema.sh [environment-name]
```

**Example:**
```bash
DATABASE_URL='postgresql://...' ./scripts/backup-db-schema.sh prod
```

---

### 1. **export-db-schema.js** (Node.js - Cross-platform)
Exports PostgreSQL/Supabase schema to a SQL file.

**Usage:**
```bash
node scripts/export-db-schema.js [output-file]
```

**Environment Variables:**
```bash
# Option 1: Full database URL
export DATABASE_URL='postgresql://user:password@host:port/dbname'

# Option 2: Separate variables
export SUPABASE_HOST='db.supabase.co'
export SUPABASE_PORT='5432'
export SUPABASE_DB='postgres'
export SUPABASE_USER='postgres'
export SUPABASE_PASSWORD='your-password'
```

**Example:**
```bash
# Using full URL
DATABASE_URL='postgresql://postgres:password@db.supabase.co:5432/postgres' \
node scripts/export-db-schema.js schema-backup.sql

# Using separate variables
SUPABASE_HOST='db.supabase.co' \
SUPABASE_PASSWORD='your-password' \
node scripts/export-db-schema.js schema-$(date +%Y%m%d_%H%M%S).sql

# Default output file name
node scripts/export-db-schema.js
# Creates: schema-backup-1731601234567.sql
```

**What's Exported:**
- ✅ Table definitions (CREATE TABLE)
- ✅ Indexes (CREATE INDEX)
- ✅ Triggers (CREATE TRIGGER)
- ✅ Functions (CREATE FUNCTION)
- ✅ Row Level Security policies (CREATE POLICY)
- ❌ **NO data rows** (schema only)

---

### 2. **import-db-schema.js** (Node.js - Cross-platform)
Imports PostgreSQL/Supabase schema from a SQL file.

**⚠️ WARNING: This will DROP and RECREATE all tables! All data will be lost.**

**Usage:**
```bash
node scripts/import-db-schema.js <schema-file>
```

**Environment Variables:**
Same as export-db-schema.js - either `DATABASE_URL` or separate variables.

**Example:**
```bash
# Import from file
DATABASE_URL='postgresql://postgres:password@db.supabase.co:5432/postgres' \
node scripts/import-db-schema.js schema-backup.sql

# You'll be prompted to confirm
# Type "yes" to proceed, anything else to cancel
```

**What Happens:**
1. Drops all existing tables
2. Recreates tables from exported schema
3. Recreates all indexes, triggers, functions
4. Re-enables Row Level Security
5. Database is empty but structure is intact

---

### 3. **export-db-schema.sh** (Bash - Linux/macOS)
Shell script version for Unix-like systems.

**Usage:**
```bash
bash scripts/export-db-schema.sh [output-file]
```

**Environment Variables:**
```bash
export SUPABASE_URL='db.supabase.co'  # hostname only
export SUPABASE_DB_PASSWORD='your-password'
```

---

### 4. **import-db-schema.sh** (Bash - Linux/macOS)
Shell script version for Unix-like systems.

**Usage:**
```bash
bash scripts/import-db-schema.sh <schema-file>
```

**Environment Variables:**
Same as export-db-schema.sh

---

## Quick Start Guide

### On Linux/macOS with Bash

**1. Export Production Schema:**
```bash
export SUPABASE_URL='prod.supabase.co'
export SUPABASE_DB_PASSWORD='your-prod-password'
bash scripts/export-db-schema.sh prod-schema-backup.sql
```

**2. Import to Test Environment:**
```bash
export SUPABASE_URL='test.supabase.co'
export SUPABASE_DB_PASSWORD='your-test-password'
bash scripts/import-db-schema.sh prod-schema-backup.sql
# Type "yes" when prompted
```

### On Windows with Node.js

**1. Export Production Schema:**
```bash
set DATABASE_URL=postgresql://postgres:password@prod.supabase.co:5432/postgres
node scripts/export-db-schema.js prod-schema-backup.sql
```

**2. Import to Test Environment:**
```bash
set DATABASE_URL=postgresql://postgres:password@test.supabase.co:5432/postgres
node scripts/import-db-schema.js prod-schema-backup.sql
```

### On macOS/Linux with Node.js

**1. Export Production Schema:**
```bash
DATABASE_URL='postgresql://postgres:password@prod.supabase.co:5432/postgres' \
node scripts/export-db-schema.js prod-schema-backup.sql
```

**2. Import to Test Environment:**
```bash
DATABASE_URL='postgresql://postgres:password@test.supabase.co:5432/postgres' \
node scripts/import-db-schema.js prod-schema-backup.sql
```

---

## Common Use Cases

### 1. **Quick Production Backup (Recommended)**

**Simple one-liner:**
```bash
DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js prod
```

**Creates automatic backup in:**
```
backups/schema-prod-2026-11-14T15-14-19.sql
backups/schema-prod-latest.sql (always points to latest)
```

This is the simplest and most commonly used workflow.

---

### 2. **Create Test Database Replica (Schema Only)**

```bash
# Export production schema (using quick backup)
DATABASE_URL='postgresql://user:pass@prod.db:5432/postgres' \
node scripts/backup-db-schema.js prod-backup

# Import to test environment
DATABASE_URL='postgresql://user:pass@test.db:5432/postgres' \
node scripts/import-db-schema.js backups/schema-prod-backup-latest.sql

# Now test DB has same schema but empty
# You can seed test data if needed
```

### 3. **Version Control Schema**

```bash
# Create timestamped backup
DATABASE_URL='postgresql://user:pass@prod.db:5432/postgres' \
node scripts/backup-db-schema.js v1.0.0

# Commit to git
git add backups/schema-v1.0.0*.sql
git commit -m "Archive database schema v1.0.0"

# Later, restore specific version
DATABASE_URL='postgresql://user:pass@dev.db:5432/postgres' \
node scripts/import-db-schema.js backups/schema-v1.0.0-2026-11-14T15-14-19.sql
```

### 4. **Local Development Setup**

```bash
# 1. Quick backup of production schema
DATABASE_URL='postgresql://user:pass@prod.supabase.co:5432/postgres' \
node scripts/backup-db-schema.js prod-copy

# 2. Import to local Postgres
DATABASE_URL='postgresql://postgres:local-password@localhost:5432/postgres' \
node scripts/import-db-schema.js backups/schema-prod-copy-latest.sql

# Local DB now matches production schema!
```

### 5. **Disaster Recovery Workflow**

```bash
# Daily backups via cron/scheduler
DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js daily

# If disaster strikes
ls backups/schema-daily-*.sql  # Find a good backup

# Restore from last known good backup
DATABASE_URL='postgresql://user:pass@recovered.db:5432/postgres' \
node scripts/import-db-schema.js backups/schema-daily-2026-11-10T02-00-00.sql
```

### 6. **Compare Schema Versions**

```bash
# Create two backups
DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js before-migration
# ... do some work ...
DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js after-migration

# Compare files
diff backups/schema-before-migration-latest.sql backups/schema-after-migration-latest.sql
```

---

## Advanced: Detailed Export/Import Scripts

If you need more control, use the original detailed scripts:

**export-db-schema.js** - Advanced options:

# Now developing locally with production schema
```

### 4. **Disaster Recovery**

```bash
# Keep regular backups
node scripts/export-db-schema.js backups/schema-$(date +%Y%m%d).sql

# In case of schema corruption, restore
node scripts/import-db-schema.js backups/schema-20261114.sql
```

---

## Requirements

### For Node.js Scripts (export-db-schema.js, import-db-schema.js)
- **Node.js** ≥ 14.0.0
- **PostgreSQL client tools**: `pg_dump`, `psql` must be in PATH
  - Windows: Install [PostgreSQL](https://www.postgresql.org/download/windows/)
  - macOS: `brew install postgresql`
  - Linux: `apt-get install postgresql-client`

### For Bash Scripts (export-db-schema.sh, import-db-schema.sh)
- **Bash** ≥ 4.0
- **PostgreSQL client tools**: `pg_dump`, `psql` must be in PATH
- Linux/macOS only (Windows needs WSL or Git Bash)

### Database Access
- Valid Supabase/PostgreSQL credentials
- Network access to database host
- Sufficient permissions (can create/drop tables)

---

## Troubleshooting

### "pg_dump not found"
**Solution:** Install PostgreSQL client tools
- Windows: https://www.postgresql.org/download/windows/
- macOS: `brew install postgresql`
- Linux: `sudo apt-get install postgresql-client`

### "FATAL: password authentication failed"
**Solution:** Verify credentials
```bash
# Test connection manually
psql -h your-host -U postgres -d postgres

# Check environment variables
echo $DATABASE_URL
echo $SUPABASE_PASSWORD
```

### "Permission denied" during import
**Solution:** User needs higher privileges
```bash
# Add privileges to user (in Supabase SQL Editor)
ALTER USER postgres CREATEDB CREATEROLE;
```

### "cannot drop table" errors
**Solution:** This is normal - it means schema already exists
The script will recreate it. Look for "successfully" message at the end.

### File size is very large (>10 MB)
**Solution:** Check if data was accidentally exported
```bash
# Verify file contains only schema
grep "INSERT INTO" schema-backup.sql | wc -l
# Should return: 0 (or very few)
```

---

## File Naming Convention

**With quick backup script (Recommended):**
```
backups/schema-{environment}-{timestamp}.sql
backups/schema-{environment}-latest.sql

Examples:
backups/schema-prod-2026-11-14T15-14-19.sql
backups/schema-prod-latest.sql
backups/schema-v1.0.0-2026-11-14T15-14-19.sql
```

**For manual export scripts:**
```
schema-backup-YYYYMMDD_HHMMSS.sql
schema-v{version}.sql
schema-{environment}-{date}.sql

Examples:
schema-backup-20261114_153000.sql
schema-v1.0.0.sql
schema-production-20261114.sql
schema-test-20261114.sql
```

---

## Git Integration

### Add backups to .gitignore
```bash
# Don't commit all backups
backups/*.sql

# But keep version-tagged backups
!backups/schema-v*.sql
```

### Or commit versioned backups
```bash
# Track schema versions in git
git add backups/schema-v1.0.0*.sql
git commit -m "Archive database schema v1.0.0"
```

---

## Security Notes

⚠️ **Never commit database credentials to Git!**

Instead, use environment variables or `.env` files (which should be in .gitignore):

```bash
# .env (add to .gitignore)
DATABASE_URL=postgresql://user:password@host:5432/db

# Load before running scripts
source .env
node scripts/backup-db-schema.js prod
```

---

## Performance Tips

### Backup (Export)
- File size: Usually 10-500 KB (no data)
- Typical time: 1-5 seconds
- Faster than data export by orders of magnitude

### Restore (Import)
- Dropping/recreating tables: 1-10 seconds typically
- Very fast with no data to import
- If slow: Check network latency to database

### Optimization
For very large schemas:
```bash
# Use native pg_dump directly with custom options
pg_dump -h host -U user -d db --schema-only --no-comments > schema.sql
```

---

## Advanced Usage

### Export specific schema
```bash
# PostgreSQL supports multiple schemas
# By default, exports 'public' schema
# To export other schemas:

# Export all schemas
pg_dump -h host -U user -d db --schema-only > schema-all.sql

# Export specific schema
pg_dump -h host -U user -d db --schema-only -n public > schema-public.sql
```

### Dry run (test without applying)
```bash
# Just create backup, don't import
node scripts/backup-db-schema.js test-run

# Review the file
cat backups/schema-test-run-latest.sql | head -100

# Only import if satisfied
node scripts/import-db-schema.js backups/schema-test-run-latest.sql
```

### Automated daily backups
```bash
# macOS/Linux - Add to crontab
0 2 * * * cd /path/to/MacroChef && DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js daily

# Windows - Task Scheduler
# Create task running: node scripts/backup-db-schema.js daily
```

---

## Support & Resources

### Quick Start
👉 **[Common workflows and examples →](./BACKUP_EXAMPLES.md)**

### Troubleshooting
1. Check requirements above
2. Verify database connectivity with `psql` command
3. Review error message carefully
4. Check file permissions (is schema file readable?)
5. Ensure pg_dump/psql versions match PostgreSQL version

### Related Documentation
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [PostgreSQL pg_dump Manual](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL psql Manual](https://www.postgresql.org/docs/current/app-psql.html)
- [MacroChef Database Schema](../supabase/migrations/20261113210000_initial_schema.sql)

---

**Last Updated:** 2026-11-14  
**Tested On:** PostgreSQL 12+, Supabase  
**Scripts Version:** 2.0.0 (with quick backup scripts)
