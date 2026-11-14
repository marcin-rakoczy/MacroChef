-- Enable Admin operations while maintaining RLS security
-- This script:
-- 1. Creates a function to check if current user is admin
-- 2. Updates RLS policies to allow admins full access
-- 3. Ensures non-admins can only manage their own profiles

-- ===== Step 1: Create helper function for admin check =====
-- Note: This will cause infinite recursion if used in RLS policy checking user_profiles.role
-- Instead, we create a table of admin user IDs that doesn't depend on user_profiles

-- Drop function if it exists (to avoid parameter name conflicts)
DROP FUNCTION IF EXISTS is_admin(uuid);

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT NOW()
);

-- Helper function to check if authenticated user is admin
CREATE FUNCTION is_admin(check_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users WHERE admin_users.user_id = check_user
  );
$$;

-- ===== Step 2: Update RLS policies to use admin check =====
DROP POLICY IF EXISTS "read_all_for_auth" ON public.user_profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "delete_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "read_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "insert_any_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "update_any_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "delete_any_profile" ON public.user_profiles;

-- SELECT: Admins can see all, regular users can only see themselves
CREATE POLICY "user_read_policy"
ON public.user_profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (
    is_admin(auth.uid()) OR
    user_id = auth.uid()
  )
);

-- INSERT: Admins can insert any profile, regular users only their own
CREATE POLICY "user_insert_policy"
ON public.user_profiles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    is_admin(auth.uid()) OR
    user_id = auth.uid()
  )
);

-- UPDATE: Admins can update any profile, regular users only their own
CREATE POLICY "user_update_policy"
ON public.user_profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  (
    is_admin(auth.uid()) OR
    user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    is_admin(auth.uid()) OR
    user_id = auth.uid()
  )
);

-- DELETE: Admins can delete any profile, regular users can't delete
CREATE POLICY "user_delete_policy"
ON public.user_profiles
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  is_admin(auth.uid())
);

-- ===== Step 3: Add initial admin users =====
-- This should be run ONCE to bootstrap the first admin
-- Disable RLS temporarily to insert into admin_users table itself
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Add admin user
INSERT INTO public.admin_users (user_id)
VALUES ('313d0422-4ef0-4bd4-8feb-d94a71a078cf'::uuid)
ON CONFLICT (user_id) DO NOTHING;

-- Re-enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users table policies
CREATE POLICY "admin_users_read"
ON public.admin_users
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_users_insert"
ON public.admin_users
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "admin_users_update"
ON public.admin_users
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "admin_users_delete"
ON public.admin_users
FOR DELETE
USING (is_admin(auth.uid()));

-- ===== Step 4: Verify setup =====
SELECT 
  'Admin users' as entity,
  COUNT(*) as count
FROM public.admin_users
UNION ALL
SELECT 
  'User profiles',
  COUNT(*)
FROM public.user_profiles;

-- Check if current user is admin
-- SELECT is_admin(auth.uid());

-- ===== Notes =====
-- After running this script:
-- 1. Admins (listed in admin_users) can perform all CRUD on user_profiles
-- 2. Non-admins can only manage their own profile
-- 3. No infinite recursion because is_admin() checks a separate table
-- 4. The app can now safely call user_profiles update/insert/delete from Admin Panel
