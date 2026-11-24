const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const source = read('js', 'supabaseClient.js');
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js';

function load({ protocol = 'https:', hostname = 'localhost', supabase, config } = {}) {
  const window = { location: { protocol, hostname }, supabase };
  const code = config
    ? source.replace('const config = envConfig[window.MacroChef.ENV];', `const config = ${JSON.stringify(config)};`)
    : source;
  const warnings = [];
  vm.runInNewContext(code, { window, console: { log() {}, warn: (...args) => warnings.push(args) } });
  return { MacroChef: window.MacroChef, warnings };
}

const calls = [];
const sdk = { createClient: (...args) => { calls.push(args); return { fake: true }; } };

// Online environments use their own public keys.
const environments = [
  ['macrochef.pl', 'PROD', 'xymudnmqahgayqvpznwz', 'sb_publishable_9_ZBVJnYEoFr8OWbAE0dMQ_RP1v7VeJ'],
  ['www.macrochef.pl', 'PROD', 'xymudnmqahgayqvpznwz', 'sb_publishable_9_ZBVJnYEoFr8OWbAE0dMQ_RP1v7VeJ'],
  ['test.macrochef.pl', 'TEST', 'pcjlrcuyhtqoijtkrlyj', 'sb_publishable_iSEcgBEq4yh2BTtX7C8CSw_FePyqrgj'],
  ['localhost', 'TEST', 'pcjlrcuyhtqoijtkrlyj', 'sb_publishable_iSEcgBEq4yh2BTtX7C8CSw_FePyqrgj'],
  ['127.0.0.1', 'TEST', 'pcjlrcuyhtqoijtkrlyj', 'sb_publishable_iSEcgBEq4yh2BTtX7C8CSw_FePyqrgj'],
  ['other.example', 'TEST', 'pcjlrcuyhtqoijtkrlyj', 'sb_publishable_iSEcgBEq4yh2BTtX7C8CSw_FePyqrgj']
];
let MacroChef;
for (const [hostname, environment, projectRef, key] of environments) {
  calls.length = 0;
  ({ MacroChef } = load({ hostname, supabase: sdk }));
  assert.equal(MacroChef.ENV, environment);
  assert.deepEqual(MacroChef.supabaseClient, { fake: true });
  assert.equal(MacroChef.supabase.enabled, true);
  assert.equal(MacroChef.supabase.mode, 'online');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), [`https://${projectRef}.supabase.co`, key]);
  assert.equal(calls[0][2].auth.persistSession, true);
  assert.equal(calls[0][2].auth.autoRefreshToken, true);
}

// file:// standalone bundle: guest mode, SDK never touched
calls.length = 0;
({ MacroChef } = load({ protocol: 'file:', hostname: 'macrochef.pl', supabase: sdk }));
assert.equal(MacroChef.ENV, 'LOCAL');
assert.equal(MacroChef.supabaseClient, null);
assert.equal(MacroChef.supabase.enabled, false);
assert.equal(MacroChef.supabase.mode, 'guest');
assert.equal(MacroChef.supabase.reason, 'file-protocol');
assert.equal(calls.length, 0);

// Missing configuration (shipped defaults) and missing SDK
({ MacroChef } = load({ supabase: sdk, config: { url: '', anonKey: '' } }));
assert.equal(MacroChef.supabase.reason, 'not-configured');
assert.equal(MacroChef.supabaseClient, null);
({ MacroChef } = load({ supabase: sdk, config: { url: 'PLACEHOLDER', anonKey: 'key' } }));
assert.equal(MacroChef.supabase.reason, 'credentials-not-configured');
({ MacroChef } = load({ supabase: undefined }));
assert.equal(MacroChef.supabase.reason, 'library-unavailable');
assert.equal(MacroChef.supabase.mode, 'guest');

// SDK throwing must not propagate
const failing = load({ supabase: { createClient() { throw new Error('boom'); } } });
assert.equal(failing.MacroChef.supabase.reason, 'init-failed');
assert.equal(failing.MacroChef.supabaseClient, null);
assert.equal(failing.warnings.length, 1);

// Shipped config: public project URL and publishable key only (never a secret/service_role key)
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
