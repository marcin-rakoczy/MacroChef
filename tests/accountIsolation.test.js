const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const events = [];
const stores = new Map();
let observed;
let releaseStop;
let releaseClose;

class MockDexie {
  constructor(name) {
    this.name = name;
    events.push(`construct:${name}`);
    if (!stores.has(name)) stores.set(name, { recipes: [], plannerEntries: [], goals: [] });
    this.records = stores.get(name);
  }
  version() { return { stores: () => ({ upgrade() {} }) }; }
  on() {}
  async open() { events.push(`open:${this.name}`); }
  async close() {
    events.push(`close-start:${this.name}`);
    if (releaseClose) await new Promise((resolve) => { releaseClose = resolve; });
    events.push(`close-end:${this.name}`);
  }
  static liveQuery() {
    return {
      subscribe(observer) {
        observed = observer;
        return { unsubscribe() { events.push('unsubscribe'); } };
      }
    };
  }
  static deepClone(value) { return structuredClone(value); }
}

const window = {
  MacroChef: { ENV: 'TEST', recipeImages: { normalizeUrl: (url) => url || null } }, crypto: webcrypto,
  addEventListener() {}, removeEventListener() {}, setTimeout() { return 1; }, clearTimeout() {}
};
const context = { window, Dexie: MockDexie, navigator: { onLine: true }, console, TextEncoder, Uint8Array,
  URL, AbortController, DOMException, structuredClone };
for (const file of ['db.js', path.join('session', 'repositoryScope.js'), path.join('sync', 'AppSyncManager.js')]) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
}

function memoryTable(name, initial = []) {
  const rows = new Map(initial.map((row) => [row.id, structuredClone(row)]));
  const collection = (predicate) => ({
    async toArray() { return [...rows.values()].filter(predicate).map((row) => structuredClone(row)); },
    async first() { return (await this.toArray())[0]; },
    async count() { return (await this.toArray()).length; },
    filter(next) { return collection((row) => predicate(row) && next(row)); },
    or(field) { return { equals(value) { return collection((row) => predicate(row) || row[field] === value); } }; }
  });
  return {
    name,
    async get(id) { return rows.get(id) && structuredClone(rows.get(id)); },
    async put(row) { rows.set(row.id, structuredClone(row)); },
    async add(row) { if (rows.has(row.id)) throw new Error('Duplicate key'); rows.set(row.id, structuredClone(row)); },
    async update(id, changes) { if (!rows.has(id)) return 0; Object.assign(rows.get(id), structuredClone(changes)); return 1; },
    async delete(id) { rows.delete(id); },
    where(field) { return { equals(value) { return collection((row) => row[field] === value); } }; }
  };
}

async function verifyRecordOwnership() {
  const db = {
    recipes: memoryTable('recipes', [
      { id: 'own', userId: 'user-A', name: 'Own' },
      { id: 'foreign', userId: 'user-B', name: 'Private' },
      { id: 'shared', userId: 'admin', shared: 1, name: 'Library' }
    ]),
    plannerEntries: memoryTable('plannerEntries', [
      { id: 'own-plan', userId: 'user-A', dayKey: 'Monday' },
      { id: 'foreign-plan', userId: 'user-B', dayKey: 'Monday', Lunch: 'foreign' }
    ]),
    goals: memoryTable('goals', [
      { id: 'own-goals', userId: 'user-A', calories: 2000 },
      { id: 'foreign-goals', userId: 'user-B', calories: 9000 }
    ]),
    products: memoryTable('products'), OutboxQueue: memoryTable('OutboxQueue'), SyncState: memoryTable('SyncState')
  };
  db.table = (name) => db[name];
  db.transaction = async (_mode, ...args) => args[args.length - 1]();
  const repository = new window.MacroChef.DexieCalorieRepository('ownership-test', { userId: 'user-A' });
  repository.db = db;
  repository.mutations.db = db;
  const visible = await repository.getAllRecipes();
  assert.deepEqual(visible.map((row) => row.id).sort(), ['own', 'shared']);
  await assert.rejects(repository.saveRecipe({ id: 'foreign', name: 'Changed' }), /another user/);
  await assert.rejects(repository.deleteRecipe('foreign'), /another user/);
  assert.equal((await db.recipes.get('foreign')).name, 'Private');
  await repository.savePlannerSlot('Monday', {}, 'Dinner', 'own');
  await repository.saveGoals({ calories: 2100 });
  assert.equal((await db.plannerEntries.get('foreign-plan')).Lunch, 'foreign');
  assert.equal((await db.goals.get('foreign-goals')).calories, 9000);
  const queue = await db.OutboxQueue.where('userId').equals('user-A').toArray();
  assert.equal(queue.length, 2);
  assert.ok(queue.every((entry) => entry.userId === 'user-A'));
  await db.OutboxQueue.add({ id: 'foreign-queue', userId: 'user-B', table: 'recipes', action: 'create',
    payload: { id: 'foreign', userId: 'user-B' }, sequence: 10, timestamp: 1 });
  const client = {
    auth: {
      async getSession() { return { data: { session: { access_token: 'token', user: { id: 'user-A' } } } }; },
      async getUser() { return { data: { user: { id: 'user-A' } } }; }
    }
  };
  const manager = new window.MacroChef.AppSyncManager();
  manager.start({ repository, userId: 'user-A', client });
  try {
    const remote = { products: [], recipes: [], plannerEntries: [], goals: [] };
    const foreign = await db.OutboxQueue.get('foreign-queue');
    await assert.rejects(manager.push(foreign, remote), /another user/);
    await assert.rejects(manager.push({
      id: 'forged', userId: 'user-A', table: 'recipes', action: 'create', sequence: 1,
      payload: { id: 'foreign', userId: 'user-A' }
    }, remote), /another user/);
    const row = { id: 'other', user_id: 'user-B', data: {}, updated_at: '2026-01-01T00:00:00Z' };
    await assert.rejects(manager.push({
      id: 'forged-delete', userId: 'user-A', table: 'recipes', action: 'delete', sequence: 1,
      payload: { id: 'other' }, baseUpdatedAt: row.updated_at
    }, { ...remote, recipes: [row] }), /another user/);
    await db.SyncState.put({ id: 'recipes:other', userId: 'user-B' });
    await assert.rejects(manager.push({
      id: 'forged-baseline', userId: 'user-A', table: 'recipes', action: 'create', sequence: 1,
      payload: { id: 'other', userId: 'user-A' }
    }, remote), /baseline belongs to another user/);
    const shared = { ...row, id: 'public', user_id: 'admin' };
    await assert.rejects(manager.pull({ ...remote, goals: [row] }, []), /another user/);
    assert.equal(await db.goals.get('other'), undefined);
    manager.readAll = async (table) => table === 'recipes' ? [row, shared] : [];
    manager.request = async (table, _params, method, body) => {
      if (table === 'rpc/is_admin') return { status: 200, data: body.check_user === 'admin' };
      return { status: 200, data: [] };
    };
    assert.deepEqual((await manager.readRemote()).recipes.map((item) => item.id), ['public']);
    const flushed = [];
    manager.readRemote = async () => remote;
    manager.pull = async () => {};
    manager.push = async (entry) => { flushed.push(entry.id); await db.OutboxQueue.delete(entry.id); };
    await manager.sync();
    assert.equal(flushed.length, 2);
    assert.ok(!flushed.includes('foreign-queue'));
    assert.ok(await db.OutboxQueue.get('foreign-queue'));
    assert.equal(manager.getStatus().pendingCount, 0);
  } finally {
    await manager.stop();
  }
}

function syncManager() {
  return {
    async stop() {
      events.push('sync-stop');
      if (releaseStop) await new Promise((resolve) => { releaseStop = resolve; });
      events.push('sync-stopped');
    }
  };
}

(async () => {
  const lifecycle = new window.MacroChef.RepositoryScopeLifecycle();
  const identity = { issuer: 'issuer', tenantId: 'tenant', userId: 'user-A' };
  const first = await lifecycle.switchTo(async () => {
    const scope = await window.MacroChef.createScopedRepository(identity);
    await scope.repository.db.open();
    scope.syncManager = syncManager();
    return scope;
  });
  const nameA = first.repository.db.name;
  assert.match(nameA, /^TEST_account-/);
  first.repository.db.records.recipes.push({ id: 'private' });
  first.repository.db.records.plannerEntries.push({ id: 'plan' });
  first.repository.db.records.goals.push({ id: 'goal' });
  let notifications = 0;
  first.repository.watchAppData().subscribe({ next() { notifications++; } });
  const oldObserver = observed;

  releaseStop = true;
  releaseClose = true;
  const transition = lifecycle.switchTo(async () => {
    const scope = await window.MacroChef.createScopedRepository({ ...identity, userId: 'user-B' });
    await scope.repository.db.open();
    return scope;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(!events.some((event) => event.startsWith('close-start:')), 'Close began before sync stopped');
  releaseStop();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(events.includes('unsubscribe'));
  assert.ok(!events.some((event) => event.includes('close-end:')), 'Close was not awaited');
  assert.equal(events.filter((event) => event.startsWith('construct:TEST_account-')).length, 1);
  releaseClose();
  releaseClose = null;
  const second = await transition;
  const nameB = second.repository.db.name;
  assert.notEqual(nameA, nameB);
  assert.ok(events.indexOf('sync-stopped') < events.indexOf('unsubscribe'));
  assert.ok(events.indexOf('unsubscribe') < events.indexOf(`close-start:${nameA}`));
  assert.ok(events.indexOf(`close-end:${nameA}`) < events.indexOf(`construct:${nameB}`));
  assert.ok(events.indexOf(`close-end:${nameA}`) < events.indexOf(`open:${nameB}`));
  oldObserver.next({ recipes: [{ id: 'private' }] });
  assert.equal(notifications, 0, 'A stale query notified React');
  for (const table of ['recipes', 'plannerEntries', 'goals']) {
    assert.equal(second.repository.db.records[table].length, 0);
  }

  const guest = await lifecycle.switchTo(async () => {
    const repository = window.MacroChef.createGuestRepository();
    await repository.db.open();
    return { repository };
  });
  assert.match(guest.repository.db.name, /^TEST_guest_/);
  assert.notEqual(guest.repository.db.name, nameA);
  assert.notEqual(guest.repository.db.name, nameB);
  for (const table of ['recipes', 'plannerEntries', 'goals']) {
    assert.equal(guest.repository.db.records[table].length, 0);
  }
  assert.ok(events.indexOf(`close-end:${nameB}`) < events.indexOf(`open:${guest.repository.db.name}`));

  releaseStop = null;
  const again = await lifecycle.switchTo(async () => {
    const scope = await window.MacroChef.createScopedRepository(identity);
    await scope.repository.db.open();
    scope.syncManager = syncManager();
    return scope;
  });
  again.repository.watchSettings().subscribe({ next() {} });
  const signOutStart = events.length;
  await lifecycle.switchTo(async () => {
    const repository = window.MacroChef.createGuestRepository();
    await repository.db.open();
    return { repository };
  });
  const signOutEvents = events.slice(signOutStart);
  assert.ok(signOutEvents.indexOf('sync-stopped') < signOutEvents.indexOf('unsubscribe'));
  assert.ok(signOutEvents.indexOf('unsubscribe') < signOutEvents.indexOf(`close-start:${nameA}`));
  assert.ok(signOutEvents.indexOf(`close-end:${nameA}`) <
    signOutEvents.indexOf(`open:${guest.repository.db.name}`));
  await lifecycle.switchTo(null);

  let releaseSlow;
  let enteredSlow;
  const entered = new Promise((resolve) => { enteredSlow = resolve; });
  const delayed = new Promise((resolve) => { releaseSlow = resolve; });
  const slow = lifecycle.switchTo(async () => {
    const scope = await window.MacroChef.createScopedRepository({ ...identity, userId: 'slow' });
    enteredSlow();
    await delayed;
    return scope;
  });
  await entered;
  let openedNext = false;
  const next = lifecycle.switchTo(async () => {
    openedNext = true;
    const scope = await window.MacroChef.createScopedRepository({ ...identity, userId: 'next' });
    await scope.repository.db.open();
    return scope;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(openedNext, false, 'A replacement opened while an earlier creation was in progress');
  releaseSlow();
  assert.equal(await slow, null);
  await next;
  assert.ok(openedNext);
  await lifecycle.switchTo(null);

  for (const env of ['PROD', 'TEST', 'LOCAL']) {
    window.MacroChef.ENV = env;
    const account = await window.MacroChef.createScopedRepository(identity);
    const scopedGuest = window.MacroChef.createGuestRepository();
    assert.ok(account.repository.db.name.startsWith(`${env}_account-`));
    assert.ok(scopedGuest.db.name.startsWith(`${env}_guest_`));
    assert.notEqual(account.repository.db.name, scopedGuest.db.name);
    await account.repository.close();
    await scopedGuest.close();
  }
  await verifyRecordOwnership();
  console.log('PASS: serialized account teardown, scoped databases, and stale subscription isolation');
})().catch((error) => { console.error(error); process.exitCode = 1; });
