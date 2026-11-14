-- MacroChef RLS Policy Verification & Hardening Script (Idempotent)
-- Purpose: Verify and enforce Row Level Security on critical tables
-- Usage: Run in Supabase SQL Editor or via: psql -d <db> -f verify_rls_policies.sql
-- Safety: Non-destructive verification; uses transactions for testing
-- Note: This script uses psql-specific commands for testing only

-- ============================================================================
-- SECTION 1: Verify RLS is Enabled on Critical Tables
-- ============================================================================

-- Step 1.1: Check RLS status
SELECT
  schemaname,
  tablename,
  CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_class
JOIN pg_namespace ON relnamespace = pg_namespace.oid
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'products', 'recipes', 'planner', 'goals')
ORDER BY tablename;

-- ============================================================================
-- SECTION 2: Verify Products Table Permissions
-- ============================================================================

-- Step 2.1: List all policies on products table
SELECT
  policyname,
  cmd as dml_operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products'
ORDER BY cmd, policyname;

-- Step 2.2: Verify SELECT policy exists
SELECT COUNT(*) as select_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'SELECT';

-- Step 2.3: Verify INSERT policy (Admin only)
SELECT COUNT(*) as insert_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'INSERT';

-- Step 2.4: Verify UPDATE policy (Admin only)
SELECT COUNT(*) as update_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'UPDATE';

-- Step 2.5: Verify DELETE policy (Admin only)
SELECT COUNT(*) as delete_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'DELETE';

-- ============================================================================
-- SECTION 3: Verify Recipes Table Permissions
-- ============================================================================

-- Step 3.1: List all policies on recipes table
SELECT
  policyname,
  cmd as dml_operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'recipes'
ORDER BY cmd, policyname;

-- Step 3.2: Verify SELECT policy exists
SELECT COUNT(*) as select_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'recipes' AND cmd = 'SELECT';

-- Step 3.3: Verify INSERT policy (Admin only, own user_id)
SELECT COUNT(*) as insert_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'recipes' AND cmd = 'INSERT';

-- Step 3.4: Verify UPDATE policy (Admin only, own user_id)
SELECT COUNT(*) as update_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'recipes' AND cmd = 'UPDATE';

-- Step 3.5: Verify DELETE policy (Admin only, own user_id)
SELECT COUNT(*) as delete_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'recipes' AND cmd = 'DELETE';

-- ============================================================================
-- SECTION 4: Verify User Profile Role Immutability
-- ============================================================================

-- Step 4.1: Check user_profiles RLS is enabled
SELECT relrowsecurity
FROM pg_class
JOIN pg_namespace ON relnamespace = pg_namespace.oid
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Step 4.2: Verify SELECT policy exists
SELECT COUNT(*) as select_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles' AND cmd = 'SELECT';

-- Step 4.3: Verify INSERT/UPDATE/DELETE are revoked from authenticated
SELECT COUNT(*) as restricted_policies FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE');

-- ============================================================================
-- SECTION 5: Verify is_admin() Function Security
-- ============================================================================

-- Step 5.1: Check is_admin function exists and is SECURITY DEFINER
SELECT
  proname,
  prosecdef as is_security_definer,
  proacl as permissions
FROM pg_proc
WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- SECTION 6: Production Verification Queries (Run as Admin)
-- ============================================================================

-- Step 6.1: Verify Admin can INSERT to products
-- Run as Admin user:
-- BEGIN;
-- INSERT INTO public.products (id, name_pl, name_en, category)
-- VALUES ('verification-prod-1', 'Test Admin', 'Test Admin', 'test')
-- ON CONFLICT DO NOTHING;
-- SELECT COUNT(*) as inserted FROM public.products WHERE id = 'verification-prod-1';
-- ROLLBACK;

-- Step 6.2: Verify Admin can UPDATE products
-- BEGIN;
-- UPDATE public.products SET name_pl = 'Updated by Admin'
-- WHERE id = 'verification-prod-1';
-- SELECT COUNT(*) as updated FROM public.products
-- WHERE id = 'verification-prod-1' AND name_pl = 'Updated by Admin';
-- ROLLBACK;

-- Step 6.3: Verify Admin can DELETE products
-- BEGIN;
-- DELETE FROM public.products WHERE id = 'verification-prod-1';
-- SELECT COUNT(*) as deleted FROM public.products WHERE id = 'verification-prod-1';
-- ROLLBACK;

-- ============================================================================
-- SECTION 7: Production Verification Queries (Run as Tester/UserWithAdvertisement)
-- ============================================================================

-- Step 7.1: Verify non-Admin can SELECT products (should succeed)
-- Run as Tester user:
-- SELECT COUNT(*) as product_count FROM public.products LIMIT 1;
-- Expected: Returns count (succeeds)

-- Step 7.2: Attempt non-Admin INSERT to products (should fail with RLS error)
-- BEGIN;
-- INSERT INTO public.products (id, name_pl, name_en, category)
-- VALUES ('verification-prod-2', 'Test Tester', 'Test Tester', 'test');
-- Expected error: 'new row violates row-level security policy' (42501)
-- ROLLBACK;

-- Step 7.3: Attempt non-Admin UPDATE to products (should fail with RLS error)
-- BEGIN;
-- UPDATE public.products SET name_pl = 'Updated by Tester'
-- WHERE id = 'lidl-001';
-- Expected error: 'new row violates row-level security policy' (42501)
-- ROLLBACK;

-- Step 7.4: Attempt non-Admin DELETE from products (should fail with RLS error)
-- BEGIN;
-- DELETE FROM public.products WHERE id = 'lidl-001';
-- Expected error: 'new row violates row-level security policy' (42501)
-- ROLLBACK;

-- Step 7.5: Verify non-Admin can SELECT recipes (own + Admin recipes)
-- Run as Tester user:
-- SELECT COUNT(*) as recipe_count FROM public.recipes;
-- Expected: Returns count of accessible recipes (succeeds)

-- Step 7.6: Attempt non-Admin INSERT to recipes (should fail with RLS error)
-- BEGIN;
-- INSERT INTO public.recipes (id, user_id, data)
-- VALUES ('verification-recipe-1', auth.uid(), '{"name":"Test Recipe"}');
-- Expected error: 'new row violates row-level security policy' (42501)
-- ROLLBACK;

-- Step 7.7: Attempt non-Admin UPDATE to recipes (should fail with RLS error)
-- BEGIN;
-- UPDATE public.recipes SET data = '{"updated":true}'
-- WHERE user_id = auth.uid() LIMIT 1;
-- Expected error: 'new row violates row-level security policy' (42501)
-- ROLLBACK;

-- Step 7.8: Attempt non-Admin DELETE from recipes (should fail with RLS error)
-- BEGIN;
-- DELETE FROM public.recipes WHERE user_id = auth.uid() LIMIT 1;
-- Expected error: 'new row violates row-level security policy' (42501)
-- ROLLBACK;

-- ============================================================================
-- SECTION 8: API Error Handling Verification
-- ============================================================================

-- When RLS violations occur, Supabase returns:
-- - HTTP Status: 403 (Forbidden) or 401 (Unauthorized)
-- - PostgreSQL Error Code: 42501 (insufficient_privilege)
-- - Error Message: 'new row violates row-level security policy'

-- The app (AppSyncManager.js) must:
-- 1. Detect HTTP 403/401 or PostgreSQL error 42501
-- 2. NOT retry indefinitely (avoid infinite loops)
-- 3. Add to conflicts array with clear message
-- 4. Set sync status to 'conflict' and surface permission error

-- ============================================================================
-- SECTION 9: Cleanup Instructions
-- ============================================================================

-- To reset RLS policies to defaults, run the migration:
-- psql -d <db> -f supabase/migrations/20261113210000_initial_schema.sql

-- To verify RLS enforcement after changes:
-- Run this script again to confirm all policies are in place

-- ============================================================================
-- SECTION 10: Monitoring & Alerting
-- ============================================================================

-- Monitor these errors in application logs:
-- - "RLS policy violation" (HTTP 403)
-- - "Unauthorized access" (HTTP 401)
-- - "insufficient_privilege" (PostgreSQL 42501)

-- Alert if:
-- - Non-Admin role successfully performs write to products/recipes
-- - Admin function is called from unauthenticated context
-- - RLS is disabled on any protected table

-- ============================================================================
-- IMPLEMENTATION NOTES
-- ============================================================================

-- RLS Enforcement Chain:
-- 1. Client: User logs in with role (Admin, Tester, UserWithAdvertisement)
-- 2. Supabase: Role is verified in user_profiles table
-- 3. JWT: Role is included in JWT token claims
-- 4. Request: JWT is sent with each Supabase API request
-- 5. PostgreSQL: RLS policies check role before allowing operation
-- 6. Response: HTTP 403 + error message if RLS blocks operation
-- 7. Client: AppSyncManager catches error and adds to conflicts

-- Key Security Properties:
-- - Non-Admin CANNOT escalate their own role (UPDATE user_profiles blocked)
-- - Non-Admin CANNOT INSERT/UPDATE/DELETE products (RLS enforces)
-- - Non-Admin CANNOT INSERT/UPDATE/DELETE other users' recipes (RLS enforces)
-- - is_admin() function is SECURITY DEFINER to prevent RLS recursion
-- - All table modifications are timestamped with server-side updated_at
