-- Grant Admin role to a specific email address
-- Usage: Replace 'email@example.com' with the target email address
-- Then run this script against the Supabase database

-- Update user_profiles role to 'Admin' by email
UPDATE public.user_profiles
SET role = 'Admin'
WHERE email = 'email@example.com'
  AND role != 'Admin';

-- Verify the update
SELECT user_id, email, role, created_at 
FROM public.user_profiles
WHERE email = 'email@example.com';

-- If the email doesn't exist in user_profiles, create the profile
-- (only works if the user already exists in auth.users)
INSERT INTO public.user_profiles (user_id, email, role, created_at)
SELECT u.id, u.email, 'Admin', NOW()
FROM auth.users u
WHERE u.email = 'email@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = u.id
  );

-- Final verification
SELECT u.id as user_id, u.email, p.role
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = 'email@example.com';
