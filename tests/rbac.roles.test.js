// RBAC Role-Based Access Control Tests
// Tests all 3 roles: Admin, Tester, UserWithAdvertisement
// Verifies permission helpers, session/role caching, and UI visibility rules

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const authSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');
const permissionsSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'permissions.js'), 'utf8');

// Test data for all 3 roles
const TEST_ROLES = {
  Admin: {
    userId: 'admin-uuid-001',
    email: 'mrakoczy@wp.pl',
    role: 'Admin',
    canManageRecipes: true,
    showAds: false,
    description: 'Admin: Full access to recipe management'
  },
  Tester: {
    userId: 'tester-uuid-002',
    email: 'tester@macrochef.test',
    role: 'Tester',
    canManageRecipes: false,
    showAds: false,
    description: 'Tester: Read-only access, no ads'
  },
  UserWithAdvertisement: {
    userId: 'user-ads-uuid-003',
    email: 'user.ads@macrochef.test',
    role: 'UserWithAdvertisement',
    canManageRecipes: false,
    showAds: true,
    description: 'UserWithAdvertisement: Read-only access, sees ads'
  },
  Guest: {
    userId: null,
    email: null,
    role: 'Guest',
    canManageRecipes: true,
    showAds: false,
    description: 'Guest: Full access (offline mode)'
  }
};

function setupAuth(testRole) {
  const store = new Map();
  const events = {};
  const navigator = { onLine: true };
  let authCallback;
  let currentUser = testRole.userId ? { id: testRole.userId, email: testRole.email } : null;
  let role = testRole.role;
  let session = testRole.userId ? { access_token: 'test-token' } : null;
  let stopped = 0;

  const localStorage = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key)
  };

  const client = {
    supabaseUrl: 'https://xymudnmqahgayqvpznwz.supabase.co',
    auth: {
      onAuthStateChange(callback) { authCallback = callback; },
      async getSession() {
        return {
          data: { session },
          error: null
        };
      },
      async getUser() {
        if (!currentUser) {
          return { data: { user: null }, error: null };
        }
        return { data: { user: currentUser }, error: null };
      },
      async signInWithPassword() {
        return { data: { session }, error: null };
      },
      async signUp() {
        return { data: { session: null }, error: null };
      },
      async signOut() {
        session = null;
        return { error: null };
      },
      startAutoRefresh() {},
      stopAutoRefresh() { stopped++; }
    },
    from(table) {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: (field, id) => {
              return {
                single: async () => {
                  if (!currentUser) {
                    return { data: null, error: { status: 401 } };
                  }
                  return { data: { role }, error: null };
                }
              };
            }
          })
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }
  };

  const window = {
    MacroChef: { supabaseClient: client },
    addEventListener(name, callback) { events[name] = callback; },
    setTimeout
  };

  vm.runInNewContext(authSource, { window, navigator, localStorage, console });

  return {
    auth: window.MacroChef.auth,
    navigator,
    store,
    client,
    events,
    setUser: (user) => { currentUser = user; },
    setRole: (value) => { role = value; },
    setSession: (value) => { session = value; },
    emit: (event) => authCallback(event),
    stopped: () => stopped
  };
}

function setupPermissions() {
  const window = { MacroChef: {} };
  vm.runInNewContext(permissionsSource, { window });
  return window.MacroChef.permissions;
}

(async () => {
  console.log('========== ROLE-BASED ACCESS CONTROL TESTS ==========\n');

  // Test 1: Permission helpers function correctly for all roles
  console.log('Test 1: Permission helpers for all roles');
  const permissions = setupPermissions();

  for (const [roleName, roleData] of Object.entries(TEST_ROLES)) {
    const canManage = permissions.canManageRecipes(roleData.role);
    const showAds = permissions.showAds(roleData.role);

    assert.equal(
      canManage,
      roleData.canManageRecipes,
      `${roleName}: canManageRecipes expected ${roleData.canManageRecipes}, got ${canManage}`
    );

    assert.equal(
      showAds,
      roleData.showAds,
      `${roleName}: showAds expected ${roleData.showAds}, got ${showAds}`
    );

    console.log(`  ✓ ${roleName}: canManageRecipes=${canManage}, showAds=${showAds}`);
  }
  console.log();

  // Test 2: Admin role can fetch session and get Admin permissions
  console.log('Test 2: Admin role authentication and caching');
  const adminCtx = setupAuth(TEST_ROLES.Admin);
  const adminSession = await adminCtx.auth.getSessionAndRole();

  assert.equal(adminSession.userId, TEST_ROLES.Admin.userId);
  assert.equal(adminSession.email, TEST_ROLES.Admin.email);
  assert.equal(adminSession.role, 'Admin');
  assert.equal(adminSession.offline, false);

  // Verify Admin is cached in localStorage
  const adminCached = JSON.parse(adminCtx.store.get('macrochef-verified-session'));
  assert.equal(adminCached.role, 'Admin');
  assert.equal(adminCached.userId, TEST_ROLES.Admin.userId);
  console.log(`  ✓ Admin authenticated and cached with role='Admin'`);
  console.log();

  // Test 3: Tester role can fetch session and get Tester permissions
  console.log('Test 3: Tester role authentication and caching');
  const testerCtx = setupAuth(TEST_ROLES.Tester);
  const testerSession = await testerCtx.auth.getSessionAndRole();

  assert.equal(testerSession.userId, TEST_ROLES.Tester.userId);
  assert.equal(testerSession.email, TEST_ROLES.Tester.email);
  assert.equal(testerSession.role, 'Tester');
  assert.equal(testerSession.offline, false);

  // Verify Tester is cached in localStorage
  const testerCached = JSON.parse(testerCtx.store.get('macrochef-verified-session'));
  assert.equal(testerCached.role, 'Tester');
  assert.equal(testerCached.userId, TEST_ROLES.Tester.userId);
  console.log(`  ✓ Tester authenticated and cached with role='Tester'`);
  console.log();

  // Test 4: UserWithAdvertisement role can fetch session and get correct permissions
  console.log('Test 4: UserWithAdvertisement role authentication and caching');
  const userAdsCtx = setupAuth(TEST_ROLES.UserWithAdvertisement);
  const userAdsSession = await userAdsCtx.auth.getSessionAndRole();

  assert.equal(userAdsSession.userId, TEST_ROLES.UserWithAdvertisement.userId);
  assert.equal(userAdsSession.email, TEST_ROLES.UserWithAdvertisement.email);
  assert.equal(userAdsSession.role, 'UserWithAdvertisement');
  assert.equal(userAdsSession.offline, false);

  // Verify UserWithAdvertisement is cached in localStorage
  const userAdsCached = JSON.parse(userAdsCtx.store.get('macrochef-verified-session'));
  assert.equal(userAdsCached.role, 'UserWithAdvertisement');
  assert.equal(userAdsCached.userId, TEST_ROLES.UserWithAdvertisement.userId);
  console.log(`  ✓ UserWithAdvertisement authenticated and cached with role='UserWithAdvertisement'`);
  console.log();

  // Test 5: Permission enforcement - Admin can manage recipes
  console.log('Test 5: Permission enforcement for Admin');
  const adminPerms = permissions.canManageRecipes('Admin');
  assert.equal(adminPerms, true);
  console.log(`  ✓ Admin has canManageRecipes=true`);
  console.log();

  // Test 6: Permission enforcement - Tester cannot manage recipes
  console.log('Test 6: Permission enforcement for Tester');
  const testerPerms = permissions.canManageRecipes('Tester');
  assert.equal(testerPerms, false);
  console.log(`  ✓ Tester has canManageRecipes=false (read-only)`);
  console.log();

  // Test 7: Permission enforcement - UserWithAdvertisement cannot manage recipes but sees ads
  console.log('Test 7: Permission enforcement for UserWithAdvertisement');
  const userAdsManage = permissions.canManageRecipes('UserWithAdvertisement');
  const userAdsAds = permissions.showAds('UserWithAdvertisement');
  assert.equal(userAdsManage, false);
  assert.equal(userAdsAds, true);
  console.log(`  ✓ UserWithAdvertisement has canManageRecipes=false (read-only) and showAds=true`);
  console.log();

  // Test 8: Ad banner visibility
  console.log('Test 8: Ad banner visibility rules');
  assert.equal(permissions.showAds('Admin'), false, 'Admin should not see ads');
  assert.equal(permissions.showAds('Tester'), false, 'Tester should not see ads');
  assert.equal(permissions.showAds('UserWithAdvertisement'), true, 'UserWithAdvertisement should see ads');
  assert.equal(permissions.showAds('Guest'), false, 'Guest should not see ads');
  console.log(`  ✓ Ad banner visibility: Admin(no), Tester(no), UserWithAdvertisement(yes), Guest(no)`);
  console.log();

  // Test 9: Offline mode - Admin can still access cached session
  console.log('Test 9: Offline mode caching for Admin');
  adminCtx.navigator.onLine = false;
  const offlineAdmin = await adminCtx.auth.getSessionAndRole();
  assert.equal(offlineAdmin.userId, TEST_ROLES.Admin.userId);
  assert.equal(offlineAdmin.role, 'Admin');
  assert.equal(offlineAdmin.offline, true);
  console.log(`  ✓ Admin can access cached session while offline`);
  console.log();

  // Test 10: Offline mode - Tester can still access cached session
  console.log('Test 10: Offline mode caching for Tester');
  testerCtx.navigator.onLine = false;
  const offlineTester = await testerCtx.auth.getSessionAndRole();
  assert.equal(offlineTester.userId, TEST_ROLES.Tester.userId);
  assert.equal(offlineTester.role, 'Tester');
  assert.equal(offlineTester.offline, true);
  console.log(`  ✓ Tester can access cached session while offline`);
  console.log();

  // Test 11: Offline mode - UserWithAdvertisement can still access cached session
  console.log('Test 11: Offline mode caching for UserWithAdvertisement');
  userAdsCtx.navigator.onLine = false;
  const offlineUserAds = await userAdsCtx.auth.getSessionAndRole();
  assert.equal(offlineUserAds.userId, TEST_ROLES.UserWithAdvertisement.userId);
  assert.equal(offlineUserAds.role, 'UserWithAdvertisement');
  assert.equal(offlineUserAds.offline, true);
  console.log(`  ✓ UserWithAdvertisement can access cached session while offline`);
  console.log();

  // Test 12: Guest mode (no session)
  console.log('Test 12: Guest mode (no authenticated session)');
  const guestCtx = setupAuth(TEST_ROLES.Guest);
  const guestSession = await guestCtx.auth.getSessionAndRole();
  assert.equal(guestSession, null);
  // Guest mode allows full recipe management (fallback behavior)
  const guestPerms = permissions.canManageRecipes('Guest');
  assert.equal(guestPerms, true);
  console.log(`  ✓ Guest mode returns null session and allows full access offline`);
  console.log();

  // Test 13: Role transitions - Admin to Tester
  console.log('Test 13: Role transition (Admin → Tester)');
  const transitionCtx = setupAuth(TEST_ROLES.Admin);
  await transitionCtx.auth.getSessionAndRole();
  let session = JSON.parse(transitionCtx.store.get('macrochef-verified-session'));
  assert.equal(session.role, 'Admin');

  // Change role to Tester
  transitionCtx.setRole('Tester');
  transitionCtx.emit('TOKEN_REFRESHED');
  const newSession = await transitionCtx.auth.getSessionAndRole();
  assert.equal(newSession.role, 'Tester');
  session = JSON.parse(transitionCtx.store.get('macrochef-verified-session'));
  assert.equal(session.role, 'Tester');
  console.log(`  ✓ Role transition cached correctly: Admin → Tester`);
  console.log();

  // Test 14: Session validation - invalid role rejected
  console.log('Test 14: Session validation (invalid role rejection)');
  const invalidCtx = setupAuth(TEST_ROLES.Admin);
  await invalidCtx.auth.getSessionAndRole();
  invalidCtx.setRole('InvalidRole');
  try {
    await invalidCtx.auth.getSessionAndRole();
    assert.fail('Should have rejected invalid role');
  } catch (error) {
    assert.match(error.message, /Invalid account role/);
  }
  console.log(`  ✓ Invalid role rejected with proper error`);
  console.log();

  // Test 15: Cache persistence - session survives serialization
  console.log('Test 15: Session cache serialization');
  const serializeCtx = setupAuth(TEST_ROLES.UserWithAdvertisement);
  const original = await serializeCtx.auth.getSessionAndRole();
  const cached = JSON.parse(serializeCtx.store.get('macrochef-verified-session'));

  assert.equal(cached.userId, original.userId);
  assert.equal(cached.email, original.email);
  assert.equal(cached.role, original.role);
  assert.equal(cached.issuer, 'https://xymudnmqahgayqvpznwz.supabase.co');
  assert.equal(cached.tenantId, 'https://xymudnmqahgayqvpznwz.supabase.co');
  console.log(`  ✓ Session cache survives JSON serialization`);
  console.log();

  console.log('========== ALL TESTS PASSED ==========');
  console.log('\nSummary:');
  console.log('  ✓ Permission helpers work correctly for all 4 roles');
  console.log('  ✓ Admin, Tester, and UserWithAdvertisement authenticate and cache properly');
  console.log('  ✓ Permission enforcement is correct per role');
  console.log('  ✓ Ad banner visibility rules enforced');
  console.log('  ✓ Offline caching works for all authenticated roles');
  console.log('  ✓ Guest mode allows full access offline');
  console.log('  ✓ Role transitions and validation work correctly');
  console.log('  ✓ Session cache serialization is robust');
})().catch((error) => {
  console.error('FAIL:', error.message);
  console.error(error.stack);
  process.exitCode = 1;
});
