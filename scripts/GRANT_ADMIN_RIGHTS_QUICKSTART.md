# 🔐 Grant Admin Rights - Quick Start Guide

## ⚡ Fastest Way: Supabase SQL Editor (2 minutes)

### Step 1: Go to Supabase Dashboard
```
https://app.supabase.com/
```
Login with: `mrakoczy@wp.pl`

### Step 2: Select Project
- **For TEST environment**: Click on `macrochef-test`
- **For PROD environment**: Click on `macrochef-prod`

### Step 3: Open SQL Editor
Left sidebar → **SQL Editor** → Click **New Query**

### Step 4: Paste Script
```sql
-- Replace 'email@example.com' with actual email
UPDATE public.user_profiles
SET role = 'Admin'
WHERE email = 'email@example.com';

-- Create profile if it doesn't exist
INSERT INTO public.user_profiles (user_id, email, role, created_at)
SELECT u.id, u.email, 'Admin', NOW()
FROM auth.users u
WHERE u.email = 'email@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = u.id
  );

-- Verify
SELECT u.id, u.email, p.role, p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = 'email@example.com';
```

### Step 5: Execute
- Press **Ctrl+Enter** or click **Run**
- Last SELECT should show: `role = 'Admin'`

---

## 💻 Using Node.js Script

### Prerequisites
```bash
# Install dependencies
npm install

# Set environment variables (Windows PowerShell)
$env:SUPABASE_TEST_SERVICE_KEY = "your_key_here"
$env:SUPABASE_PROD_SERVICE_KEY = "your_key_here"
```

### Run Script
```bash
# Interactive mode (recommended)
node scripts/grant-admin-rights-interactive.js

# Or non-interactive
node scripts/grant-admin-rights.js --email admin@example.com --env TEST
```

### Get Service Keys
1. Go to Supabase project → **Settings**
2. Click **API**
3. Copy **Service Role Secret** (scroll down to "Project API keys")
4. Set as environment variable

---

## 📝 Real Examples

### Example 1: Make mrakoczy@wp.pl Admin on PROD
```sql
UPDATE public.user_profiles
SET role = 'Admin'
WHERE email = 'mrakoczy@wp.pl';

SELECT * FROM public.user_profiles WHERE email = 'mrakoczy@wp.pl';
```

### Example 2: Add multiple admins
```sql
UPDATE public.user_profiles
SET role = 'Admin'
WHERE email IN ('admin1@example.com', 'admin2@example.com');

SELECT * FROM public.user_profiles WHERE role = 'Admin' ORDER BY created_at DESC;
```

### Example 3: View all admins
```sql
SELECT u.id, u.email, p.role, p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE p.role = 'Admin'
ORDER BY p.created_at DESC;
```

---

## 🎯 What Admin Gets

| Feature | Admin | Tester | User+Ads |
|---------|:----:|:------:|:--------:|
| View recipes | ✅ | ✅ | ✅ |
| Import recipes | ✅ | ❌ | ❌ |
| Create recipes | ✅ | ❌ | ❌ |
| Edit recipes | ✅ | ❌ | ❌ |
| Delete recipes | ✅ | ❌ | ❌ |
| Manage products | ✅ | ❌ | ❌ |
| Admin panel | ✅ | ❌ | ❌ |
| Ads (AdBanner) | ❌ | ❌ | ✅ |

---

## ⚠️ Common Issues

### "User not found"
**Problem**: Email doesn't exist in `auth.users`
**Solution**: 
1. Have user sign up on MacroChef first
2. Or create them in Supabase: Auth Users → Add User

### "Foreign key constraint violation"
**Problem**: User ID doesn't exist in `auth.users`
**Solution**: Make sure user email matches exactly (case-sensitive!)

### "Permission denied"
**Problem**: Using wrong API key
**Solution**:
- Use **Service Role Secret** (not Anon Key)
- Set environment variable correctly

### "No response" on SQL Editor
**Problem**: Query timeout
**Solution**:
1. Reload the page
2. Try again
3. Check internet connection

---

## 🔑 Service Key Locations

### For PROD (macrochef-prod)
```
Supabase → macrochef-prod → Settings → API → Service Role Secret
```
**URL**: `https://xymudnmqahgayqvpznwz.supabase.co`

### For TEST (macrochef-test)
```
Supabase → macrochef-test → Settings → API → Service Role Secret
```
**URL**: `https://pcjlrcuyhtqoijtkrlyj.supabase.co`

---

## 🚀 Scripts Available

| Script | Purpose | Usage |
|--------|---------|-------|
| `grant-admin-rights.sql` | SQL template | Copy to SQL Editor |
| `grant-admin-rights.js` | CLI tool | `node scripts/grant-admin-rights.js --email X --env Y` |
| `grant-admin-rights-interactive.js` | Interactive CLI | `node scripts/grant-admin-rights-interactive.js` |
| `grant-admin-rights.sh` | Bash wrapper | `bash scripts/grant-admin-rights.sh` |

---

## 📞 Need Help?

Check the detailed README:
```bash
cat scripts/GRANT_ADMIN_RIGHTS_README.md
```
