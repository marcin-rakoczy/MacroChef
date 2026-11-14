# Admin Panel Implementation Summary

## What Was Done

### 1. Created Admin Panel Components
- **AdminPanel.js** - Main container with tab navigation (Users/Recipes/Products)
- **AdminUsers.js** - User management (CRUD + bulk operations)
- **AdminRecipes.js** - Recipe import and bulk delete
- **AdminProducts.js** - Product import and bulk edit

### 2. Added Translations (EN/PL)
- 40+ new translation keys in `i18n/translations.js`
- `adminPanel` key for the tab label

### 3. Integrated into Navigation
- Admin Panel tab only visible for `role === 'Admin'`
- Tab shows shield icon + "Admin Panel" label
- Added to both mobile and desktop navigation

### 4. Architecture follows MacroChef patterns
- ✅ No-bundler design (CDN scripts + Babel standalone)
- ✅ Components use `window.React` and `window.Babel`
- ✅ Database access via `window.MacroChef.supabaseClient`
- ✅ Globals namespace: `window.MacroChef.components`
- ✅ Translations via `window.MacroChef.TRANSLATIONS`

## Current Status

### Working
- ✅ Admin Panel UI components render correctly
- ✅ Admin tab appears for Admin users
- ✅ Layout and styling (Tailwind + Lucide icons)
- ✅ Error handling and loading states

### Blocked by RLS Permissions
- ❌ Admin operations fail with "permission denied" (RLS policies)
- ❌ User profile lookups fail when loading Admin Panel
- ❌ Creating test users fails without proper RLS setup

## Solution: RLS Configuration Required

### The Problem
The current RLS policies restrict updates to `user_id = auth.uid()`:
- Users can only manage their own profile
- Admins can't update other users' profiles
- Checking admin status via `user_profiles.role` causes infinite recursion

### The Solution
See `ADMIN_PANEL_SETUP_RLS.md` for step-by-step instructions to:

1. Create a separate `admin_users` table (avoids recursion)
2. Define an `is_admin()` helper function
3. Update RLS policies to grant admins full access
4. Bootstrap the first admin user

### Quick Fix (Single SQL command)
Run `scripts/setup-admin-operations.sql` in Supabase SQL Editor

## Files Created/Modified

### New Files
- `js/components/AdminPanel.js`
- `js/components/AdminUsers.js`
- `js/components/AdminRecipes.js`
- `js/components/AdminProducts.js`
- `ADMIN_PANEL_SETUP_RLS.md`
- `scripts/setup-admin-operations.sql`
- `scripts/allow-self-profile-update.sql`
- `scripts/fix-rls-policies.sql`
- `scripts/create-test-admin-profile.sql`

### Modified Files
- `js/i18n/translations.js` - Added 40+ translations
- `js/components/Navigation.js` - Added Admin tab
- `js/app.js` - Added AdminPanel import + admin case
- `index.html` - Added 4 script tags
- `build.js` - Added 4 admin components

## Testing Checklist

After running the RLS migration SQL:

- [ ] Log in with admin account
- [ ] Verify "Admin Panel" tab appears
- [ ] Click Admin Panel → Users tab
  - [ ] Users list loads (no blank page)
  - [ ] Can change roles
  - [ ] Can delete users
  - [ ] Bulk operations work
- [ ] Click Admin Panel → Recipes tab
  - [ ] Recipes list loads
  - [ ] Can import CSV
  - [ ] Can bulk delete
- [ ] Click Admin Panel → Products tab
  - [ ] Products list loads
  - [ ] Can import CSV
  - [ ] Can bulk edit

## Next Steps

1. **Apply RLS Migration**
   - Go to Supabase Dashboard → SQL Editor
   - Run `scripts/setup-admin-operations.sql`
   
2. **Create Admin Profile**
   - Get admin user ID from Supabase Auth tab
   - Insert into `user_profiles` with `role='Admin'`
   
3. **Test Admin Panel**
   - Log in and verify Admin Panel tab appears
   - Test each sub-tab
   
4. **Add Test Users** (optional)
   - Use Admin Panel Users tab to create/manage test users
   - Or use `scripts/add-test-users.sql`

## Debugging

### Admin Panel tab not visible
```sql
SELECT * FROM public.user_profiles WHERE email = 'your-email';
-- Should show: role = 'Admin'
```

### Users tab loads but blank
- Check browser console (F12) for errors
- Verify `user_profiles` table has data
- Check if RLS policy allows SELECT

### Users tab shows "permission denied"
- Run RLS migration: `scripts/setup-admin-operations.sql`
- Verify user is in `admin_users` table
- Check RLS policy was created: `SELECT * FROM pg_policies WHERE tablename = 'user_profiles';`

## Architecture Decisions

### Why separate `admin_users` table?
- **Avoids infinite recursion**: Checking `user_profiles.role` in RLS policy caused recursion errors
- **Clear source of truth**: Admin status is explicit in a separate table
- **Flexible**: Can add more fine-grained permissions later
- **Secure**: Admins designated server-side, not easily manipulated from client

### Why move role checks to app layer?
- **Consistency**: React component checks `session?.role` before rendering
- **Simplicity**: Easier to debug than complex RLS policies
- **UX**: Better error messages and loading states in components

### Trade-offs
- ⚠️ RLS is simpler than it could be (all auth users can read all profiles)
- ⚠️ Admin enforcement depends on both RLS AND app-layer checks
- ✅ Trade-off is acceptable for admin-only operations (not user-facing data)
