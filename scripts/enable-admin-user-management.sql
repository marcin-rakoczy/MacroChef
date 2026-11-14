-- Migration: Enable Admin role to manage user profiles
-- This migration allows authenticated users with 'Admin' role to insert new user profiles
-- Required for the Admin Panel to create/manage users via the UI

-- First, check existing RLS policies (for reference)
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Allow admins to insert users" ON public.user_profiles;

-- Create new policy: Allow authenticated users with Admin role to insert user profiles
CREATE POLICY "Allow admins to insert users"
ON public.user_profiles
FOR INSERT
WITH CHECK (
  -- Only authenticated users with Admin role can insert
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

-- Drop and recreate UPDATE policy to allow admins to update users
DROP POLICY IF EXISTS "Allow admins to update users" ON public.user_profiles;

CREATE POLICY "Allow admins to update users"
ON public.user_profiles
FOR UPDATE
WITH CHECK (
  -- Only admins can update any user's profile
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

-- Drop and recreate DELETE policy to allow admins to delete users
DROP POLICY IF EXISTS "Allow admins to delete users" ON public.user_profiles;

CREATE POLICY "Allow admins to delete users"
ON public.user_profiles
FOR DELETE
USING (
  -- Only admins can delete users
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Optional: Add a policy for admins to read all user profiles
DROP POLICY IF EXISTS "Allow admins to read all users" ON public.user_profiles;

CREATE POLICY "Allow admins to read all users"
ON public.user_profiles
FOR SELECT
USING (
  -- Admins can see all users, others see only themselves
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'Admin'
    )
  )
);

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
