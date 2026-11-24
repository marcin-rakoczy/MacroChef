const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const origin = 'https://macrochef.test/';
const appVersion = fs.readFileSync(path.join(__dirname, '..', 'js', 'data', 'appVersion.js'), 'utf8')
  .match(/APP_VERSION = '([^']+)'/)[1];
const cacheName = `macrochef-v${appVersion}`;
const handlers = {};
const stores = new Map();
let privateResponse = false;
let offline = false;
let skipped = false;
let failCachePut = false;
let cacheOpens = 0;
let cacheMatches = 0;
let cacheWrites = 0;
const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
const response = (type = 'basic') => ({
  ok: true,
  type,
  headers: new Headers(privateResponse ? { 'Cache-Control': 'private, no-store' } : {}),
  clone() { return this; }
});
const caches = {
  async open(name) {
    cacheOpens++;
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name);
    return {
      async put(request, value) {
        cacheWrites++;
        if (failCachePut) throw new Error('QuotaExceededError');
        data.set(key(request), value);
      },
      async match(request) { cacheMatches++; return data.get(key(request)); },
      async delete(request) { return data.delete(key(request)); }
    };
  },
  async match(request) {
    cacheMatches++;
    for (const data of stores.values()) {
      if (data.has(key(request))) return data.get(key(request));
    }
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
const context = vm.createContext({
  self, caches, URL, Promise, Set, console,
  fetch: async (request, options) => {
    if (offline) throw new Error('offline');
    const url = key(request);
    if (url.startsWith('https://unpkg.com/') || url.startsWith('https://cdn.tailwindcss.com/') ||
        url.startsWith('https://cdn.jsdelivr.net/')) {
      return response(options && options.mode === 'cors' ? 'cors' : 'opaque');
    }
    return response();
  }
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), context);

async function lifecycle(name) {
  let promise;
  handlers[name]({ waitUntil(value) { promise = value; } });
  return promise;
}

function request(url, headers = {}, method = 'GET') {
  let result;
  let background;
  handlers.fetch({
    request: { url: new URL(url, origin).href, method, headers: new Headers(headers) },
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
  const bypass = [
    ['https://xymudnmqahgayqvpznwz.supabase.co/rest/v1/recipes'],
    ['https://pcjlrcuyhtqoijtkrlyj.supabase.co/functions/v1/generate-recipe-image'],
    ['https://supabase.co/storage/v1/object/file'],
    ['https://unrelated.example/data', { authorization: 'Bearer test' }],
    ['/index.html', { authorization: 'Bearer test' }],
    ['/index.html', {}, 'POST']
  ];
  for (const [url] of bypass) {
    const absoluteUrl = key(url);
    if (new URL(absoluteUrl).origin !== origin.slice(0, -1)) {
      vm.runInContext(`STATIC_URLS.add(${JSON.stringify(absoluteUrl)})`, context);
      stores.get(cacheName).set(absoluteUrl, response());
    }
  }
  const beforeSensitiveRequests = new Map(stores.get(cacheName));
  const beforeCacheAccess = [cacheOpens, cacheMatches, cacheWrites];
  for (const [url, headers, method] of bypass) {
    const event = request(url, headers, method);
    assert.equal(event.result, undefined, `${url} must bypass the service worker`);
    assert.equal(event.background, undefined, `${url} must not start cache work`);
  }
  assert.deepEqual([cacheOpens, cacheMatches, cacheWrites], beforeCacheAccess,
    'Sensitive and non-GET requests must not access Cache Storage');
  assert.equal(request('/api/profile').result, undefined);
  assert.equal(request('/index.html?token=secret').result, undefined);
  assert.equal(request('/index.html', { Authorization: 'Bearer test' }).result, undefined);
  assert.equal(request('/index.html', { 'Cache-Control': 'no-store' }).result, undefined);
  assert.equal(request('https://unpkg.com/other-script.js').result, undefined);
  assert.equal(request('https://abc.supabase.co/rest/v1/recipes').result, undefined);
  assert.equal(request('https://abc.supabase.co/auth/v1/token').result, undefined);
  assert.equal(request('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js',
    { Authorization: 'Bearer x' }).result, undefined);
  for (const [url] of bypass) {
    if (new URL(key(url)).origin !== origin.slice(0, -1)) stores.get(cacheName).delete(key(url));
  }
  for (const [url] of bypass) {
    if (new URL(key(url)).origin !== origin.slice(0, -1)) beforeSensitiveRequests.delete(key(url));
  }
  const cachedKeys = [...stores.get(cacheName).keys()];
  assert.deepEqual(stores.get(cacheName), beforeSensitiveRequests, 'Sensitive requests must not modify the cache');
  assert.equal(cachedKeys.some((url) => new URL(url).hostname.endsWith('.supabase.co')), false);
  assert.equal(cachedKeys.some((url) => url.includes('/rest/v1/') || url.includes('/auth/v1/')), false);
  assert.ok(stores.get(cacheName).has('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js'));
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const cdnScripts = [...indexHtml.matchAll(/<script\s+src="(https:\/\/[^"]+)"/g)].map((match) => match[1]);
  for (const url of cdnScripts) {
    assert.match(url, /(?:@|\/)\d+\.\d+\.\d+(?:\/|$)/, `${url} must use a pinned version`);
    assert.ok(stores.get(cacheName).has(url), `${url} must be precached for offline use`);
  }
  const localScripts = [...indexHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
    .map((match) => match[1]).filter((url) => !url.startsWith('https://'));
  for (const url of localScripts) {
    assert.ok(stores.get(cacheName).has(key(url)), `${url} must be precached for offline use`);
  }
  offline = true;
  for (const asset of ['/index.html', '/js/app.js']) {
    const cached = request(asset);
    assert.equal(await cached.result, stores.get(cacheName).get(key(asset)), `${asset} is served from cache offline`);
    await cached.background;
  }
  const cachedReact = request('https://unpkg.com/react@18.3.1/umd/react.production.min.js');
  assert.ok(await cachedReact.result);
  await cachedReact.background;
  for (const asset of ['/js/permissions.js', '/js/components/AdBanner.js']) {
    const cachedAsset = request(asset);
    assert.ok(await cachedAsset.result, `${asset} is available offline`);
    await cachedAsset.background;
  }
  offline = false;
  failCachePut = true;
  const quota = request('/index.html');
  assert.ok(await quota.result);
  await quota.background;
  failCachePut = false;
  privateResponse = true;
  const revalidated = request('/index.html');
  assert.ok(await revalidated.result);
  await revalidated.background;
  assert.equal(stores.get(cacheName).has(key('/index.html')), false);
  console.log('PASS: static and CDN allowlists, offline cache, quota handling, cache ownership');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
