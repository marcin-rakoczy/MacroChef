-- Allow authenticated users to manage their own profiles
-- This enables login -> automatic profile creation + role assignment

-- Drop existing policies
DROP POLICY IF EXISTS "read_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "insert_any_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "update_any_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "delete_any_profile" ON public.user_profiles;

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow READ: All authenticated users can see all profiles (for Admin Panel)
CREATE POLICY "read_all_for_auth"
ON public.user_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow INSERT: Users can create their own profile
CREATE POLICY "insert_own_profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow UPDATE: Users can update their own profile, or admins can update any
-- For now: only own profile to keep it simple
CREATE POLICY "update_own_profile"
ON public.user_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow DELETE: Users can delete their own profile
CREATE POLICY "delete_own_profile"
ON public.user_profiles
FOR DELETE
USING (user_id = auth.uid());

-- IMPORTANT: To enable admin operations, we need to either:
-- 1. Use Supabase RLS bypass (requires service_role key)
-- 2. Create profiles via automatic trigger on signup
-- 3. Have admins modify only their own profile, with app-level enforcement
-- 4. Temporarily disable RLS for admin operations

-- For now, use service_role key operations or modify via raw SQL with admin context
