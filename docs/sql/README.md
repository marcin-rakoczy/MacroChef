# Database SQL Migrations

This directory contains all PostgreSQL/Supabase SQL migration and utility scripts.

## Files

### Schema Initialization
- **`001_init_schema.sql`** - Complete DDL schema initialization (**destructive**)
  - Tables: user_profiles, products, recipes, planner, goals
  - Functions: set_updated_at()
  - Triggers: Automatic timestamp management & profile creation
  - RLS: Row Level Security policies on all tables
  - Usage: Run once on fresh Supabase project
  - 📖 [Detailed Documentation](./001_INIT_SCHEMA_README.md)

### Verification & Testing
- **`rename_non_english_columns.sql`** - Rename the four localized product columns
  - Preserves data, fails on missing columns or name collisions, and is safe to rerun
  - Also included as a forward Supabase migration; `supabase db push` will apply it
  - Back up and test first; apply on TEST before PROD
  - Deploy a compatible client first, then run the migration and refresh PostgREST's schema cache
  - Older clients using the old product column names will fail after the rename; coordinate their upgrade
  - Run this before `verify_rls_policies.sql` on databases using the old columns
- **`verify_rls_policies.sql`** - Harden and verify RLS policies
  - Replaces all existing policies on the five application tables and commits the hardening
  - Preserves admin-only profile role changes through `admin_set_user_role`; profile key is `user_id`
  - Tests Admin and non-Admin access with temporary auth users and rolls the fixtures back
  - Requires a table owner or database administrator; test on TEST and review existing policies before use
  - RLS-denied inserts produce `42501`; denied updates and deletes can instead affect zero rows
  - Usage: `psql -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f docs/sql/verify_rls_policies.sql`

Permission-denied sync writes remain in the outbox and are not automatically retried.
After access is restored, use **Retry sync** in the header to retry them.

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

- ⚠️ `001_init_schema.sql` drops existing tables and data; use it only on a fresh database
- ✅ The RLS hardening script is idempotent, but replaces existing policies on its five tables
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
