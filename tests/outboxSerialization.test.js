const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'sync', 'AppSyncManager.js'), 'utf8');
const baseline = '2026-01-01T00:00:00.000Z';
const savedAt = '2026-01-02T00:00:00.000Z';

function setup(table, mode = 'ack200', action = 'update', changes = null) {
  const date = new Date('2025-02-03T04:05:06.000Z');
  const record = {
    id: 'item', title: 'Oats', imageUrl: undefined,
    nutrition: { fiber: undefined, protein: 30 },
    meals: [undefined, { recipeId: 'r1', note: undefined }],
    sparse: [, 'present'], preparedAt: date,
    ...(table === 'plannerEntries' ? { dayKey: 'Monday' } : {})
  };
  const entry = {
    id: 'queued', table, action, sequence: 1, timestamp: 1,
    payload: action === 'create' ? record : changes ? { id: record.id, changes } : { id: record.id, value: record },
    snapshot: record,
    baseUpdatedAt: action === 'create' ? null : baseline
  };
  const entries = new Map([[entry.id, entry]]);
  const states = new Map();
  const db = {
    OutboxQueue: {
      async delete(id) { entries.delete(id); },
      async toArray() { return [...entries.values()]; },
      async update(id, values) { Object.assign(entries.get(id), values); }
    },
    SyncState: {
      async put(value) { states.set(value.id, value); },
      async delete(id) { states.delete(id); }
    },
    async transaction(_mode, ...args) { return args[args.length - 1](); }
  };
  const prior = {
    id: 'item', user_id: 'user-1', updated_at: baseline,
    data: { id: 'item', title: 'Old', imageUrl: 'https://example.test/old.png',
      nutrition: { fiber: 5, protein: 30 }, meals: [] },
    ...(table === 'plannerEntries' ? { day_key: 'Monday' } : {})
  };
  let saved;
  let wire;
  const requests = [];
  const window = {
    MacroChef: { recipeImages: { normalizeUrl: (url) => url || '/images/no-recipe-image.svg' } },
    addEventListener() {}, removeEventListener() {},
    setTimeout() { return 1; }, clearTimeout() {}
  };
  vm.runInNewContext(source, {
    window, navigator: { onLine: true }, console, URL, AbortController, DOMException, structuredClone,
    fetch: async (_input, options) => {
      requests.push(options.method);
      if (options.method === 'GET') {
        const row = mode === 'diverged204' ? { ...saved, data: { ...saved.data, title: 'Other edit' } } : saved;
        return new Response(JSON.stringify([row]), { status: 200 });
      }
      wire = options.body && JSON.parse(options.body);
      assert.match(options.headers.Prefer, /count=exact/);
      if (mode === 'networkError') throw new TypeError('Failed to fetch');
      if (mode === 'reject') return new Response('unavailable', { status: 503 });
      saved = { ...wire, updated_at: savedAt };
      if (mode === 'bare204') return new Response(null, { status: 204 });
      if (mode === 'zero204') return new Response(null, { status: 204, headers: { 'Content-Range': '*/0' } });
      if (mode === 'malformed204') return new Response(null, { status: 204, headers: { 'Content-Range': 'invalid/1' } });
      if (mode === 'ack204' || mode === 'diverged204') {
        return new Response(null, { status: 204, headers: { 'Content-Range': '*/1' } });
      }
      return new Response(JSON.stringify([saved]), { status: action === 'create' ? 201 : 200 });
    }
  });
  const manager = new window.MacroChef.AppSyncManager();
  manager.start({ repository: { db, mutations: {} }, userId: 'user-1', client: {
    supabaseUrl: 'https://example.supabase.co', supabaseKey: 'public'
  } });
  manager.token = 'token';
  const remote = { products: [], recipes: [], plannerEntries: [], goals: [] };
  if (action !== 'create') remote[table].push(prior);
  return { manager, entry, record, date, entries, states, remote, requests, getWire: () => wire };
}

function assertWire(data) {
  assert.equal(data.title, 'Oats');
  assert.equal(data.imageUrl, null);
  assert.equal(data.nutrition.fiber, null);
  assert.equal(data.nutrition.protein, 30);
  assert.equal(data.meals[0], null);
  assert.equal(data.meals[1].recipeId, 'r1');
  assert.equal(data.meals[1].note, null);
  assert.equal(data.preparedAt, '2025-02-03T04:05:06.000Z');
  if (data.sparse) assert.deepEqual(data.sparse, [null, 'present']);
  const roundTrip = JSON.parse(JSON.stringify(data));
  assert.ok(Object.hasOwn(roundTrip, 'imageUrl'));
  assert.ok(Object.hasOwn(roundTrip.nutrition, 'fiber'));
  assert.ok(Object.hasOwn(roundTrip.meals[1], 'note'));
  assert.equal(roundTrip.imageUrl, null);
  assert.equal(roundTrip.nutrition.fiber, null);
  assert.equal(roundTrip.meals[1].note, null);
}

(async () => {
  for (const table of ['recipes', 'plannerEntries', 'goals']) {
    const ctx = setup(table);
    try {
      await ctx.manager.push(ctx.entry, ctx.remote);
      assertWire(ctx.getWire().data);
      assert.equal(ctx.entries.size, 0);
      assert.equal(ctx.states.get(`${table}:item`).updatedAt, savedAt);
      assert.equal(ctx.record.imageUrl, undefined);
      assert.equal(ctx.record.nutrition.fiber, undefined);
      assert.equal(ctx.record.meals[0], undefined);
      assert.equal(ctx.record.meals[1].note, undefined);
      assert.equal(0 in ctx.record.sparse, false);
      assert.equal(ctx.record.preparedAt, ctx.date);
      assert.equal(ctx.date.toISOString(), '2025-02-03T04:05:06.000Z');
    } finally {
      await ctx.manager.stop();
    }
  }

  const changes = {
    title: 'Oats', imageUrl: undefined, 'nutrition.fiber': undefined,
    meals: [undefined, { recipeId: 'r1', note: undefined }],
    preparedAt: new Date('2025-02-03T04:05:06.000Z')
  };
  const partial = setup('recipes', 'ack200', 'update', changes);
  try {
    await partial.manager.push(partial.entry, partial.remote);
    assertWire(partial.getWire().data);
    assert.equal(changes['nutrition.fiber'], undefined);
    assert.equal(changes.meals[1].note, undefined);
  } finally {
    await partial.manager.stop();
  }

  const create = setup('recipes', 'ack200', 'create');
  try {
    await create.manager.push(create.entry, create.remote);
    assertWire(create.getWire().data);
    assert.equal(create.entries.size, 0);
  } finally {
    await create.manager.stop();
  }

  for (const mode of ['ack204', 'bare204', 'zero204', 'malformed204', 'diverged204', 'reject', 'networkError']) {
    const ctx = setup('recipes', mode);
    try {
      if (mode === 'ack204') {
        await ctx.manager.push(ctx.entry, ctx.remote);
        assert.deepEqual(ctx.requests, ['PATCH', 'GET']);
        assert.equal(ctx.entries.size, 0);
        assert.equal(ctx.states.get('recipes:item').updatedAt, savedAt);
      } else {
        await assert.rejects(ctx.manager.push(ctx.entry, ctx.remote));
        assert.equal(ctx.entries.size, 1, `${mode} must preserve the queue`);
      }
      assertWire(ctx.getWire().data);
    } finally {
      await ctx.manager.stop();
    }
    const deletion = setup('recipes', 'ack204', 'delete');
    try {
      await deletion.manager.push(deletion.entry, deletion.remote);
      assert.deepEqual(deletion.requests, ['DELETE']);
      assert.equal(deletion.entries.size, 0);
    } finally {
      await deletion.manager.stop();
    }
  }
  console.log('PASS: recursive JSONB serialization and verified outbox acknowledgments');
})().catch((error) => { console.error(error); process.exitCode = 1; });
