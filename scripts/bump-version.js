const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const versionPath = path.join(root, 'js', 'data', 'appVersion.js');
const serviceWorkerPath = path.join(root, 'sw.js');
const versionSource = fs.readFileSync(versionPath, 'utf8');
const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, 'utf8');
const versionMatch = versionSource.match(/window\.MacroChef\.APP_VERSION = '(\d+)\.(\d+)\.(\d+)';/);

if (!versionMatch) {
  throw new Error('Could not read the app version from js/data/appVersion.js.');
}

const [, major, minor, patch] = versionMatch;
const nextVersion = `${major}.${minor}.${Number(patch) + 1}`;
const cacheVersionPattern = /const CACHE_NAME = 'macrochef-v[^']+';/;

if (!cacheVersionPattern.test(serviceWorkerSource)) {
  throw new Error('Could not find the service worker cache version in sw.js.');
}

fs.writeFileSync(
  versionPath,
  versionSource.replace(versionMatch[0], `window.MacroChef.APP_VERSION = '${nextVersion}';`),
  'utf8'
);
fs.writeFileSync(
  serviceWorkerPath,
  serviceWorkerSource.replace(cacheVersionPattern, `const CACHE_NAME = 'macrochef-v${nextVersion}';`),
  'utf8'
);

console.log(`MacroChef version bumped to ${nextVersion}. Run npm run build before publishing.`);
