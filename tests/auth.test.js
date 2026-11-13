const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf8');

function setup() {
  const store = new Map();
  const events = {};
  const navigator = { onLine: true };
  let authCallback;
  let currentUser = { id: 'alice', email: 'alice@example.test' };
  let role = 'Admin';
  let session = { access_token: 'expired-token' };
  let stopped = 0;
  const localStorage = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key)
  };
  const client = {
    supabaseUrl: 'https://project.supabase.co',
    auth: {
      onAuthStateChange(callback) { authCallback = callback; },
      async getSession() { return { data: { session }, error: null }; },
      async getUser() { return { data: { user: currentUser }, error: null }; },
      async signInWithPassword() { return { data: { session }, error: null }; },
      async signUp() { return { data: { session: null }, error: null }; },
      async signOut() { session = null; return { error: null }; },
      startAutoRefresh() {},
      stopAutoRefresh() { stopped++; }
    },
    from(table) {
      assert.equal(table, 'user_profiles');
      return { select: () => ({ eq: (field, id) => {
        assert.equal(field, 'user_id');
        assert.equal(id, currentUser.id);
        return { single: async () => ({ data: { role }, error: null }) };
      } }) };
    }
  };
  const window = {
    MacroChef: { supabaseClient: client },
    addEventListener(name, callback) { events[name] = callback; },
    setTimeout
  };
  vm.runInNewContext(source, { window, navigator, localStorage, console });
  return {
    auth: window.MacroChef.auth, navigator, store, client, events,
    setUser: (user) => { currentUser = user; },
    setRole: (value) => { role = value; },
    setSession: (value) => { session = value; },
    emit: (event) => authCallback(event),
    stopped: () => stopped
  };
}

(async () => {
  const ctx = setup();
  assert.equal((await ctx.auth.signUp('a@example.test', '123456')).session, null);
  assert.equal(ctx.store.has('macrochef-verified-session'), false);
  await ctx.auth.signIn('alice@example.test', '123456');
  let verified = await ctx.auth.getSessionAndRole();
  assert.equal(verified.userId, 'alice');
  assert.equal(verified.role, 'Admin');
  assert.equal(verified.offline, false);
  assert.equal(JSON.parse(ctx.store.get('macrochef-verified-session')).role, 'Admin');

  ctx.navigator.onLine = false;
  ctx.setSession(null);
  ctx.emit('SIGNED_OUT');
  verified = await ctx.auth.getSessionAndRole();
  assert.equal(verified.userId, 'alice');
  assert.equal(verified.offline, true);
  await assert.rejects(ctx.auth.signIn('alice@example.test', '123456'), /Internet/);
  ctx.store.set('macrochef-supabase-session', 'token');
  await ctx.auth.signOut();
  assert.equal(ctx.stopped(), 1);
  assert.equal(ctx.store.has('macrochef-supabase-session'), false);
  assert.equal(await ctx.auth.getSessionAndRole(), null);

  ctx.navigator.onLine = true;
  ctx.setSession({ access_token: 'new-token' });
  assert.equal(await ctx.auth.getSessionAndRole(), null, 'Late SDK refresh must not restore a signed-out session');
  ctx.setUser({ id: 'bob', email: 'bob@example.test' });
  ctx.setRole('Tester');
  await ctx.auth.signIn('bob@example.test', '123456');
  verified = await ctx.auth.getSessionAndRole();
  assert.equal(verified.userId, 'bob');
  assert.equal(verified.role, 'Tester');
  ctx.setRole('invalid');
  await assert.rejects(ctx.auth.getSessionAndRole(), /Invalid account role/);

  ctx.setRole('Tester');
  let resolveUser;
  ctx.client.auth.getUser = () => new Promise((resolve) => { resolveUser = resolve; });
  const pending = ctx.auth.getSessionAndRole();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const saved = JSON.parse(ctx.store.get('macrochef-verified-session'));
  ctx.emit('SIGNED_OUT');
  resolveUser({ data: { user: { id: 'bob', email: 'bob@example.test' } }, error: null });
  await assert.rejects(pending, /Session changed/);

  ctx.navigator.onLine = false;
  ctx.store.delete('macrochef-local-signout');
  saved.issuer = 'https://other.supabase.co';
  ctx.store.set('macrochef-verified-session', JSON.stringify(saved));
  await assert.rejects(ctx.auth.getSessionAndRole(), /Invalid cached account data/);

  const revoked = setup();
  await revoked.auth.getSessionAndRole();
  revoked.client.auth.getUser = async () => ({ data: { user: null }, error: { status: 401 } });
  assert.equal(await revoked.auth.getSessionAndRole(), null);
  assert.equal(revoked.store.has('macrochef-verified-session'), false, 'Revoked session remained cached');

  const unavailable = setup();
  await unavailable.auth.getSessionAndRole();
  unavailable.client.auth.getUser = async () => ({ data: { user: null }, error: new Error('network error') });
  await assert.rejects(unavailable.auth.getSessionAndRole(), /network error/);
  assert.equal(unavailable.store.has('macrochef-verified-session'), true, 'Transient failure cleared offline identity');
  console.log('PASS: verified role, offline session, logout and stale-session protection');
})().catch((error) => { console.error(error); process.exitCode = 1; });
