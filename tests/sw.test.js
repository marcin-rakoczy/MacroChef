const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const origin = 'https://macrochef.test/';
const handlers = {};
const stores = new Map();
let privateResponse = false;
let offline = false;
let skipped = false;
const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
const response = () => ({
  ok: true,
  type: 'basic',
  headers: new Headers(privateResponse ? { 'Cache-Control': 'private, no-store' } : {}),
  clone() { return this; }
});
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name);
    return {
      async put(request, value) { data.set(key(request), value); },
      async match(request) { return data.get(key(request)); },
      async delete(request) { return data.delete(key(request)); }
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); }
};
const self = {
  registration: { scope: origin },
  clients: { claim: async () => {} },
  addEventListener(name, handler) { handlers[name] = handler; },
  async skipWaiting() { skipped = true; }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), {
  self, caches, URL, Promise, Set, console,
  fetch: async () => {
    if (offline) throw new Error('offline');
    return response();
  }
});

async function lifecycle(name) {
  let promise;
  handlers[name]({ waitUntil(value) { promise = value; } });
  return promise;
}

function request(url, headers = {}) {
  let result;
  let background;
  handlers.fetch({
    request: { url: new URL(url, origin).href, method: 'GET', headers: new Headers(headers) },
    respondWith(value) { result = value; },
    waitUntil(value) { background = value; }
  });
  return { result, background };
}

(async () => {
  privateResponse = true;
  await assert.rejects(lifecycle('install'), /Cannot cache static asset/);
  assert.equal(skipped, false);
  stores.clear();
  privateResponse = false;
  await lifecycle('install');
  assert.equal(skipped, true);
  stores.set('macrochef-v6', new Map());
  stores.set('other-app-cache', new Map());
  await lifecycle('activate');
  assert.equal(stores.has('macrochef-v6'), false);
  assert.equal(stores.has('other-app-cache'), true);
  assert.equal(request('/api/profile').result, undefined);
  assert.equal(request('/index.html?token=secret').result, undefined);
  assert.equal(request('/index.html', { Authorization: 'Bearer test' }).result, undefined);
  assert.equal(request('/index.html', { 'Cache-Control': 'no-store' }).result, undefined);
  offline = true;
  const cached = request('/index.html');
  assert.ok(await cached.result);
  await cached.background;
  offline = false;
  privateResponse = true;
  const revalidated = request('/index.html');
  assert.ok(await revalidated.result);
  await revalidated.background;
  assert.equal(stores.get('macrochef-v8').has(key('/index.html')), false);
  console.log('PASS: static allowlist, private responses, offline cache, cache ownership');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
