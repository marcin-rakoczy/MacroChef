const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');
const permissionSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'permissions.js'), 'utf8');
const cacheKey = 'macrochef-verified-session';
const sessionKey = 'macrochef-supabase-session';
const logoutKey = 'macrochef-local-signout';
const issuer = 'https://project.supabase.co';
const expiredToken = `header.${Buffer.from(JSON.stringify({ exp: 1, sub: 'alice' })).toString('base64url')}.signature`;

function setup(role, online = false) {
  const identity = { userId: 'alice', email: 'alice@example.test', role, issuer, tenantId: issuer };
  const store = new Map([
    [cacheKey, JSON.stringify(identity)],
    [sessionKey, JSON.stringify({ access_token: expiredToken, refresh_token: 'refresh-token', user: { id: 'alice' } })]
  ]);
  const navigator = { onLine: online };
  const events = {};
  const notifications = [];
  let callback;
  let sessionError = new Error('Failed to fetch');
  let refreshError = new Error('Failed to fetch');
  let session = { access_token: expiredToken, user: { id: 'alice' } };
  let emitDuringGet = false;
  let userError = null;
  let user = { id: 'alice', email: 'alice@example.test' };
  let roleValue = role;
  const localStorage = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key)
  };
  const client = {
    supabaseUrl: issuer,
    auth: {
      onAuthStateChange(handler) { callback = handler; },
      async getSession() {
        if (emitDuringGet) callback('SIGNED_OUT');
        if (sessionError) throw sessionError;
        return { data: { session }, error: null };
      },
      async refreshSession() {
        return { data: { session }, error: refreshError };
      },
      async getUser() { return { data: { user }, error: userError }; },
      async signOut() { callback('SIGNED_OUT'); return { error: null }; },
      stopAutoRefresh() {},
      startAutoRefresh() {}
    },
    from() {
      return { select: () => ({ eq: () => ({
        single: async () => ({ data: { role: roleValue }, error: null })
      }) }) };
    }
  };
  const window = {
    MacroChef: { supabaseClient: client },
    addEventListener(name, handler) { events[name] = handler; },
    setTimeout
  };
  vm.runInNewContext(permissionSource, { window });
  vm.runInNewContext(source, { window, navigator, localStorage, console });
  window.MacroChef.auth.subscribe((event) => notifications.push(event));
  return {
    auth: window.MacroChef.auth, permissions: window.MacroChef.permissions, store, navigator, events, notifications,
    emit: (event) => callback(event),
    setEmitDuringGet: (value) => { emitDuringGet = value; },
    setSessionError: (error) => { sessionError = error; },
    setRefreshError: (error) => { refreshError = error; },
    setUserError: (error) => { userError = error; },
    setSession: (value) => { session = value; },
    setRole: (value) => { roleValue = value; }
  };
}

(async () => {
  for (const role of ['Admin', 'Tester', 'UserWithAdvertisement']) {
    const ctx = setup(role);
    const session = await ctx.auth.getSessionAndRole();
    assert.equal(session.userId, 'alice');
    assert.equal(session.email, 'alice@example.test');
    assert.equal(session.role, role);
    assert.equal(session.offline, true);
    assert.equal(ctx.permissions.canManageRecipes(session.role), role === 'Admin');
    assert.equal(ctx.permissions.showAds(session.role), role === 'UserWithAdvertisement');
    ctx.emit('SIGNED_OUT');
    ctx.emit('TOKEN_REFRESHED');
    ctx.events.storage({ key: sessionKey, newValue: null });
    assert.equal((await ctx.auth.getSessionAndRole()).role, role);
    assert.equal(JSON.parse(ctx.store.get(cacheKey)).role, role);
    assert.ok(ctx.store.has(sessionKey));
    assert.equal(ctx.store.has(logoutKey), false);
    assert.equal(ctx.notifications.includes('changing'), false);
    await ctx.auth.signOut();
    assert.equal(ctx.store.has(sessionKey), false);
    assert.equal(ctx.store.has(cacheKey), false);
    assert.equal(await ctx.auth.getSessionAndRole(), null);
  }

  for (const error of [
    new TypeError('Failed to fetch'),
    Object.assign(new Error('Retryable fetch'), { name: 'AuthRetryableFetchError' }),
    Object.assign(new Error('Request timed out'), { name: 'TimeoutError' })
  ]) {
    const ctx = setup('Admin', true);
    ctx.setSessionError(error);
    assert.equal((await ctx.auth.getSessionAndRole()).role, 'Admin');
    ctx.emit('SIGNED_OUT');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(ctx.store.has(cacheKey), true);
    assert.equal(ctx.store.has(logoutKey), false);
    assert.equal(ctx.notifications.includes('changing'), false);
  }

  const profileFailure = setup('Tester', true);
  profileFailure.setSessionError(null);
  profileFailure.setUserError(new Error('network error'));
  assert.equal((await profileFailure.auth.getSessionAndRole()).role, 'Tester');
  profileFailure.setUserError({ status: 401 });
  assert.equal((await profileFailure.auth.getSessionAndRole()).role, 'Tester');
  profileFailure.setRefreshError({ name: 'AuthSessionMissingError', status: 400 });
  assert.equal((await profileFailure.auth.getSessionAndRole()).role, 'Tester');
  assert.equal(profileFailure.store.has(cacheKey), true);
  profileFailure.setRefreshError({ status: 400, code: 'invalid_grant' });
  assert.equal(await profileFailure.auth.getSessionAndRole(), null);
  assert.equal(profileFailure.store.has(cacheKey), false);
  assert.equal(profileFailure.store.has(sessionKey), false);
  assert.equal(profileFailure.store.get(logoutKey), '1');

  const repeatedFailure = setup('Admin', true);
  repeatedFailure.setEmitDuringGet(true);
  assert.equal((await repeatedFailure.auth.getSessionAndRole()).role, 'Admin');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(repeatedFailure.notifications.length, 0, 'Refresh failure must not schedule an infinite retry');

  const rejected = setup('Admin', true);
  rejected.setSessionError({ status: 401, code: 'invalid_grant' });
  assert.equal(await rejected.auth.getSessionAndRole(), null);
  assert.equal(rejected.store.has(cacheKey), false);
  assert.equal(rejected.store.has(sessionKey), false);

  const unknown = setup('Admin', true);
  unknown.setSessionError(null);
  unknown.setSession(null);
  assert.equal((await unknown.auth.getSessionAndRole()).role, 'Admin');
  assert.equal(unknown.store.has(cacheKey), true);

  const changedAccount = setup('Admin', true);
  changedAccount.setSessionError(null);
  changedAccount.setSession({ user: { id: 'bob' } });
  changedAccount.setUserError(new Error('Failed to fetch'));
  await assert.rejects(changedAccount.auth.getSessionAndRole(), /Account changed/);

  const reconnected = setup('Admin');
  reconnected.navigator.onLine = true;
  reconnected.setSessionError(null);
  reconnected.setRole('Tester');
  assert.equal((await reconnected.auth.getSessionAndRole()).role, 'Tester');
  assert.equal(JSON.parse(reconnected.store.get(cacheKey)).role, 'Tester');

  const onlineSignOut = setup('Admin', true);
  await onlineSignOut.auth.signOut();
  assert.equal(onlineSignOut.store.has(cacheKey), false);
  assert.equal(onlineSignOut.store.has(sessionKey), false);
  assert.equal(await onlineSignOut.auth.getSessionAndRole(), null);
  console.log('PASS: offline sessions, transient failures, role preservation and confirmed sign-out');
})().catch((error) => { console.error(error); process.exitCode = 1; });
