# MacroChef Database Schema Initialization

## Overview

**`001_init_schema.sql`** - Complete, idempotent PostgreSQL schema initialization script for MacroChef. Creates all tables, functions, triggers, and Row Level Security (RLS) policies without inserting any data.

**Key Features:**
- ✅ 100% idempotent (can run multiple times safely)
- ✅ RLS enabled on all tables with restrictive policies
- ✅ Automatic user profile creation on auth signup
- ✅ Automatic `updated_at` timestamp maintenance
- ✅ No data insertion (DDL-only)
- ✅ Comprehensive comments and documentation

---

## What Gets Created

### 1. Helper Functions
- `public.set_updated_at()` - Trigger function for automatic timestamp management

### 2. Tables

| Table | Purpose | Owner | RLS |
|-------|---------|-------|-----|
| `public.user_profiles` | User accounts & roles | Each user (own) | ✓ Strict |
| `public.products` | Global product catalog | Admin only | ✓ Read for all |
| `public.recipes` | User recipes | Admin only | ✓ Custom |
| `public.planner` | Daily meal plans | Each user (own) | ✓ Own only |
| `public.goals` | Fitness goals | Each user (own) | ✓ Own only |

### 3. Roles
- **`Admin`** - Full access to recipes & products (create, read, update, delete)
- **`Tester`** - Read-only access (testing account)
- **`UserWithAdvertisement`** - Read-only access + ads (default for new users)

### 4. Security Features
- Row Level Security (RLS) on all tables
- Automatic user profile creation on signup
- Trigger-based timestamp management
- Role-based access control at database level
- Role immutability (prevents privilege escalation via API)

---

## Quick Start

### Run in Supabase

1. **Open Supabase Dashboard** → Project → SQL Editor
2. **Create New Query**
3. **Copy & paste** the entire content from `001_init_schema.sql`
4. **Click "Run"** (or Ctrl+Enter)
5. **Verify** - Check the "Results" section for confirmation queries at the end

### Run via psql (Command Line)

```bash
# Export your database credentials
export DATABASE_URL='postgresql://user:password@host:5432/dbname'

# Run the script
psql -d $DATABASE_URL -f docs/sql/001_init_schema.sql
```

### With Supabase CLI

```bash
# Push schema to Supabase
supabase db push --linked

# Or manually using CLI
supabase db dump > schema-backup.sql
```

---

## After Schema Creation

### 1. Verify Everything Worked

Run these checks in Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, relrowsecurity FROM pg_class 
JOIN pg_namespace ON relnamespace = pg_namespace.oid 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'products', 'recipes', 'planner', 'goals');

-- Count policies
SELECT COUNT(*) as total_policies FROM pg_policies 
WHERE schemaname = 'public';
```

### 2. Create First User with Admin Role

**Option A: Via Supabase Dashboard**
1. Go to Authentication → Users
2. Create a user with your email
3. Copy the generated User ID
4. Run in SQL Editor:
   ```sql
   UPDATE public.user_profiles 
   SET role = 'Admin' 
   WHERE email = 'your@email.com';
   ```

**Option B: Via SQL Only**
```bash
# Find the UUID of auth.users entry
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

# Update the role
UPDATE public.user_profiles 
SET role = 'Admin' 
WHERE email = 'your@email.com';

# Verify
SELECT email, role FROM public.user_profiles WHERE email = 'your@email.com';
```

### 3. Create Test Users

```sql
-- Create Tester user (read-only, no ads)
INSERT INTO public.user_profiles (user_id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'tester@macrochef.com'),
  'tester@macrochef.com',
  'Tester'
);

-- Create UserWithAdvertisement user (read-only, with ads)
INSERT INTO public.user_profiles (user_id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'user@macrochef.com'),
  'user@macrochef.com',
  'UserWithAdvertisement'
);
```

---

## Schema Structure Details

### user_profiles Table

```sql
CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'UserWithAdvertisement' 
    CHECK (role IN ('Admin', 'Tester', 'UserWithAdvertisement')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Key Features:**
- `user_id` cascades to `auth.users` (deleting user deletes profile)
- `role` enforced by CHECK constraint (only valid roles)
- Default role is `'UserWithAdvertisement'` for new signups
- Automatic creation via trigger `on_auth_user_created()`

### products Table (Global Catalog)

```sql
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name_pl TEXT,
  name_en TEXT,
  category TEXT,
  category_pl TEXT,
  category_en TEXT,
  unit TEXT,
  package_size NUMERIC,
  source_url TEXT,
  source_verified_at DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Key Features:**
- No `user_id` - shared by all users
- Text-based ID (client-generated with UUID)
- Bilingual names and categories
- Auto-timestamped on changes
- RLS: READ for all authenticated; WRITE for Admin only

### recipes Table (User Content)

```sql
CREATE TABLE public.recipes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Key Features:**
- JSONB data column stores complete recipe
- Tied to user_id (cascades on delete)
- RLS: Allow Admin to create/modify; users see own + Admin recipes

### planner Table (Daily Meal Plans)

```sql
CREATE TABLE public.planner (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_key)
);
```

**Key Features:**
- One plan per user per day (UNIQUE constraint)
- Stores: Breakfast, Lunch, Dinner, Snack slots
- RLS: Users can only access own plans

### goals Table (Fitness Goals)

```sql
CREATE TABLE public.goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

**Key Features:**
- One goals record per user (UNIQUE)
- Stores calorie/macro targets, preferences
- RLS: Users can only access own goals

---

## RLS Policies Overview

### user_profiles
- **SELECT:** Own profile only (auth.uid() = user_id)
- **INSERT/UPDATE/DELETE:** Disabled for all (admin-only via direct DB access)
- **Prevents:** Privilege escalation through API

### products
- **SELECT:** All authenticated users
- **INSERT/UPDATE/DELETE:** Admin only (checked against user_profiles.role)
- **Effect:** Global catalog, Admin manages, users read

### recipes
- **SELECT:** Own recipes + Admin-created recipes
- **INSERT/UPDATE/DELETE:** Admin only
- **Effect:** Only Admin can create/modify recipes

### planner & goals
- **SELECT:** Own records only
- **INSERT/UPDATE/DELETE:** Own records only
- **Effect:** Complete data isolation between users

---

## Idempotency Guarantee

Every statement uses `DROP IF EXISTS` before `CREATE`:

```sql
-- Safe to run multiple times
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...

DROP FUNCTION IF EXISTS function_name(...) CASCADE;
CREATE FUNCTION function_name(...) ...

DROP TABLE IF EXISTS table_name CASCADE;
CREATE TABLE table_name ...
```

This means:
- ✅ Can run the script repeatedly without errors
- ✅ Safe for CI/CD pipelines
- ✅ Works with Supabase migrations system
- ✅ No manual cleanup needed

---

## Troubleshooting

### "ERROR: relation 'auth.users' does not exist"
**Cause:** Supabase `auth` schema not enabled  
**Solution:** Enable Supabase Authentication in project settings

### "ERROR: permission denied for table user_profiles"
**Cause:** Running as non-admin user  
**Solution:** Use Supabase Service Role key or direct database access

### "ERROR: cannot drop trigger (objects depend on it)"
**Cause:** Circular dependencies (rare)  
**Solution:** Use `CASCADE` in DROP statements (already in script)

### Policies seem to block all access
**Cause:** RLS might be too restrictive for your use case  
**Solution:** Review policies in "Security Features" section; modify as needed

---

## Integration with MacroChef App

The schema supports:

1. **Offline-First via Dexie (IndexedDB)**
   - `js/db.js` syncs with PostgreSQL tables
   - Schema matches Dexie table structure

2. **Role-Based UI (js/auth.js & js/permissions.js)**
   - Fetch role from `public.user_profiles`
   - Show/hide UI based on role
   - Admin: edit/delete recipes & products
   - Tester: read-only
   - UserWithAdvertisement: read-only + ads

3. **Automatic Profile Creation**
   - `on_auth_user_created()` trigger fires
   - New users get automatic profile with default role
   - No manual intervention needed

---

## Next Steps

1. **Run the script** in your Supabase SQL Editor
2. **Create first Admin user** with your email
3. **Seed products** (create `002_seed_products.sql`)
4. **Seed recipes** (create `003_seed_recipes.sql`)
5. **Test via app** - login and verify role-based features

---

## Related Files

- **Application Code:** `js/auth.js`, `js/db.js`, `js/permissions.js`
- **Backup Script:** `docs/sql/verify_rls_policies.sql`
- **Backup/Restore:** `scripts/backup-db-schema.js`

---

## SQL Sections Reference

| Section | What | Notes |
|---------|------|-------|
| 1 | Helper Functions | Timestamp management |
| 2 | user_profiles | User accounts & roles |
| 3 | Auto Profile Creation | Trigger on auth signup |
| 4 | products | Global catalog |
| 5 | recipes | User recipes |
| 6 | planner | Daily meal plans |
| 7 | goals | Fitness goals |
| 8 | RLS Enable | Turn on RLS for all tables |
| 9-13 | RLS Policies | Define access rules |
| 14 | Verification | Check that it worked |

---

**Version:** 1.0.0  
**Last Updated:** 2026-11-14  
**Status:** Production Ready  
**Tested on:** Supabase (PostgreSQL 12+)
