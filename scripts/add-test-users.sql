-- Add 5 test users to user_profiles table
-- Run this in Supabase SQL editor (as authenticated user with proper permissions)

INSERT INTO public.user_profiles (user_id, email, role, created_at)
VALUES
  ('740100dc-4a1c-4c0e-8dcc-056a33f333c7', 'alice.test@example.com', 'Admin', NOW()),
  ('beb6d6d6-62f5-4777-b711-808d988abd07', 'bob.tester@example.com', 'Tester', NOW()),
  ('74ad8edd-13bf-48e6-a9fb-c1495643de77', 'charlie.user@example.com', 'UserWithAdvertisement', NOW()),
  ('8c1d8d41-1ed0-427d-8961-b008de26249e', 'diana.guest@example.com', 'Guest', NOW()),
  ('d14ad94b-859b-4ca4-b557-a9c37af22b31', 'eve.admin@example.com', 'Admin', NOW());

-- Verify insertion
SELECT user_id, email, role, created_at FROM public.user_profiles 
WHERE email IN ('alice.test@example.com', 'bob.tester@example.com', 'charlie.user@example.com', 'diana.guest@example.com', 'eve.admin@example.com')
ORDER BY created_at DESC;
