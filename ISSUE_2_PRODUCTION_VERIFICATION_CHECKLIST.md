# Issue #2 Production Verification Checklist
## End-to-End Authentication & Role-Based Access Control (RBAC)

**Target Domain:** https://macrochef.pl  
**Roles to Test:** Admin (mrakoczy@wp.pl), Tester, UserWithAdvertisement  
**Priority:** P0  
**Status:** Ready for production testing

---

## 📋 Pre-Test Setup

### Required Test Accounts
Ensure the following accounts exist in Supabase production (`xymudnmqahgayqvpznwz.supabase.co`):

| Email | Role | Access Level |
|-------|------|--------------|
| mrakoczy@wp.pl | Admin | Full recipe management + no ads |
| tester@macrochef.test | Tester | Read-only recipes + no ads |
| user.ads@macrochef.test | UserWithAdvertisement | Read-only recipes + ads shown |

**SQL Query to Verify in Supabase SQL Editor:**
```sql
SELECT user_id, email, role, created_at 
FROM public.user_profiles 
WHERE role IN ('Admin', 'Tester', 'UserWithAdvertisement')
ORDER BY role ASC;
```

**Expected Result:** 3 rows with the roles listed above and correct email addresses.

---

## 🔑 Test 1: Admin Role (mrakoczy@wp.pl)

### Authentication & Session Caching
- [ ] **Login:**
  1. Navigate to https://macrochef.pl
  2. Click "Account" button (top-right)
  3. Enter `mrakoczy@wp.pl` and password
  4. Verify login succeeds and AuthModal closes

- [ ] **DevTools Check (localStorage):**
  1. Press F12 to open DevTools
  2. Go to **Application > Local Storage > https://macrochef.pl**
  3. Look for key: `macrochef-verified-session`
  4. Click to view the value
  5. Verify it contains:
     ```json
     {
       "userId": "<UUID>",
       "email": "mrakoczy@wp.pl",
       "role": "Admin",
       "issuer": "https://xymudnmqahgayqvpznwz.supabase.co",
       "tenantId": "https://xymudnmqahgayqvpznwz.supabase.co"
     }
     ```

### Recipe Management UI
- [ ] **RecipeLibrary Actions (Visible to Admin):**
  1. Click "Recipes" tab
  2. Verify "Import Recipes" button **is visible** (green, upload icon)
  3. Verify "Create New Recipe" button **is visible** (emerald button with + icon)
  4. For each recipe card:
     - [ ] "Edit Recipe" pencil icon **is visible**
     - [ ] "Delete Recipe" trash icon **is visible**
  5. Verify read-only message **is NOT shown**

- [ ] **Ad Banner (Hidden for Admin):**
  1. Scroll to top of page
  2. Verify **no advertisement banner** appears (should not see "Ad Slot" or "Advertisement")

### Permission Verification (Browser Console)
Open **DevTools > Console** and run:
```javascript
window.MacroChef.permissions.canManageRecipes('Admin')  // Should return: true
window.MacroChef.permissions.showAds('Admin')           // Should return: false
```

---

## 🔑 Test 2: Tester Role

### Authentication & Session Caching
- [ ] **Login:**
  1. Sign out Admin (use Account → Logout or delete localStorage)
  2. Navigate to https://macrochef.pl
  3. Click "Account" button
  4. Enter `tester@macrochef.test` and password
  5. Verify login succeeds

- [ ] **DevTools Check (localStorage):**
  1. Press F12 to open DevTools
  2. Go to **Application > Local Storage > https://macrochef.pl**
  3. Verify `macrochef-verified-session` contains:
     ```json
     {
       "userId": "<UUID>",
       "email": "tester@macrochef.test",
       "role": "Tester",
       "issuer": "https://xymudnmqahgayqvpznwz.supabase.co",
       "tenantId": "https://xymudnmqahgayqvpznwz.supabase.co"
     }
     ```

### Recipe Management UI (Read-Only)
- [ ] **RecipeLibrary Actions (Hidden for Tester):**
  1. Click "Recipes" tab
  2. Verify "Import Recipes" button **is NOT visible**
  3. Verify "Create New Recipe" button **is NOT visible**
  4. Verify message **"Recipe library is read-only"** appears
  5. For each recipe card:
     - [ ] "Edit Recipe" pencil icon **is NOT visible**
     - [ ] "Delete Recipe" trash icon **is NOT visible**
     - [ ] "Batch Cook" button **IS visible** (teal button, still usable)

- [ ] **Ad Banner (Hidden for Tester):**
  1. Scroll to top of page
  2. Verify **no advertisement banner** appears

### Permission Verification (Browser Console)
```javascript
window.MacroChef.permissions.canManageRecipes('Tester')  // Should return: false
window.MacroChef.permissions.showAds('Tester')           // Should return: false
```

---

## 🔑 Test 3: UserWithAdvertisement Role

### Authentication & Session Caching
- [ ] **Login:**
  1. Sign out Tester
  2. Navigate to https://macrochef.pl
  3. Click "Account" button
  4. Enter `user.ads@macrochef.test` and password
  5. Verify login succeeds

- [ ] **DevTools Check (localStorage):**
  1. Press F12 to open DevTools
  2. Go to **Application > Local Storage > https://macrochef.pl**
  3. Verify `macrochef-verified-session` contains:
     ```json
     {
       "userId": "<UUID>",
       "email": "user.ads@macrochef.test",
       "role": "UserWithAdvertisement",
       "issuer": "https://xymudnmqahgayqvpznwz.supabase.co",
       "tenantId": "https://xymudnmqahgayqvpznwz.supabase.co"
     }
     ```

### Recipe Management UI (Read-Only, Same as Tester)
- [ ] **RecipeLibrary Actions (Hidden for UserWithAdvertisement):**
  1. Click "Recipes" tab
  2. Verify "Import Recipes" button **is NOT visible**
  3. Verify "Create New Recipe" button **is NOT visible**
  4. Verify message **"Recipe library is read-only"** appears
  5. For each recipe card:
     - [ ] "Edit Recipe" pencil icon **is NOT visible**
     - [ ] "Delete Recipe" trash icon **is NOT visible**
     - [ ] "Batch Cook" button **IS visible** (still usable)

### Ad Banner (VISIBLE for UserWithAdvertisement Only)
- [ ] **Ad Banner Display:**
  1. Scroll to top of page
  2. Verify advertisement banner **IS visible**
  3. Banner should show:
     - [ ] Label "Advertisement"
     - [ ] Placeholder text: "Ad Slot" (when online)
     - [ ] Fallback text: "MacroChef" + offline message (when offline)
  4. Banner styling:
     - [ ] Rounded corners (rounded-xl class)
     - [ ] Light gray border and background
     - [ ] Small text (text-xs)

### Permission Verification (Browser Console)
```javascript
window.MacroChef.permissions.canManageRecipes('UserWithAdvertisement')  // Should return: false
window.MacroChef.permissions.showAds('UserWithAdvertisement')           // Should return: true
```

---

## 🔑 Test 4: Guest Mode (Offline/Unauthenticated)

### Offline Access
- [ ] **Simulate Offline:**
  1. Open DevTools (F12)
  2. Go to **Network** tab
  3. Check the "Offline" checkbox
  4. Refresh page
  5. Verify page loads from Service Worker cache

- [ ] **Guest Mode Behavior:**
  1. Verify no login modal appears
  2. Verify all recipe management buttons **ARE visible** (Guest has full access offline)
  3. Verify no ad banner appears
  4. Open Console and run:
     ```javascript
     window.MacroChef.permissions.canManageRecipes('Guest')  // Should return: true
     window.MacroChef.permissions.showAds('Guest')           // Should return: false
     ```

### Offline Ad Banner Fallback
- [ ] **Ad Banner in Offline Mode (UserWithAdvertisement):**
  1. Sign in as UserWithAdvertisement first (while online)
  2. Go offline (DevTools > Network > Offline)
  3. Refresh page
  4. Verify cached session loads with UserWithAdvertisement role
  5. Verify ad banner **is visible** with offline fallback message
  6. Message should show: "MacroChef" + offline text (not "Ad Slot")

---

## 🗄️ Database Verification (Supabase SQL Editor)

### Check user_profiles Table
**SQL Query:**
```sql
SELECT 
  user_id,
  email,
  role,
  created_at,
  (SELECT COUNT(*) FROM public.recipes WHERE user_id = user_profiles.user_id) as recipe_count
FROM public.user_profiles
WHERE role IN ('Admin', 'Tester', 'UserWithAdvertisement')
ORDER BY role ASC;
```

**Expected Results:**
- mrakoczy@wp.pl: Admin role with recipe_count ≥ 0
- tester@macrochef.test: Tester role with recipe_count ≥ 0
- user.ads@macrochef.test: UserWithAdvertisement role with recipe_count ≥ 0

### Check RLS Policies Enforcement
**SQL Query to list RLS policies:**
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected Policies:**
- recipes: `recipes_select_own_or_admin_library`, `recipes_insert_admin`, `recipes_update_admin`, `recipes_delete_admin`
- products: `products_select_authenticated`, `products_insert_admin`, `products_update_admin`, `products_delete_admin`
- user_profiles: `user_profiles_select_own`
- planner: `planner_owner_all`
- goals: `goals_owner_all`

---

## 🔐 Security Checks

### LocalStorage Integrity
- [ ] **Verify session cache format:**
  1. Open DevTools Console
  2. Run:
     ```javascript
     const cached = JSON.parse(localStorage.getItem('macrochef-verified-session'));
     console.log('Role:', cached.role);
     console.log('Email:', cached.email);
     console.log('Issuer matches:', cached.issuer === 'https://xymudnmqahgayqvpznwz.supabase.co');
     ```
  3. Verify all fields are present and correct

### Supabase Client Verification
- [ ] **Verify Supabase client is configured:**
  1. Open DevTools Console
  2. Run:
     ```javascript
     window.MacroChef.supabase.enabled  // Should return: true
     window.MacroChef.supabase.mode     // Should return: 'online'
     window.MacroChef.supabaseClient    // Should be object with createClient method
     ```

### Permission Helpers
- [ ] **Verify all permissions work correctly:**
  1. Run in Console:
     ```javascript
     // Test all role combinations
     const roles = ['Admin', 'Tester', 'UserWithAdvertisement', 'Guest'];
     roles.forEach(r => {
       console.log(`${r}: canManage=${window.MacroChef.permissions.canManageRecipes(r)}, showAds=${window.MacroChef.permissions.showAds(r)}`);
     });
     ```
  2. Verify output matches expectations

---

## 📱 Cross-Device Verification

### Mobile (iOS Safari)
- [ ] **Test on iPhone/iPad:**
  1. Navigate to https://macrochef.pl
  2. Login as Admin
  3. Verify recipe management buttons appear
  4. Check localStorage (DevTools on iOS)
  5. Logout and login as Tester
  6. Verify read-only mode

### Mobile (Android Chrome)
- [ ] **Test on Android device/emulator:**
  1. Navigate to https://macrochef.pl
  2. Login as UserWithAdvertisement
  3. Verify ad banner appears
  4. Go to offline mode (airplane mode)
  5. Refresh page
  6. Verify offline fallback in ad banner

### Desktop (Windows/macOS/Linux)
- [ ] **Cross-browser testing:**
  1. Chrome: Login as Admin, verify all buttons visible
  2. Firefox: Login as Tester, verify read-only
  3. Safari: Login as UserWithAdvertisement, verify ads

---

## 🔄 Role Transition Testing

### Admin → Tester
- [ ] **Test role downgrade:**
  1. Login as Admin (mrakoczy@wp.pl)
  2. Verify "Import Recipes" button visible
  3. In Supabase SQL Editor, run:
     ```sql
     UPDATE public.user_profiles 
     SET role = 'Tester' 
     WHERE email = 'mrakoczy@wp.pl';
     ```
  4. Refresh browser (F5)
  5. Verify new session loads with role='Tester'
  6. Verify "Import Recipes" button **is hidden**
  7. Verify read-only message appears

### Tester → UserWithAdvertisement
- [ ] **Test role upgrade (different permission):**
  1. Login as Tester
  2. Verify **no ad banner** appears
  3. In Supabase SQL Editor, run:
     ```sql
     UPDATE public.user_profiles 
     SET role = 'UserWithAdvertisement' 
     WHERE email = 'tester@macrochef.test';
     ```
  4. Refresh browser
  5. Verify new session loads with role='UserWithAdvertisement'
  6. Verify ad banner **now appears**

---

## 📊 Performance & Stability

### Session Refresh Under Load
- [ ] **Rapid role queries:**
  1. Open Console
  2. Run:
     ```javascript
     async function stressTest() {
       for (let i = 0; i < 10; i++) {
         const session = await window.MacroChef.auth.getSessionAndRole();
         console.log(`Attempt ${i + 1}: ${session?.role || 'null'}`);
       }
     }
     stressTest();
     ```
  3. Verify no errors and consistent role returned

### Token Refresh
- [ ] **Supabase token auto-refresh:**
  1. Wait 5 minutes (or trigger manually in DevTools)
  2. Open Console
  3. Run:
     ```javascript
     await window.MacroChef.auth.getSessionAndRole();
     ```
  4. Verify session remains valid with same role

### Logout Integrity
- [ ] **Logout clears session:**
  1. Click "Account" button
  2. Click "Logout"
  3. Verify `macrochef-verified-session` removed from localStorage
  4. Verify `macrochef-supabase-session` removed from localStorage
  5. Verify page resets to guest mode

---

## ✅ Final Verification Checklist

Complete this checklist and sign off:

| Item | Status | Notes |
|------|--------|-------|
| Admin role: Full access verified | ☐ | |
| Admin role: No ads visible | ☐ | |
| Tester role: Read-only verified | ☐ | |
| Tester role: No ads visible | ☐ | |
| UserWithAdvertisement role: Read-only verified | ☐ | |
| UserWithAdvertisement role: Ads visible | ☐ | |
| Guest mode: Offline access works | ☐ | |
| Permission helpers all work correctly | ☐ | |
| localStorage cache format correct | ☐ | |
| Database user_profiles contain all 3 roles | ☐ | |
| RLS policies enforced on recipes/products | ☐ | |
| Role transitions work correctly | ☐ | |
| Mobile (iOS) tested | ☐ | |
| Mobile (Android) tested | ☐ | |
| Desktop browsers tested | ☐ | |
| Ad banner offline fallback works | ☐ | |
| Session auto-refresh works | ☐ | |
| Logout clears session properly | ☐ | |

**Verified by:** ________________  
**Date:** ________________  
**Status:** ☐ PASS ☐ FAIL  

---

## 📝 Known Issues & Workarounds

### Issue: Ad banner doesn't appear immediately after role change
**Workaround:** Refresh page (F5) to reload session cache

### Issue: localStorage shows old role briefly
**Workaround:** This is normal during role transition; session will refresh on next request

### Issue: RLS policy appears missing in `pg_policies`
**Workaround:** Check that policies are on the correct table and schema (should be `public.*`)

---

## 🚀 Sign-Off

Once all tests pass:
1. ✅ Record test date and tester name above
2. ✅ Update GitHub Issue #2 with results
3. ✅ Mark issue as verified/closed
4. ✅ Archive this checklist in project documentation

**Issue #2 Production-Ready:** YES ☐ / NO ☐

---

**Document Version:** 1.0  
**Created:** 2026-11-14  
**Last Updated:** 2026-11-14
