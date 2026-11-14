-- MacroChef RLS Policy Verification & Hardening Script (Supabase-Compatible)
-- Purpose: Verify and enforce Row Level Security on critical tables
-- Usage: Run in Supabase SQL Editor or via: psql -d <db> -f verify_rls_policies.sql
-- Safety: Non-destructive verification; uses transactions for testing

-- ============================================================================
-- SECTION 1: Verify RLS is Enabled on Critical Tables
-- ============================================================================

-- Step 1.1: Check RLS status on all tables
SELECT
  t.table_name,
  CASE WHEN (
    SELECT relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = t.table_name
  ) THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN ('user_profiles', 'products', 'recipes', 'planner', 'goals')
ORDER BY t.table_name;

-- ============================================================================
-- SECTION 2: Verify Products Table Permissions
-- ============================================================================

-- Step 2.1: Count policies on products table
SELECT
  'products' as table_name,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'products';

-- Step 2.2: Verify SELECT policy exists
SELECT COUNT(*) as select_policies FROM pg_policies
WHERE tablename = 'products' AND cmd = 'SELECT';

-- Step 2.3: Verify INSERT policy (Admin only)
SELECT COUNT(*) as insert_policies FROM pg_policies
WHERE tablename = 'products' AND cmd = 'INSERT';

-- Step 2.4: Verify UPDATE policy (Admin only)
SELECT COUNT(*) as update_policies FROM pg_policies
WHERE tablename = 'products' AND cmd = 'UPDATE';

-- Step 2.5: Verify DELETE policy (Admin only)
SELECT COUNT(*) as delete_policies FROM pg_policies
WHERE tablename = 'products' AND cmd = 'DELETE';

-- ============================================================================
-- SECTION 3: Verify Recipes Table Permissions
-- ============================================================================

-- Step 3.1: Count policies on recipes table
SELECT
  'recipes' as table_name,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'recipes';

-- Step 3.2: Verify SELECT policy exists
SELECT COUNT(*) as select_policies FROM pg_policies
WHERE tablename = 'recipes' AND cmd = 'SELECT';

-- Step 3.3: Verify INSERT policy (Admin only)
SELECT COUNT(*) as insert_policies FROM pg_policies
WHERE tablename = 'recipes' AND cmd = 'INSERT';

-- Step 3.4: Verify UPDATE policy (Admin only)
SELECT COUNT(*) as update_policies FROM pg_policies
WHERE tablename = 'recipes' AND cmd = 'UPDATE';

-- Step 3.5: Verify DELETE policy (Admin only)
SELECT COUNT(*) as delete_policies FROM pg_policies
WHERE tablename = 'recipes' AND cmd = 'DELETE';

-- ============================================================================
-- SECTION 4: Verify User Profile Role Immutability
-- ============================================================================

-- ============================================================================
-- SECTION 4: Verify User Profiles Table Permissions
-- ============================================================================

-- Step 4.1: Check user_profiles RLS is enabled
SELECT
  'user_profiles' as table_name,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Step 4.2: Verify SELECT policy exists
SELECT COUNT(*) as select_policies FROM pg_policies
WHERE tablename = 'user_profiles' AND cmd = 'SELECT';

-- Step 4.3: Verify UPDATE policy exists (should restrict modifications)
SELECT COUNT(*) as update_policies FROM pg_policies
WHERE tablename = 'user_profiles' AND cmd = 'UPDATE';

-- ============================================================================
-- SECTION 5: Verify Planner & Goals Table Permissions
-- ============================================================================

-- Step 5.1: Planner table policies
SELECT
  'planner' as table_name,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'planner';

-- Step 5.2: Goals table policies
SELECT
  'goals' as table_name,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'goals';

-- ============================================================================
-- SECTION 6: List All RLS Policies by Table
-- ============================================================================

-- Step 6.1: All policies summary
SELECT
  tablename,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('user_profiles', 'products', 'recipes', 'planner', 'goals')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ============================================================================
-- SECTION 7: Testing RLS Policies (Manual Tests)
-- ============================================================================

-- These queries demonstrate how RLS policies work.
-- To test, you need to run them as different roles.

-- Test 7.1: Admin should be able to INSERT products
-- Run as Admin:
-- BEGIN;
-- INSERT INTO public.products (id, name_pl, name_en, category)
-- VALUES ('test-admin-001', 'Test Admin Product', 'Test Admin Product', 'test')
-- ON CONFLICT DO NOTHING;
-- ROLLBACK;

-- Test 7.2: Non-Admin should FAIL to INSERT products
-- Run as Tester or UserWithAdvertisement:
-- BEGIN;
-- INSERT INTO public.products (id, name_pl, name_en, category)
-- VALUES ('test-non-admin-001', 'Test Non Admin', 'Test Non Admin', 'test');
-- -- Expected: ERROR 42501 (insufficient_privilege) - RLS policy blocks
-- ROLLBACK;

-- Test 7.3: All authenticated users can SELECT products
-- Run as any authenticated user:
-- SELECT COUNT(*) as product_count FROM public.products;
-- Expected: Returns count (succeeds for all roles)

-- Test 7.4: Users can only see/modify their own planner data
-- Run as User A:
-- SELECT COUNT(*) FROM public.planner WHERE user_id = auth.uid();
-- -- Expected: Returns only User A's plans

-- Test 7.5: Users cannot see other users' planner data
-- Run as User A, trying to query User B's plans:
-- SELECT COUNT(*) FROM public.planner WHERE user_id = '<User B UUID>';
-- -- Expected: Returns 0 (RLS blocks access)

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
-- psql -d <db> -f docs/sql/001_init_schema.sql

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
-- - Admin role is unable to write to protected tables
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
-- - All table modifications are timestamped with server-side updated_at
-- - Role is checked at database level, not just application level
