-- Add 5 test users to user_profiles table
-- ⚠️  IMPORTANT: These users must exist in auth.users table first!
--
-- The user_profiles table has a FOREIGN KEY constraint on user_id
-- that references auth.users(id). You cannot insert a user_id
-- that doesn't exist in auth.users.
--
-- SOLUTION:
-- 1. First, create these test accounts via MacroChef login/signup OR
-- 2. Register them via Supabase Auth dashboard, OR
-- 3. Use the query below which links to existing auth.users by email

-- Query to find existing auth.users and create profiles for them
INSERT INTO public.user_profiles (user_id, email, role, created_at)
SELECT 
  u.id,
  u.email,
  CASE 
    WHEN u.email = 'alice.test@example.com' THEN 'Admin'
    WHEN u.email = 'bob.tester@example.com' THEN 'Tester'
    WHEN u.email = 'charlie.user@example.com' THEN 'UserWithAdvertisement'
    WHEN u.email = 'diana.user@example.com' THEN 'UserWithAdvertisement'
    WHEN u.email = 'eve.admin@example.com' THEN 'Admin'
  END as role,
  NOW()
FROM auth.users u
WHERE u.email IN (
  'alice.test@example.com',
  'bob.tester@example.com', 
  'charlie.user@example.com',
  'diana.user@example.com',
  'eve.admin@example.com'
)
ON CONFLICT (user_id) DO NOTHING;

-- Verify insertion
SELECT p.user_id, p.email, p.role, p.created_at 
FROM public.user_profiles p
WHERE p.email IN ('alice.test@example.com', 'bob.tester@example.com', 'charlie.user@example.com', 'diana.user@example.com', 'eve.admin@example.com')
ORDER BY p.created_at DESC;

-- Debug: Show which auth.users exist
SELECT u.id, u.email
FROM auth.users u
WHERE u.email IN ('alice.test@example.com', 'bob.tester@example.com', 'charlie.user@example.com', 'diana.user@example.com', 'eve.admin@example.com');
