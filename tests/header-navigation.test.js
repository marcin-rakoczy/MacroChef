const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const header = read('js/components/Header.js');
const navigation = read('js/components/Navigation.js');
const app = read('js/app.js');
const sessionApp = read('js/components/SessionApp.js');
const packageJson = require(path.join(root, 'package.json'));
const versionSource = read('js/data/appVersion.js');

assert.match(header, /session,\s*onSignOut/, 'Header must receive the account session and sign-out callback');
assert.doesNotMatch(header, /onOpenAuth/, 'Standalone account modal trigger must be removed');
assert.match(header, /id="macrochef-settings-drawer"/, 'Hamburger menu must render the account drawer');
assert.match(header, /session\?\.email/, 'Drawer must display the signed-in email');
assert.match(header, /authRole\$\{session\.role\}/, 'Drawer must display the localized role');
assert.match(header, /onClick=\{handleSignOut\}/, 'Drawer must provide sign-out');
assert.match(header, /document\.addEventListener\('keydown', handleKeyDown\)/, 'Escape handling must be wired');
assert.match(header, /touchstart/, 'Outside touch handling must be wired');
assert.match(header, /w-\[min\(320px,calc\(100vw-2rem\)\)\]/, 'Mobile drawer must be capped at 320px');
assert.match(header, /min-h-11/, 'Drawer controls must provide 44px touch targets');
assert.match(header, /ENV !== 'PROD'/, 'TEST/LOCAL version display must be environment-gated');
assert.match(header, /md:hidden[\s\S]*APP_VERSION/, 'PROD mobile drawer must display the version');
assert.match(navigation, /aria-current=\{isActive \? 'page' : undefined\}/, 'Navigation must expose the active page');
assert.match(app, /className="hidden md:block/, 'PROD footer must be desktop-only');
assert.match(app, /<footer/, 'PROD footer must be rendered');
assert.match(app, /ENV === 'PROD'/, 'PROD footer must be environment-gated');
assert.match(sessionApp, /onSignOut=\{handleSignOut\}/, 'Authenticated session must pass sign-out to App');
assert.match(versionSource, new RegExp(`APP_VERSION = '${packageJson.version.replace(/\./g, '\\.')}'`),
  'Generated application version must match package.json');

console.log('PASS: header, account drawer, navigation, version, and environment contracts');
