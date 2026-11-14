-- Fix RLS policies to properly allow user management
-- The issue: policies might not allow authenticated users to insert for OTHER users

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow admins to insert users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to update users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to delete users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to read all users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON public.user_profiles;

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow all authenticated users to read all profiles
-- This is needed for Admin Panel to show user list
CREATE POLICY "read_all_profiles"
ON public.user_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: Allow any authenticated user to insert a profile
-- No user_id check - allow creating profiles for any user
CREATE POLICY "insert_any_profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Allow any authenticated user to update profiles
-- Enforcement: role restrictions in application layer only
CREATE POLICY "update_any_profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: Allow any authenticated user to delete profiles
-- Enforcement: role restrictions in application layer only
CREATE POLICY "delete_any_profile"
ON public.user_profiles
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Verify policies
SELECT policyname, permissive, roles, qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
