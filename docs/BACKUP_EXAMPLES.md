# Database Backup & Restore - Quick Examples

## Prerequisites

Make sure you have PostgreSQL client tools installed:

### Windows
```bash
# Download from: https://www.postgresql.org/download/windows/
# Or use Chocolatey
choco install postgresql
```

### macOS
```bash
brew install postgresql
```

### Linux
```bash
sudo apt-get install postgresql-client
```

Verify installation:
```bash
pg_dump --version
psql --version
```

---

## Quick Start - Create Your First Backup

### 1. Get Your Database Credentials

For **Supabase**, go to:
1. Project Settings → Database → Connection strings
2. Copy the connection string (looks like: `postgresql://postgres:password@db.supabase.co:5432/postgres`)

### 2. Create Backup (Node.js - All Platforms)

**On Windows (PowerShell/CMD):**
```bash
# Set environment variable
$env:DATABASE_URL = "postgresql://postgres:your-password@your-host:5432/postgres"

# Create backup
node scripts/backup-db-schema.js prod

# Creates: backups/schema-prod-2026-11-14T15-14-19.sql
```

**On macOS/Linux (Bash):**
```bash
# Set environment variable
export DATABASE_URL="postgresql://postgres:your-password@your-host:5432/postgres"

# Create backup
node scripts/backup-db-schema.js prod

# Creates: backups/schema-prod-2026-11-14T15-14-19.sql
```

### 3. Verify Backup

```bash
# Check file was created
ls backups/schema-prod*.sql

# Check size (should be small, 10-500 KB)
du -h backups/schema-prod-latest.sql

# Verify it contains schema only (not data)
grep -i "INSERT INTO" backups/schema-prod-latest.sql | wc -l
# Should output: 0 or very small number
```

---

## Common Workflows

### Workflow 1: Backup Production, Restore to Local

**Step 1: Backup production schema**
```bash
export DATABASE_URL="postgresql://postgres:prod-password@prod.supabase.co:5432/postgres"
node scripts/backup-db-schema.js prod

# Output: backups/schema-prod-2026-11-14T15-14-19.sql
```

**Step 2: Restore to local Postgres**
```bash
export DATABASE_URL="postgresql://postgres:local-password@localhost:5432/postgres"
node scripts/import-db-schema.js backups/schema-prod-2026-11-14T15-14-19.sql

# Type "yes" when prompted
# Your local DB now has same schema as production!
```

### Workflow 2: Create Test Database

**Step 1: Backup production**
```bash
export DATABASE_URL="postgresql://postgres:prod-pass@prod.db:5432/postgres"
node scripts/backup-db-schema.js production
```

**Step 2: Restore to test environment**
```bash
export DATABASE_URL="postgresql://postgres:test-pass@test.db:5432/postgres"
node scripts/import-db-schema.js backups/schema-production-latest.sql
```

**Step 3: Test changes safely**
```bash
# Make schema changes on test DB
# If everything works, apply to production
# If fails, restore from backup and try again
```

### Workflow 3: Disaster Recovery

**Create regular backups (daily):**
```bash
# Add to cron job or scheduled task
node scripts/backup-db-schema.js prod

# OR create backup with specific name
node scripts/backup-db-schema.js backup-$(date +%Y%m%d)
```

**In case of emergency:**
```bash
# List available backups
ls backups/

# Restore from specific backup
export DATABASE_URL="postgresql://postgres:password@host:5432/postgres"
node scripts/import-db-schema.js backups/schema-prod-2026-11-10T14-30-45.sql

# Confirm with "yes"
```

### Workflow 4: Version Control Schema

**Store schema in Git:**
```bash
# Create backup with version number
export DATABASE_URL="postgresql://postgres:password@host:5432/postgres"
node scripts/backup-db-schema.js v1.0.0

# Commit to repository
git add backups/schema-v1.0.0*.sql
git commit -m "Add database schema v1.0.0"
git push
```

**Later, restore specific version:**
```bash
export DATABASE_URL="postgresql://postgres:password@host:5432/postgres"
node scripts/import-db-schema.js backups/schema-v1.0.0-2026-11-14T15-14-19.sql
```

---

## Using with Full Connection URL

If you prefer to pass the full URL:

**Windows:**
```bash
set DATABASE_URL=postgresql://postgres:password@host:5432/postgres
node scripts/backup-db-schema.js myenv
```

**macOS/Linux:**
```bash
DATABASE_URL='postgresql://postgres:password@host:5432/postgres' \
node scripts/backup-db-schema.js myenv
```

---

## Using Separate Environment Variables

**Windows:**
```bash
set SUPABASE_HOST=db.supabase.co
set SUPABASE_PORT=5432
set SUPABASE_DB=postgres
set SUPABASE_USER=postgres
set SUPABASE_PASSWORD=your-password

node scripts/backup-db-schema.js prod
```

**macOS/Linux:**
```bash
export SUPABASE_HOST='db.supabase.co'
export SUPABASE_PORT='5432'
export SUPABASE_DB='postgres'
export SUPABASE_USER='postgres'
export SUPABASE_PASSWORD='your-password'

node scripts/backup-db-schema.js prod
```

---

## Advanced: Direct Export Commands

If you prefer using `pg_dump` directly (without scripts):

**Export only schema:**
```bash
PGPASSWORD=your-password pg_dump \
  -h db.supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  --no-owner \
  --no-acl \
  > schema-backup.sql
```

**Export with specific schema:**
```bash
PGPASSWORD=your-password pg_dump \
  -h db.supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  -n public \
  > schema-public.sql
```

**Restore:**
```bash
PGPASSWORD=your-password psql \
  -h db.supabase.co \
  -U postgres \
  -d postgres \
  -f schema-backup.sql
```

---

## Troubleshooting

### "pg_dump: command not found"
**Solution:** PostgreSQL is not in PATH
- Windows: Reinstall PostgreSQL, ensure "Add to PATH" is checked
- macOS: `brew install postgresql`
- Linux: `sudo apt-get install postgresql-client`

### "FATAL: password authentication failed"
**Solution:** Check credentials
```bash
# Test connection manually
psql -h your-host -U postgres -d postgres

# Verify environment variable
echo $DATABASE_URL
```

### "Cannot drop table" errors during import
**Solution:** This is normal! The script is recreating tables. Look for "successfully" at the end.

### Backup file is 100+ MB
**Solution:** You might have exported data accidentally
```bash
# Check file size
du -h backups/schema*.sql

# Verify no data was exported
grep -i "INSERT INTO" backups/schema*.sql | head -5

# If you see INSERT statements, re-export with --schema-only flag
```

### Port number issues
**Solution:** Supabase often uses port 5432 or custom port. Check in:
- Supabase Project Settings → Database
- Connection string shows the port: `postgresql://user:pass@host:PORT/db`

---

## Backup File Names

**Recommended naming:**
```
schema-{environment}-{timestamp}.sql
schema-{environment}-latest.sql (symlink to latest)

Examples:
backups/schema-prod-2026-11-14T15-14-19.sql
backups/schema-prod-latest.sql
backups/schema-test-2026-11-14T15-14-19.sql
backups/schema-v1.0.0-2026-11-14T15-14-19.sql
```

---

## Automating Backups

### Linux/macOS - Cron Job

Add to crontab: `crontab -e`
```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/MacroChef && DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js daily >> backups/backup.log 2>&1

# Weekly backup every Sunday at 3 AM
0 3 * * 0 cd /path/to/MacroChef && DATABASE_URL='postgresql://...' node scripts/backup-db-schema.js weekly >> backups/backup.log 2>&1
```

### Windows - Task Scheduler

1. Open "Task Scheduler"
2. Create Basic Task
3. Set trigger (Daily, Weekly, etc.)
4. Set action to run:
   ```
   C:\Program Files\nodejs\node.exe
   Arguments: C:\path\to\MacroChef\scripts\backup-db-schema.js prod
   Start in: C:\path\to\MacroChef
   ```
5. Set environment: Create `.env` file with DATABASE_URL

---

## Integration with Git

### Ignore large backups
**.gitignore:**
```
# Ignore most backups
backups/*.sql

# But keep versioned backups
!backups/schema-v*.sql
```

### Keep versioned backups in git
```bash
# Backup and commit
export DATABASE_URL='postgresql://...'
node scripts/backup-db-schema.js v1.0.0

git add backups/schema-v1.0.0*.sql
git commit -m "Archive database schema v1.0.0"
git push
```

---

## Security Best Practices

⚠️ **NEVER commit plaintext passwords to Git!**

Instead:

**1. Use `.env` file (add to .gitignore):**
```bash
# .env
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
```

**2. Load environment before running:**
```bash
source .env  # Linux/macOS
# or on Windows: Get-Content .env | ForEach-Object { ... }

node scripts/backup-db-schema.js prod
```

**3. Use CI/CD secrets (for automated backups):**
```yaml
# GitHub Actions
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## What Gets Backed Up?

✅ **Included:**
- Table structures (CREATE TABLE)
- Indexes
- Triggers
- Functions
- Stored procedures
- Row Level Security policies
- Constraints
- Sequences
- Comments

❌ **NOT Included:**
- Data rows (INSERT statements)
- User data
- Application data

---

## Performance

**Typical backup times:**
- Small schema (10 tables): <1 second
- Medium schema (50 tables): 1-3 seconds
- Large schema (200+ tables): 3-10 seconds

**File size:**
- Typical: 10-500 KB
- Large complex schemas: 1-10 MB
- Should never exceed 50 MB (unless data included)

---

## Support & Documentation

- Full docs: [DATABASE_BACKUP_RESTORE.md](../docs/DATABASE_BACKUP_RESTORE.md)
- PostgreSQL docs: https://www.postgresql.org/docs/current/app-pgdump.html
- Supabase docs: https://supabase.com/docs/guides/database

---

**Last Updated:** 2026-11-14
