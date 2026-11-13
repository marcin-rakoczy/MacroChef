const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const source = read('js', 'supabaseClient.js');
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js';

function load({ protocol = 'https:', supabase, url = 'https://abc.supabase.co', key = 'anon-key' } = {}) {
  const window = { location: { protocol }, supabase };
  const code = source
    .replace(/const SUPABASE_URL = '[^']*';/, `const SUPABASE_URL = ${JSON.stringify(url)};`)
    .replace(/const SUPABASE_ANON_KEY = '[^']*';/, `const SUPABASE_ANON_KEY = ${JSON.stringify(key)};`);
  const warnings = [];
  vm.runInNewContext(code, { window, console: { warn: (...args) => warnings.push(args) } });
  return { MacroChef: window.MacroChef, warnings };
}

const calls = [];
const sdk = { createClient: (...args) => { calls.push(args); return { fake: true }; } };

// Online mode
let { MacroChef } = load({ supabase: sdk });
assert.deepEqual(MacroChef.supabaseClient, { fake: true });
assert.equal(MacroChef.supabase.enabled, true);
assert.equal(MacroChef.supabase.mode, 'online');
assert.deepEqual(calls[0].slice(0, 2), ['https://abc.supabase.co', 'anon-key']);
assert.equal(calls[0][2].auth.persistSession, true);
assert.equal(calls[0][2].auth.autoRefreshToken, true);

// file:// standalone bundle: guest mode, SDK never touched
calls.length = 0;
({ MacroChef } = load({ protocol: 'file:', supabase: sdk }));
assert.equal(MacroChef.supabaseClient, null);
assert.equal(MacroChef.supabase.enabled, false);
assert.equal(MacroChef.supabase.mode, 'guest');
assert.equal(MacroChef.supabase.reason, 'file-protocol');
assert.equal(calls.length, 0);

// Missing configuration (shipped defaults) and missing SDK
({ MacroChef } = load({ supabase: sdk, url: '', key: '' }));
assert.equal(MacroChef.supabase.reason, 'not-configured');
assert.equal(MacroChef.supabaseClient, null);
({ MacroChef } = load({ supabase: undefined }));
assert.equal(MacroChef.supabase.reason, 'library-unavailable');
assert.equal(MacroChef.supabase.mode, 'guest');

// SDK throwing must not propagate
const failing = load({ supabase: { createClient() { throw new Error('boom'); } } });
assert.equal(failing.MacroChef.supabase.reason, 'init-failed');
assert.equal(failing.MacroChef.supabaseClient, null);
assert.equal(failing.warnings.length, 1);

// Shipped config: public project URL and publishable key only (never a secret/service_role key)
assert.match(source, /const SUPABASE_URL = 'https:\/\/xymudnmqahgayqvpznwz\.supabase\.co';/);
assert.match(source, /const SUPABASE_ANON_KEY = 'sb_publishable_[\w-]+';/);
assert.equal(/sb_secret_|service_role/.test(source), false);

// Wiring: index.html, build.js, sw.js
const html = read('index.html');
const sdkTag = `<script src="${SDK_URL}"></script>`;
const order = (needle) => {
  const index = html.indexOf(needle);
  assert.ok(index >= 0, `${needle} present in index.html`);
  return index;
};
assert.ok(order('dexie@3.2.4') < order(sdkTag), 'SDK loads after Dexie');
assert.ok(order(sdkTag) < order('js/supabaseClient.js'), 'SDK loads before client');
assert.ok(order('js/supabaseClient.js') < order('js/db.js'), 'client loads before app scripts');
assert.ok(order('js/supabaseClient.js') < order('js/main.js'));

const build = read('build.js');
assert.ok(build.includes("'supabaseClient.js'"), 'build.js bundles supabaseClient.js');
assert.ok(build.indexOf("'supabaseClient.js'") < build.indexOf("'db.js'"));

const sw = read('sw.js');
assert.ok(sw.includes(SDK_URL), 'sw.js pre-caches the pinned SDK');
assert.ok(sw.includes("'./js/supabaseClient.js'"), 'sw.js pre-caches supabaseClient.js');
assert.equal(/supabase-js@(?!2\.49\.1\/)/.test(html + sw), false, 'SDK version is pinned everywhere');

console.log('PASS: supabase client guest/online modes and script wiring');
