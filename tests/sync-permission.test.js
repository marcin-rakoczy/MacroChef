const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'sync', 'AppSyncManager.js'), 'utf8');

async function checkRejection(status, body, permission = true) {
  const entries = [{
    id: 'outbox-1', table: 'products', action: 'create', sequence: 1, timestamp: 1,
    payload: { id: 'product-1', name: { pl: 'Produkt', en: 'Product' } }
  }];
  const queue = {
    async toArray() { return entries.map((entry) => ({ ...entry })); },
    async get(id) { return entries.find((entry) => entry.id === id); },
    async update(id, values) { Object.assign(entries.find((entry) => entry.id === id), values); },
    async delete(id) { entries.splice(entries.findIndex((entry) => entry.id === id), 1); }
  };
  const db = {
    OutboxQueue: queue,
    SyncState: { async put() {}, async delete() {} },
    async transaction(_mode, _queue, _state, callback) { return callback(); }
  };
  let responseStatus = status;
  let responseBody = body;
  let requests = 0;
  const window = {
    MacroChef: {},
    addEventListener() {},
    removeEventListener() {},
    setTimeout() { return 1; },
    clearTimeout() {}
  };
  vm.runInNewContext(source, {
    window, navigator: { onLine: true }, console, URL, AbortController, DOMException,
    fetch: async () => {
      requests++;
      return new Response(responseBody, { status: responseStatus });
    }
  });
  const client = {
    supabaseUrl: 'https://example.supabase.co', supabaseKey: 'public',
    auth: {
      async getSession() {
        return { data: { session: { access_token: 'token', user: { id: 'user-1' } } } };
      },
      async getUser() { return { data: { user: { id: 'user-1' } } }; }
    }
  };
  const manager = new window.MacroChef.AppSyncManager();
  manager.readRemote = async () => ({ products: [], recipes: [], plannerEntries: [], goals: [] });
  manager.pull = async () => {};
  manager.start({ repository: { db, mutations: {} }, userId: 'user-1', client });
  try {
    await manager.sync();
    assert.equal(entries.length, 1);
    assert.equal(manager.getStatus().state, 'conflict');
    if (permission) {
      assert.match(entries[0].permissionError, /products\/product-1: Permission denied/);
      assert.equal(manager.getStatus().permissionErrors, true);
      await manager.sync();
      assert.equal(requests, 1, 'flagged entry must not be sent again automatically');
    } else {
      assert.equal(entries[0].permissionError, undefined);
      await manager.sync();
      assert.equal(requests, 2, 'transient errors remain retryable');
    }

    responseStatus = 201;
    responseBody = JSON.stringify([{ id: 'product-1', updated_at: '2026-01-01T00:00:00Z' }]);
    if (permission) await manager.retryPermissionErrors();
    await manager.sync();
    assert.equal(requests, permission ? 2 : 3);
    assert.equal(entries.length, 0);
    assert.equal(manager.getStatus().state, 'synced');
  } finally {
    await manager.stop();
  }
}

(async () => {
  await checkRejection(401, 'unauthorized');
  await checkRejection(403, 'forbidden');
  await checkRejection(400, '{"code":"42501"}');
  await checkRejection(500, '{"code":"other"}', false);
  console.log('PASS: permission errors are retained without automatic retries and can be retried');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
