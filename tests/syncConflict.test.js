const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'sync', 'AppSyncManager.js'), 'utf8');
const baseline = '2026-01-01T00:00:00.000Z';
const localTime = '2026-01-02T00:00:00.000Z';
const remoteTime = '2026-01-03T00:00:00.000Z';
const acknowledgedTime = '2026-01-04T00:00:00.000Z';
const remoteNames = { products: 'products', recipes: 'recipes', plannerEntries: 'planner', goals: 'goals' };

function table(initial = []) {
  const rows = new Map(initial.map((row) => [row.id, structuredClone(row)]));
  return {
    async get(id) { return rows.get(id); },
    async put(row) { rows.set(row.id, structuredClone(row)); },
    async delete(id) { rows.delete(id); },
    async toArray() { return [...rows.values()].map((row) => structuredClone(row)); },
    async update(id, values) { if (rows.has(id)) Object.assign(rows.get(id), values); },
    where(field) {
      return { equals(value) { return { async toArray() {
        return [...rows.values()].filter((row) => row[field] === value);
      } }; } };
    }
  };
}

function remoteRow(name, updatedAt = remoteTime) {
  if (name === 'products') {
    return { id: 'item', name_polish: 'Server', name_english: 'Server', category: 'other',
      category_polish: 'Other', category_english: 'Other', unit: 'g', updated_at: updatedAt };
  }
  return { id: 'item', user_id: 'user-1', data: { id: 'item', name: 'Server' },
    ...(name === 'plannerEntries' ? { day_key: 'Monday' } : {}), updated_at: updatedAt };
}

function setup(name, action, serverTime = remoteTime) {
  const local = { id: 'item', name: 'Local', updatedAt: localTime,
    ...(name === 'plannerEntries' ? { dayKey: 'Monday' } : {}) };
  const db = {
    products: table(), recipes: table(), plannerEntries: table(), goals: table(),
    OutboxQueue: table(), SyncState: table(),
    table(tableName) { return this[tableName]; },
    async transaction(_mode, ...args) { return args[args.length - 1](); }
  };
  const remote = { products: [], recipes: [], planner: [], goals: [] };
  remote[remoteNames[name]].push(remoteRow(name, serverTime));
  let writeStatus = 200;
  let writes = 0;
  const window = {
    MacroChef: { recipeImages: { normalizeUrl: (url) => url || null } },
    addEventListener() {}, removeEventListener() {},
    setTimeout() { return 1; }, clearTimeout() {}
  };
  vm.runInNewContext(source, {
    window, navigator: { onLine: true }, console, URL, AbortController, DOMException, structuredClone,
    fetch: async (input, options) => {
      const url = new URL(input);
      const rows = remote[url.pathname.split('/').pop()];
      if (options.method === 'GET') {
        const id = url.searchParams.get('id');
        const selected = id ? rows.filter((row) => `eq.${row.id}` === id) : rows;
        return new Response(JSON.stringify(selected), {
          status: 200, headers: { 'Content-Range': `0-0/${selected.length}` }
        });
      }
      writes++;
      if (writeStatus === 204) return new Response(null, { status: 204 });
      const index = rows.findIndex((row) => row.id === 'item');
      const payload = options.body ? JSON.parse(options.body) : null;
      const saved = options.method === 'DELETE'
        ? rows.splice(index, 1)[0]
        : { ...payload, updated_at: acknowledgedTime };
      if (options.method !== 'DELETE') {
        if (index >= 0) rows[index] = saved;
        else rows.push(saved);
      }
      return new Response(JSON.stringify([saved]), { status: writeStatus });
    }
  });
  const manager = new window.MacroChef.AppSyncManager();
  const client = {
    supabaseUrl: 'https://example.supabase.co', supabaseKey: 'public',
    auth: {
      async getSession() { return { data: { session: { access_token: 'token', user: { id: 'user-1' } } } }; },
      async getUser() { return { data: { user: { id: 'user-1' } } }; }
    }
  };
  return {
    db, local, remote, manager,
    async initialize() {
      if (action !== 'delete') await db[name].put(local);
      if (action !== 'create') {
        await db.SyncState.put({ id: `${name}:item`, table: name, recordId: 'item', updatedAt: baseline });
      }
      if (action) {
        await db.OutboxQueue.put({
          id: 'queued', table: name, action, sequence: 1, timestamp: 1,
          payload: action === 'create' ? local : action === 'delete' ? { id: 'item' } : { id: 'item', value: local },
          snapshot: action === 'delete' ? undefined : local,
          baseUpdatedAt: action === 'create' ? null : baseline
        });
      }
      manager.start({ repository: { db, mutations: {} }, userId: 'user-1', client });
    },
    setWriteStatus(status) { writeStatus = status; },
    writes() { return writes; }
  };
}

(async () => {
  for (const [name, action] of [
    ['products', 'update'], ['recipes', 'update'], ['plannerEntries', 'delete'], ['goals', 'create']
  ]) {
    const ctx = setup(name, action);
    await ctx.initialize();
    try {
      await ctx.manager.sync();
      const local = await ctx.db[name].get('item');
      if (action === 'delete') assert.equal(local, undefined, `${name} deletion was overwritten`);
      else assert.equal(local.name, 'Local', `${name} local edit was overwritten`);
      assert.equal((await ctx.db.OutboxQueue.toArray()).length, 1);
      const status = ctx.manager.getStatus();
      assert.equal(status.state, 'conflict');
      assert.equal(status.conflictCount, 1);
      assert.equal(status.pendingCount, 1);
      assert.equal(status.conflicts[0].table, name);
      assert.equal(status.conflicts[0].recordId, 'item');
      assert.equal(status.conflicts[0].localUpdatedAt, action === 'delete' ? null : localTime);
      assert.equal(status.conflicts[0].serverUpdatedAt, remoteTime);
      assert.equal(ctx.writes(), 0, 'Conflicting mutation must not be sent');
      ctx.manager.requestSync();
      assert.equal(ctx.manager.getStatus().conflictCount, 1, 'Pending sync must retain conflict state');
    } finally {
      await ctx.manager.stop();
    }
  }

  const clean = setup('recipes', null);
  await clean.initialize();
  try {
    await clean.manager.sync();
    assert.equal((await clean.db.recipes.get('item')).name, 'Server');
    assert.equal(clean.manager.getStatus().state, 'synced');
    assert.equal(clean.manager.getStatus().conflictCount, 0);
  } finally {
    await clean.manager.stop();
  }

  const late = setup('recipes', null);
  await late.initialize();
  try {
    const readRemote = late.manager.readRemote.bind(late.manager);
    let reads = 0;
    late.manager.readRemote = async () => {
      const result = await readRemote();
      if (++reads === 2) {
        await late.db.OutboxQueue.put({
          id: 'late', table: 'recipes', action: 'update', sequence: 1, timestamp: 1,
          payload: { id: 'item', value: late.local }, snapshot: late.local, baseUpdatedAt: baseline
        });
      }
      return result;
    };
    await late.manager.sync();
    assert.equal((await late.db.recipes.get('item')).name, 'Local');
    assert.equal((await late.db.OutboxQueue.toArray()).length, 1);
    assert.equal(late.manager.getStatus().state, 'conflict');
    assert.equal(late.manager.getStatus().conflicts[0].serverUpdatedAt, remoteTime);
  } finally {
    await late.manager.stop();
  }

  const ack = setup('recipes', 'update', baseline);
  await ack.initialize();
  try {
    ack.setWriteStatus(204);
    await ack.manager.sync();
    assert.equal((await ack.db.OutboxQueue.toArray()).length, 1, 'Unverifiable 204 must not clear the queue');
    assert.equal((await ack.db.recipes.get('item')).name, 'Local');
    ack.setWriteStatus(200);
    await ack.manager.sync();
    assert.equal((await ack.db.OutboxQueue.toArray()).length, 0);
    assert.equal(ack.manager.getStatus().state, 'synced');
    assert.equal(ack.manager.getStatus().pendingCount, 0);
    assert.equal((await ack.db.SyncState.get('recipes:item')).updatedAt, acknowledgedTime);
  } finally {
    await ack.manager.stop();
  }
  const created = setup('recipes', 'create');
  created.remote.recipes.length = 0;
  await created.initialize();
  try {
    created.setWriteStatus(201);
    await created.manager.sync();
    assert.equal((await created.db.OutboxQueue.toArray()).length, 0);
    assert.equal(created.manager.getStatus().state, 'synced');
  } finally {
    await created.manager.stop();
  }
  console.log('PASS: conflicts preserve local records and outbox; verified acknowledgments clear pending writes');
})().catch((error) => { console.error(error); process.exitCode = 1; });
