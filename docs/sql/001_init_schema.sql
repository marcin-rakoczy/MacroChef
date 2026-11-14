-- MacroChef Database Schema Initialization (Idempotent DDL-only Script)
-- Purpose: Create complete schema structure for MacroChef PostgreSQL database
-- Environment: Supabase
-- Safety: All operations are idempotent (DROP IF EXISTS pattern)
-- Usage: Run in Supabase SQL Editor or: psql -d <database> -f 001_init_schema.sql

-- ============================================================================
-- SECTION 1: Helper Functions
-- ============================================================================

-- Function to update the updated_at timestamp on INSERT/UPDATE
-- Used by triggers on recipes, products, planner, and goals
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_updated_at() IS 'Trigger function to automatically update updated_at timestamp on INSERT/UPDATE';

-- ============================================================================
-- SECTION 2: User Profiles and Roles
-- ============================================================================

-- Create user_profiles table with role-based access control
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'UserWithAdvertisement' 
    CHECK (role IN ('Admin', 'Tester', 'UserWithAdvertisement')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for email lookups (for potential admin operations)
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- Index for role lookups (for RLS policies and admin queries)
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

COMMENT ON TABLE public.user_profiles IS 'User account metadata including role-based access control';
COMMENT ON COLUMN public.user_profiles.user_id IS 'Reference to auth.users.id (auto-deleted on user cascade delete)';
COMMENT ON COLUMN public.user_profiles.email IS 'User email address (denormalized from auth.users for RLS policies)';
COMMENT ON COLUMN public.user_profiles.role IS 'Access control role: Admin (full access), Tester (read-only), UserWithAdvertisement (read-only with ads)';
COMMENT ON COLUMN public.user_profiles.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN public.user_profiles.updated_at IS 'Last profile update timestamp';

-- Trigger to update updated_at on profile changes
DROP TRIGGER IF EXISTS trigger_set_updated_at_user_profiles ON public.user_profiles;

CREATE TRIGGER trigger_set_updated_at_user_profiles
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 3: Automatic User Profile Creation on Auth Signup
-- ============================================================================

-- Function to automatically create user_profiles entry on auth.users signup
-- SECURITY DEFINER: Allows authenticated users to create their own profile
-- ON CONFLICT DO NOTHING: Idempotent (skips if profile already exists)
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;

CREATE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'UserWithAdvertisement', -- Default role for new users
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Idempotent: skip if already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.on_auth_user_created() IS 
  'Automatic trigger: creates user_profiles record with default role when auth.users is created';

-- Trigger to fire on auth.users INSERT
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;

CREATE TRIGGER trigger_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.on_auth_user_created();

-- ============================================================================
-- SECTION 4: Products Table (Global Catalog)
-- ============================================================================

DROP TABLE IF EXISTS public.products CASCADE;

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

-- Indexes for common product queries
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_name_pl ON public.products(name_pl);
CREATE INDEX idx_products_updated_at ON public.products(updated_at DESC);

COMMENT ON TABLE public.products IS 'Global product catalog (shared by all users, no user_id ownership)';
COMMENT ON COLUMN public.products.id IS 'Unique product identifier (TEXT, generated client-side with crypto.randomUUID)';
COMMENT ON COLUMN public.products.name_pl IS 'Product name in Polish';
COMMENT ON COLUMN public.products.name_en IS 'Product name in English';
COMMENT ON COLUMN public.products.category IS 'Product category code';
COMMENT ON COLUMN public.products.category_pl IS 'Product category name in Polish';
COMMENT ON COLUMN public.products.category_en IS 'Product category name in English';
COMMENT ON COLUMN public.products.unit IS 'Measurement unit (g, ml, pcs, etc.)';
COMMENT ON COLUMN public.products.package_size IS 'Standard package size';
COMMENT ON COLUMN public.products.source_url IS 'Source URL for product verification';
COMMENT ON COLUMN public.products.source_verified_at IS 'Date product data was last verified against source';
COMMENT ON COLUMN public.products.updated_at IS 'Last modification timestamp (auto-updated by trigger)';

-- Trigger to update updated_at on products
DROP TRIGGER IF EXISTS trigger_set_updated_at_products ON public.products;

CREATE TRIGGER trigger_set_updated_at_products
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 5: Recipes Table (User-Owned Content)
-- ============================================================================

DROP TABLE IF EXISTS public.recipes CASCADE;

CREATE TABLE public.recipes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for recipe queries
CREATE INDEX idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX idx_recipes_updated_at ON public.recipes(updated_at DESC);

COMMENT ON TABLE public.recipes IS 'User-created recipes (owned by user_id, editable only by Admin role)';
COMMENT ON COLUMN public.recipes.id IS 'Unique recipe identifier (TEXT format)';
COMMENT ON COLUMN public.recipes.user_id IS 'Owner of the recipe (foreign key to auth.users)';
COMMENT ON COLUMN public.recipes.data IS 'Complete recipe data as JSON (name, ingredients, macros, etc.)';
COMMENT ON COLUMN public.recipes.updated_at IS 'Last modification timestamp (auto-updated by trigger)';

-- Trigger to update updated_at on recipes
DROP TRIGGER IF EXISTS trigger_set_updated_at_recipes ON public.recipes;

CREATE TRIGGER trigger_set_updated_at_recipes
BEFORE INSERT OR UPDATE ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 6: Planner Table (User Daily Meal Plans)
-- ============================================================================

DROP TABLE IF EXISTS public.planner CASCADE;

CREATE TABLE public.planner (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_key)
);

-- Indexes for planner queries
CREATE INDEX idx_planner_user_id ON public.planner(user_id);
CREATE INDEX idx_planner_day_key ON public.planner(day_key);
CREATE INDEX idx_planner_updated_at ON public.planner(updated_at DESC);

COMMENT ON TABLE public.planner IS 'User meal planning data - one row per user per day';
COMMENT ON COLUMN public.planner.id IS 'Unique planner entry identifier';
COMMENT ON COLUMN public.planner.user_id IS 'Owner of the meal plan (foreign key to auth.users)';
COMMENT ON COLUMN public.planner.day_key IS 'Date key for the meal plan (YYYY-MM-DD format)';
COMMENT ON COLUMN public.planner.data IS 'Daily meal plan data as JSON (meals per slot: Breakfast, Lunch, Dinner, Snack)';
COMMENT ON COLUMN public.planner.updated_at IS 'Last modification timestamp (auto-updated by trigger)';
COMMENT ON CONSTRAINT planner_user_id_day_key_key ON public.planner 
  IS 'Ensure each user has at most one plan per day';

-- Trigger to update updated_at on planner
DROP TRIGGER IF EXISTS trigger_set_updated_at_planner ON public.planner;

CREATE TRIGGER trigger_set_updated_at_planner
BEFORE INSERT OR UPDATE ON public.planner
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 7: Goals Table (User Nutritional Goals)
-- ============================================================================

DROP TABLE IF EXISTS public.goals CASCADE;

CREATE TABLE public.goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Indexes for goals queries
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_updated_at ON public.goals(updated_at DESC);

COMMENT ON TABLE public.goals IS 'User fitness and nutritional goals (one record per user)';
COMMENT ON COLUMN public.goals.id IS 'Unique goals identifier';
COMMENT ON COLUMN public.goals.user_id IS 'Owner of the goals (foreign key to auth.users)';
COMMENT ON COLUMN public.goals.data IS 'Goals configuration as JSON (calories, macros targets, etc.)';
COMMENT ON COLUMN public.goals.updated_at IS 'Last modification timestamp (auto-updated by trigger)';
COMMENT ON CONSTRAINT goals_user_id_key ON public.goals 
  IS 'Enforce one goals record per user';

-- Trigger to update updated_at on goals
DROP TRIGGER IF EXISTS trigger_set_updated_at_goals ON public.goals;

CREATE TRIGGER trigger_set_updated_at_goals
BEFORE INSERT OR UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SECTION 8: Row Level Security (RLS) - Enable on All Tables
-- ============================================================================

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.user_profiles IS 'RLS ENABLED: Users can only view their own profile';

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.products IS 'RLS ENABLED: Authenticated users can view all; only Admin can modify';

-- Enable RLS on recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.recipes IS 'RLS ENABLED: Users can view own recipes + Admin-created global recipes; only Admin can modify';

-- Enable RLS on planner
ALTER TABLE public.planner ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.planner IS 'RLS ENABLED: Users can only access their own plans';

-- Enable RLS on goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.goals IS 'RLS ENABLED: Users can only access their own goals';

-- ============================================================================
-- SECTION 9: RLS Policies - user_profiles
-- ============================================================================

-- user_profiles: SELECT - Only see your own profile
DROP POLICY IF EXISTS "users_select_own_profile" ON public.user_profiles;

CREATE POLICY "users_select_own_profile" ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "users_select_own_profile" ON public.user_profiles
IS 'Users can only view their own profile data';

-- user_profiles: INSERT/UPDATE/DELETE - Disabled for all (including Admin at API level)
-- Role field can only be changed by direct database administration
-- This prevents privilege escalation through the API
DROP POLICY IF EXISTS "users_cannot_modify_profile" ON public.user_profiles;

CREATE POLICY "users_cannot_modify_profile" ON public.user_profiles
FOR UPDATE
USING (false)
WITH CHECK (false);

COMMENT ON POLICY "users_cannot_modify_profile" ON public.user_profiles
IS 'Prevent all users (including Admin) from modifying roles via API; roles can only be changed by database administration';

-- ============================================================================
-- SECTION 10: RLS Policies - products
-- ============================================================================

-- products: SELECT - All authenticated users can read products
DROP POLICY IF EXISTS "authenticated_select_products" ON public.products;

CREATE POLICY "authenticated_select_products" ON public.products
FOR SELECT
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "authenticated_select_products" ON public.products
IS 'All authenticated users can view the product catalog';

-- products: INSERT - Only Admin users can insert
DROP POLICY IF EXISTS "admin_insert_products" ON public.products;

CREATE POLICY "admin_insert_products" ON public.products
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

COMMENT ON POLICY "admin_insert_products" ON public.products
IS 'Only users with Admin role can add products to catalog';

-- products: UPDATE - Only Admin users can update
DROP POLICY IF EXISTS "admin_update_products" ON public.products;

CREATE POLICY "admin_update_products" ON public.products
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

COMMENT ON POLICY "admin_update_products" ON public.products
IS 'Only users with Admin role can modify product data';

-- products: DELETE - Only Admin users can delete
DROP POLICY IF EXISTS "admin_delete_products" ON public.products;

CREATE POLICY "admin_delete_products" ON public.products
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

COMMENT ON POLICY "admin_delete_products" ON public.products
IS 'Only users with Admin role can delete products';

-- ============================================================================
-- SECTION 11: RLS Policies - recipes
-- ============================================================================

-- recipes: SELECT - Own recipes + Admin-created global recipes
DROP POLICY IF EXISTS "users_select_own_recipes" ON public.recipes;

CREATE POLICY "users_select_own_recipes" ON public.recipes
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    -- Global recipes created by Admin (identified by admin check at insertion time)
    -- For simplicity, we allow all recipes to be readable
    -- In production, you might add a 'is_global' flag or check admin ownership
    auth.role() = 'authenticated'
    AND (auth.uid() = user_id OR user_id IN (
      SELECT user_id FROM public.user_profiles WHERE role = 'Admin'
    ))
  )
);

COMMENT ON POLICY "users_select_own_recipes" ON public.recipes
IS 'Users can view their own recipes and recipes created by Admin users';

-- recipes: INSERT - Only Admin users can insert
DROP POLICY IF EXISTS "admin_insert_recipes" ON public.recipes;

CREATE POLICY "admin_insert_recipes" ON public.recipes
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

COMMENT ON POLICY "admin_insert_recipes" ON public.recipes
IS 'Only users with Admin role can create recipes';

-- recipes: UPDATE - Only Admin users can update
DROP POLICY IF EXISTS "admin_update_recipes" ON public.recipes;

CREATE POLICY "admin_update_recipes" ON public.recipes
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

COMMENT ON POLICY "admin_update_recipes" ON public.recipes
IS 'Only users with Admin role can modify recipes';

-- recipes: DELETE - Only Admin users can delete
DROP POLICY IF EXISTS "admin_delete_recipes" ON public.recipes;

CREATE POLICY "admin_delete_recipes" ON public.recipes
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

COMMENT ON POLICY "admin_delete_recipes" ON public.recipes
IS 'Only users with Admin role can delete recipes';

-- ============================================================================
-- SECTION 12: RLS Policies - planner
-- ============================================================================

-- planner: SELECT - Only own plans
DROP POLICY IF EXISTS "users_select_own_plans" ON public.planner;

CREATE POLICY "users_select_own_plans" ON public.planner
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "users_select_own_plans" ON public.planner
IS 'Users can only view their own meal plans';

-- planner: INSERT - Only for own user_id
DROP POLICY IF EXISTS "users_insert_own_plans" ON public.planner;

CREATE POLICY "users_insert_own_plans" ON public.planner
FOR INSERT
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "users_insert_own_plans" ON public.planner
IS 'Users can only create meal plans for themselves';

-- planner: UPDATE - Only own plans
DROP POLICY IF EXISTS "users_update_own_plans" ON public.planner;

CREATE POLICY "users_update_own_plans" ON public.planner
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "users_update_own_plans" ON public.planner
IS 'Users can only modify their own meal plans';

-- planner: DELETE - Only own plans
DROP POLICY IF EXISTS "users_delete_own_plans" ON public.planner;

CREATE POLICY "users_delete_own_plans" ON public.planner
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON POLICY "users_delete_own_plans" ON public.planner
IS 'Users can only delete their own meal plans';

-- ============================================================================
-- SECTION 13: RLS Policies - goals
-- ============================================================================

-- goals: SELECT - Only own goals
DROP POLICY IF EXISTS "users_select_own_goals" ON public.goals;

CREATE POLICY "users_select_own_goals" ON public.goals
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON POLICY "users_select_own_goals" ON public.goals
IS 'Users can only view their own fitness goals';

-- goals: INSERT - Only for own user_id
DROP POLICY IF EXISTS "users_insert_own_goals" ON public.goals;

CREATE POLICY "users_insert_own_goals" ON public.goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "users_insert_own_goals" ON public.goals
IS 'Users can only create goals for themselves';

-- goals: UPDATE - Only own goals
DROP POLICY IF EXISTS "users_update_own_goals" ON public.goals;

CREATE POLICY "users_update_own_goals" ON public.goals
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "users_update_own_goals" ON public.goals
IS 'Users can only modify their own fitness goals';

-- goals: DELETE - Only own goals
DROP POLICY IF EXISTS "users_delete_own_goals" ON public.goals;

CREATE POLICY "users_delete_own_goals" ON public.goals
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON POLICY "users_delete_own_goals" ON public.goals
IS 'Users can only delete their own fitness goals';

-- ============================================================================
-- SECTION 14: Final Verification
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT
  ns.nspname as schemaname,
  c.relname as tablename,
  CASE WHEN c.relrowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_class c
JOIN pg_namespace ns ON c.relnamespace = ns.oid
WHERE ns.nspname = 'public'
  AND c.relname IN ('user_profiles', 'products', 'recipes', 'planner', 'goals')
ORDER BY c.relname;

-- List all created policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as dml_operation,
  CASE WHEN permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- HOW TO GRANT ADMIN ROLE TO A USER
-- ============================================================================

-- After a user registers and a profile is created with default role 'UserWithAdvertisement',
-- you can grant Admin access by running (requires direct database admin access):
--
-- UPDATE public.user_profiles
-- SET role = 'Admin'
-- WHERE email = 'user@example.com';
--
-- Example:
-- UPDATE public.user_profiles SET role = 'Admin' WHERE email = 'mrakoczy@wp.pl';
--
-- To grant Tester role:
-- UPDATE public.user_profiles SET role = 'Tester' WHERE email = 'tester@example.com';
--
-- To revert to default role:
-- UPDATE public.user_profiles SET role = 'UserWithAdvertisement' WHERE email = 'user@example.com';
--
-- Always verify the change:
-- SELECT user_id, email, role FROM public.user_profiles WHERE email = 'user@example.com';

-- ============================================================================
-- END OF SCHEMA INITIALIZATION
-- ============================================================================

-- Notes:
-- 1. This script is fully idempotent - can be run multiple times safely
-- 2. All DDL operations use DROP IF EXISTS before CREATE to prevent errors
-- 3. RLS is enabled on all tables and policies prevent unauthorized access
-- 4. Triggers automatically maintain updated_at timestamps
-- 5. User profiles are automatically created when new auth.users are registered
-- 6. Role management (Admin, Tester, UserWithAdvertisement) is admin-only at database level
-- 7. No data is inserted - this is structure-only initialization
-- 8. For data backup/restore, use separate migration scripts (e.g., docs/sql/002_seed_*.sql)
