const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const root = path.join(__dirname, '..');
const versionPath = path.join(root, 'js', 'data', 'appVersion.js');
const serviceWorkerPath = path.join(root, 'sw.js');
const packagePath = path.join(root, 'package.json');
const versionSource = fs.readFileSync(versionPath, 'utf8');
const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, 'utf8');
const packageSource = fs.readFileSync(packagePath, 'utf8');
const packageData = JSON.parse(packageSource);
const versionMatch = versionSource.match(/window\.MacroChef\.APP_VERSION = '(\d+)\.(\d+)\.(\d+)';/);

if (!versionMatch) {
  throw new Error('Could not read the app version from js/data/appVersion.js.');
}

const [, major, minor, patch] = versionMatch;
const currentVersion = `${major}.${minor}.${patch}`;
const nextVersion = `${major}.${minor}.${Number(patch) + 1}`;
const cacheVersionPattern = /const CACHE_NAME = 'macrochef-v(\d+\.\d+\.\d+)';/;
const cacheMatch = serviceWorkerSource.match(cacheVersionPattern);

if (!cacheMatch || cacheMatch[1] !== currentVersion || packageData.version !== currentVersion) {
  throw new Error('App, package and service worker versions must match before bumping.');
}

packageData.version = nextVersion;
const changes = [
  [versionPath, versionSource, versionSource.replace(versionMatch[0], `window.MacroChef.APP_VERSION = '${nextVersion}';`)],
  [serviceWorkerPath, serviceWorkerSource, serviceWorkerSource.replace(cacheVersionPattern, `const CACHE_NAME = 'macrochef-v${nextVersion}';`)],
  [packagePath, packageSource, `${JSON.stringify(packageData, null, 2)}\n`]
].map(([file, original, updated]) => ({
  file, original, updated, staged: `${file}.${randomUUID()}.tmp`, backup: `${file}.${randomUUID()}.tmp`
}));

const temporaryFiles = new Set();
const replaced = [];
let failure;
try {
  for (const change of changes) {
    for (const [file, content] of [[change.staged, change.updated], [change.backup, change.original]]) {
      const descriptor = fs.openSync(file, 'wx');
      temporaryFiles.add(file);
      try {
        fs.writeFileSync(descriptor, content, 'utf8');
      } finally {
        fs.closeSync(descriptor);
      }
    }
  }
  for (const change of changes) {
    fs.renameSync(change.staged, change.file);
    temporaryFiles.delete(change.staged);
    replaced.push(change);
  }
} catch (error) {
  const errors = [error];
  for (const change of replaced.reverse()) {
    try {
      fs.renameSync(change.backup, change.file);
      temporaryFiles.delete(change.backup);
    } catch (rollbackError) {
      temporaryFiles.delete(change.backup);
      rollbackError.message += ` (original retained at ${change.backup})`;
      errors.push(rollbackError);
    }
  }
  failure = errors.length === 1 ? error : new AggregateError(errors, 'Version bump and rollback failed');
}
for (const file of temporaryFiles) {
  try {
    fs.unlinkSync(file);
  } catch (error) {
    failure = failure ? new AggregateError([failure, error], 'Version bump cleanup failed') : error;
  }
}
if (failure) throw failure;
console.log(`MacroChef version bumped to ${nextVersion}. Run npm run build before publishing.`);
