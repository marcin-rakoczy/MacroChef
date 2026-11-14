# Admin Panel Setup Migration Guide

## Overview
This guide explains how to set up the Admin Panel feature in MacroChef by configuring Supabase RLS policies to allow authenticated admins to manage users, recipes, and products.

## Prerequisites
- Access to Supabase Dashboard for your MacroChef project
- At least one user with `Admin` role already in the database
- The Admin Panel components are already deployed (see `js/components/AdminPanel.js`, `AdminUsers.js`, etc.)

## Step 1: Enable Admin User Management via RLS Policies

### Instructions:
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the content from [`scripts/enable-admin-user-management.sql`](./scripts/enable-admin-user-management.sql)
3. Paste into the SQL editor
4. Click **Run**
5. Verify the output shows all RLS policies created successfully

### What this does:
- ✅ Allows admins to **INSERT** new user profiles
- ✅ Allows admins to **UPDATE** user profiles (change roles, etc.)
- ✅ Allows admins to **DELETE** user profiles
- ✅ Allows admins to **READ** all user profiles
- ✅ Allows regular users to read/edit only their own profile

### RLS Policies Created:
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `Allow admins to insert users` | INSERT | Auth user is Admin |
| `Allow admins to update users` | UPDATE | Auth user is Admin |
| `Allow admins to delete users` | DELETE | Auth user is Admin |
| `Allow admins to read all users` | SELECT | Auth user is Admin OR user's own profile |

## Step 2: Add Test Users to Database

### Option A: Using SQL (Recommended for bulk insert)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the content from [`scripts/add-test-users.sql`](./scripts/add-test-users.sql)
3. Paste into the SQL editor
4. Click **Run**

This adds 5 test users with various roles:
- `alice.test@example.com` (Admin)
- `bob.tester@example.com` (Tester)
- `charlie.user@example.com` (UserWithAdvertisement)
- `diana.user@example.com` (UserWithAdvertisement)
- `eve.admin@example.com` (Admin)

**Note**: Valid roles in the database are: `Admin`, `Tester`, `UserWithAdvertisement`. The `Guest` role is not allowed by the database constraint.

### Option B: Using Supabase Admin UI

1. Go to **Supabase Dashboard** → **Table Editor**
2. Select `user_profiles` table
3. Click **+ New Row**
4. Fill in fields:
   - `user_id`: Generate UUID (click the icon)
   - `email`: Enter test email
   - `role`: Select from dropdown
   - `created_at`: Auto-filled with current timestamp
5. Repeat 4 more times for 5 users total

### Option C: Using MacroChef Admin Panel UI

Once RLS policies are enabled and you have at least one admin user:
1. Log in with admin credentials
2. Click **Admin** tab in navigation
3. Go to **Użytkownicy** (Users) sub-tab
4. ⚠️ This requires the AdminUsers component to have an "Add User" form (currently not implemented)

## Step 3: Test the Admin Panel

### Prerequisites:
- At least one user logged in with `Admin` role
- Test users created in database (Step 2)

### Testing Steps:

1. **Open the app**: http://localhost:8000/index.html
2. **Log in** with an admin user (e.g., `alice.test@example.com`)
3. **Verify Admin tab appears** in navigation (top or bottom depending on screen size)
4. **Click Admin tab** → You should see three sub-tabs:
   - **Użytkownicy** (Users) - PL / **Users** - EN
   - **Przepisy** (Recipes) - PL / **Recipes** - EN
   - **Produkty** (Products) - PL / **Products** - EN

### Test Users Management:
1. Go to **Users** sub-tab
2. Verify you can see all test users in the table
3. **Test role change**:
   - Click the role dropdown for any user
   - Select a different role
   - Verify the table updates immediately
4. **Test bulk operations**:
   - Select multiple users (checkboxes)
   - Choose "Change Role" from Action dropdown
   - Select new role and click "Apply"
   - Verify all selected users' roles changed
5. **Test delete** (use with caution):
   - Select a user
   - Click Delete button
   - Confirm the action
   - Verify user is removed from table

### Test Recipes Management:
1. Go to **Recipes** sub-tab
2. Click "Import Recipes" to test CSV import
3. Sample CSV format:
   ```
   name,calories,protein,carbs,fat,ingredients
   Pasta Carbonara,450,25,55,12,"pasta;eggs;bacon;cream"
   Greek Salad,200,15,18,10,"lettuce;tomato;feta;olive oil"
   ```

### Test Products Management:
1. Go to **Products** sub-tab
2. Click "Import Products" to test CSV import
3. Sample CSV format:
   ```
   name,price,calories,protein,carbs,fat,shop
   Chicken Breast,25.99,165,31,0,3.6,"Tesco"
   Brown Rice,8.99,111,3,23,1,"Lidl"
   ```

## Step 4: Troubleshooting

### Issue: Admin tab doesn't appear
**Solution**: 
- Verify user's role is set to `Admin` in `user_profiles` table
- Check browser console (F12) for errors
- Verify `js/components/Navigation.js` is loaded correctly

### Issue: "Permission denied for table user_profiles"
**Solution**:
- Run the RLS policy migration (`enable-admin-user-management.sql`)
- Verify RLS is enabled on the table
- Check that the current user has `Admin` role

### Issue: Users table shows "No users found"
**Solution**:
- Add test users using `add-test-users.sql`
- Verify users are actually in the database (check Table Editor)
- Clear browser cache and refresh

### Issue: CSV import fails
**Solution**:
- Verify CSV headers match expected format
- Check for extra whitespace or blank rows
- Review browser console for parsing errors

## Performance Considerations

- **User list loading**: For 1000+ users, consider implementing pagination
- **Bulk operations**: Large bulk deletes (100+) may take time; add progress indicator
- **CSV import**: Large files (10K+ rows) should be processed in chunks

## Security Notes

⚠️ **Important**:
- RLS policies only work with authenticated users (not guests)
- Service-to-service operations should use service role key
- Always verify user role on backend before performing admin actions
- CSV imports should validate data before inserting into database

## Next Steps

1. ✅ Run RLS policy migration
2. ✅ Add test users
3. ✅ Test Admin Panel UI
4. ✅ Deploy to production
5. 📋 (Optional) Add audit logging for admin actions
6. 📋 (Optional) Implement user creation form in Admin Panel
7. 📋 (Optional) Add batch CSV export functionality

## Files Involved

- `js/components/AdminPanel.js` - Main tab container
- `js/components/AdminUsers.js` - User CRUD + bulk operations
- `js/components/AdminRecipes.js` - Recipe import + management
- `js/components/AdminProducts.js` - Product import + bulk edit
- `js/i18n/translations.js` - PL/EN admin translations
- `scripts/enable-admin-user-management.sql` - RLS policy migration
- `scripts/add-test-users.sql` - Test data SQL

## Questions?

Refer to:
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
- Repository issue #3 (Admin Panel Implementation)
