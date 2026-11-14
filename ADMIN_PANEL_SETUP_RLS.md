# Admin Panel RLS Setup Guide

## Problem
The current RLS policies on `user_profiles` prevent Admin Panel from working because:
1. Regular RLS policies only allow users to update their own profiles
2. Creating a policy that checks `user_profiles.role` causes infinite recursion
3. The service role key is not available from the browser client

## Solution
Use a separate `admin_users` table to track admin status, avoiding infinite recursion.

## Steps to Apply

### 1. Open Supabase SQL Editor
- Go to https://supabase.com/dashboard/project/your-project
- Click **SQL Editor** in the left sidebar
- Click **New Query**

### 2. Run the Setup SQL
Copy and paste the contents of `scripts/setup-admin-operations.sql` into the SQL Editor and click **Run**.

This script:
- Creates an `admin_users` table
- Creates an `is_admin()` helper function
- Updates RLS policies to use the admin check
- Bootstraps the first admin user (`mrakoczy@wp.pl`)

### 3. Verify Setup
In the SQL Editor, run:
```sql
SELECT is_admin(auth.uid());
SELECT * FROM public.admin_users;
SELECT * FROM public.user_profiles LIMIT 5;
```

### 4. Create Admin User Profile
You need to create a profile for the admin user in `user_profiles`. Run:
```sql
-- First, verify the auth user exists
SELECT id, email FROM auth.users WHERE email = 'mrakoczy@wp.pl' LIMIT 1;

-- Then create their profile (replace UUID with the id from above)
INSERT INTO public.user_profiles (user_id, email, role, created_at)
VALUES (
  'YOUR-USER-ID-HERE'::uuid,
  'mrakoczy@wp.pl',
  'Admin',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'Admin';
```

### 5. Test in App
1. Log in with your admin account
2. You should now see the **Admin Panel** tab
3. The Admin Panel should allow you to:
   - View all users
   - Change user roles
   - Delete users
   - Import recipes and products

## Troubleshooting

### "Policy for operation not found"
- Verify the RLS policies were created: `SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles';`
- Should see: `user_read_policy`, `user_insert_policy`, `user_update_policy`, `user_delete_policy`

### Admin Panel still shows blank
- Check browser console for errors (F12 > Console tab)
- Verify your user role: `SELECT role FROM public.user_profiles WHERE email = 'your-email';`
- Verify you're in `admin_users`: `SELECT * FROM public.admin_users;`

### "permission denied for table"
- Verify RLS is still enabled: `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_profiles';`
- Should show `rowsecurity = true`

## Architecture Notes

**Why separate `admin_users` table?**
- RLS policies that check `user_profiles.role` cause infinite recursion
- By using a separate table, we avoid this circular dependency
- The `is_admin()` function runs with `SECURITY DEFINER`, so it bypasses RLS

**Security implications:**
- Admins are designated in the `admin_users` table, not by their `user_profiles.role`
- This creates a source-of-truth for who can perform admin operations
- The `user_profiles.role` is now more for display/categorization purposes

**Future improvements:**
- Could sync `admin_users` with `user_profiles.role` automatically
- Could create a more granular permission system based on roles
- Could implement audit logging for admin operations
