# Database SQL Migrations

This directory contains all PostgreSQL/Supabase SQL migration and utility scripts.

## Files

### Schema Initialization
- **`001_init_schema.sql`** - Complete DDL schema initialization (idempotent)
  - Tables: user_profiles, products, recipes, planner, goals
  - Functions: set_updated_at()
  - Triggers: Automatic timestamp management & profile creation
  - RLS: Row Level Security policies on all tables
  - Usage: Run once on fresh Supabase project
  - 📖 [Detailed Documentation](./001_INIT_SCHEMA_README.md)

### Verification & Testing
- **`verify_rls_policies.sql`** - Verify and test RLS policies
  - Check RLS is enabled on all tables
  - Query policies for each table
  - Test permission enforcement
  - Usage: Run after schema creation to verify setup

## Running Migrations

### In Supabase Dashboard
1. Go to SQL Editor → New Query
2. Copy & paste script content
3. Click Run

### Via psql
```bash
psql -d $DATABASE_URL -f docs/sql/001_init_schema.sql
```

### Via Supabase CLI
```bash
supabase db push
```

## Migration Strategy

**Naming Convention:** `XXX_description.sql`
- `001_init_schema.sql` - Initial schema
- `002_seed_products.sql` - Product catalog seed data (to be created)
- `003_seed_recipes.sql` - Default recipes seed data (to be created)
- `004_add_feature_x.sql` - Any future schema changes

## Important Notes

- ✅ All scripts are **idempotent** (safe to run multiple times)
- ✅ Use `DROP IF EXISTS` before CREATE to prevent errors
- ❌ Do NOT directly edit deployed schemas - always create new migration files
- ✅ Test migrations on TEST database before running on PROD
- ✅ Keep version control history of all migrations

## Backup & Restore

To backup current schema structure:
```bash
node scripts/backup-db-schema.js prod
```

See [Database Backup & Restore](../DATABASE_BACKUP_RESTORE.md) for details.

## Related Documentation

- [Database Schema Initialization](./001_INIT_SCHEMA_README.md)
- [Database Backup & Restore](../DATABASE_BACKUP_RESTORE.md)
- [RLS Policy Implementation](../ISSUE_3_RLS_IMPLEMENTATION.md)

---

**Last Updated:** 2026-11-14
