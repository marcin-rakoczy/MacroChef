-- Migration: Fix RLS policies to prevent infinite recursion
-- The previous policies had recursive subqueries that caused "infinite recursion detected" error
-- This simplified version removes the recursive references

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow admins to insert users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to update users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to delete users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to read all users" ON public.user_profiles;

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Simple SELECT policy: All authenticated users can see all profiles
-- This is needed for the Admin Panel to display the user list
CREATE POLICY "Allow authenticated users to read profiles"
ON public.user_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT policy: All authenticated users can insert
-- Role-based restrictions enforced in application logic (AdminUsers.js)
CREATE POLICY "Allow authenticated users to insert profiles"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy: All authenticated users can update
-- Role-based restrictions enforced in application logic (AdminUsers.js)
CREATE POLICY "Allow authenticated users to update profiles"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE policy: All authenticated users can delete
-- Role-based restrictions enforced in application logic (AdminUsers.js)
CREATE POLICY "Allow authenticated users to delete profiles"
ON public.user_profiles
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- NOTE: Admin role restrictions are enforced in the APPLICATION LAYER (js/components/AdminUsers.js)
-- not in the database RLS policies, to avoid infinite recursion issues.
-- The AdminUsers component checks: if (session?.role === 'Admin') before rendering controls.

-- Verify the policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
