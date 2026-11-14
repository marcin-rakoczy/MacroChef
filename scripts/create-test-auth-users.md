# Create Test Auth Users for Admin Panel

The `user_profiles` table has a **foreign key constraint** on `user_id` that requires the user to exist in `auth.users` table first.

## Method 1: Register via MacroChef App (Easiest)

1. Open http://localhost:8000/index.html
2. Click "Zarejestruj się" (Register)
3. Enter email and password for each test user:
   - `alice.test@example.com` / `password123` → (Will be set to Admin later)
   - `bob.tester@example.com` / `password123` → (Will be set to Tester later)
   - `charlie.user@example.com` / `password123` → (Will be set to UserWithAdvertisement later)
   - `diana.user@example.com` / `password123` → (Will be set to UserWithAdvertisement later)
   - `eve.admin@example.com` / `password123` → (Will be set to Admin later)

4. Accept the "Copy guest recipes" dialog for each registration
5. This automatically creates both `auth.users` entry and `user_profiles` entry

## Method 2: Create via Supabase Auth API (Advanced)

Use the Supabase Admin Auth API to create users directly:

```bash
curl -X POST "https://xymudnmqahgayqvpznwz.supabase.co/auth/v1/admin/users" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.test@example.com",
    "password": "password123",
    "email_confirm": true
  }'
```

**Note**: Replace `<SERVICE_ROLE_KEY>` with your Supabase service role key (⚠️ Keep this secret!)

## Method 3: Update Existing Users via SQL (After Method 1 or 2)

Once users exist in `auth.users`, run this SQL in Supabase SQL Editor:

```sql
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
```

## Recommendation

**Use Method 1** (Register via app):
- ✅ Creates both auth.users and user_profiles automatically
- ✅ Tests the registration flow
- ✅ No need for service role keys
- ✅ Can verify roles work immediately after

Then verify the roles are set correctly in Supabase Table Editor.
