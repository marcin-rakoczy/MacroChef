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
}

const window = { MacroChef: { ENV: 'TEST' }, crypto: webcrypto };
const context = { window, Dexie: MockDexie, navigator: { onLine: true }, console, TextEncoder, Uint8Array };
for (const file of ['db.js', path.join('session', 'repositoryScope.js')]) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context);
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
  console.log('PASS: serialized account teardown, scoped databases, and stale subscription isolation');
})().catch((error) => { console.error(error); process.exitCode = 1; });
