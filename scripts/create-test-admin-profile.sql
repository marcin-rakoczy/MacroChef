-- Create admin profile for testing
-- Run this with Supabase dashboard (SQL Editor) or with service role key

-- First, verify the auth user exists
-- SELECT * FROM auth.users WHERE email = 'admin@test.com';

-- Option 1: Direct insert (if RLS is disabled temporarily)
-- Temporarily disable RLS to insert initial admin profile
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

INSERT INTO public.user_profiles (user_id, email, role, created_at)
VALUES (
  '313d0422-4ef0-4bd4-8feb-d94a71a078cf'::uuid,  -- user_id from auth.users
  'admin@test.com',
  'Admin',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'Admin', email = 'admin@test.com';

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT user_id, email, role FROM public.user_profiles WHERE email = 'admin@test.com';
