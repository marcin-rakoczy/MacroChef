const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'bump-version.js'), 'utf8');
const versionPath = path.join(root, 'js', 'data', 'appVersion.js');
const workerPath = path.join(root, 'sw.js');
const packagePath = path.join(root, 'package.json');
const appVersion = fs.readFileSync(versionPath, 'utf8').match(/APP_VERSION = '([^']+)'/);
const cacheVersion = fs.readFileSync(workerPath, 'utf8').match(/CACHE_NAME = 'macrochef-v([^']+)'/);
assert.ok(appVersion && cacheVersion, 'App and cache versions must be present');
assert.equal(JSON.parse(fs.readFileSync(packagePath, 'utf8')).version, appVersion[1]);
assert.equal(cacheVersion[1], appVersion[1]);

function run(packageVersion, cacheVersion, failRenameAt = 0) {
  const files = new Map([
    [versionPath, "window.MacroChef.APP_VERSION = '1.0.5';\n"],
    [workerPath, `const CACHE_NAME = 'macrochef-v${cacheVersion}';\n`],
    [packagePath, JSON.stringify({ name: 'macrochef', version: packageVersion }, null, 2) + '\n']
  ]);
  const writes = [];
  let renameCount = 0;
  const mockFs = {
    readFileSync(file) {
      if (!files.has(file)) throw new Error(`Unexpected read: ${file}`);
      return files.get(file);
    },
    openSync(file) {
      if (files.has(file)) throw new Error(`Unexpected existing file: ${file}`);
      files.set(file, '');
      return file;
    },
    closeSync() {},
    writeFileSync(file, content) {
      writes.push(file);
      files.set(file, content);
    },
    renameSync(from, to) {
      renameCount++;
      if (renameCount === failRenameAt) throw new Error('Simulated rename failure');
      if (!files.has(from)) throw new Error(`Unexpected rename: ${from}`);
      files.set(to, files.get(from));
      files.delete(from);
    },
    unlinkSync(file) {
      if (!files.delete(file)) throw new Error(`Unexpected cleanup: ${file}`);
    }
  };
  const execute = () => vm.runInNewContext(script, {
    require: (name) => name === 'fs' ? mockFs : require(name),
    __dirname: path.join(root, 'scripts'),
    console: { log() {} }
  });
  return { files, writes, execute };
}

const valid = run('1.0.5', '1.0.5');
valid.execute();
assert.match(valid.files.get(versionPath), /APP_VERSION = '1\.0\.6'/);
assert.match(valid.files.get(workerPath), /CACHE_NAME = 'macrochef-v1\.0\.6'/);
assert.equal(JSON.parse(valid.files.get(packagePath)).version, '1.0.6');

for (const [packageVersion, cacheVersion] of [['1.0.4', '1.0.5'], ['1.0.5', '1.0.4']]) {
  const invalid = run(packageVersion, cacheVersion);
  assert.throws(invalid.execute, /versions must match/);
  assert.equal(invalid.writes.length, 0, 'Mismatched versions must not be modified');
}

for (const failRenameAt of [1, 2, 3]) {
  const interrupted = run('1.0.5', '1.0.5', failRenameAt);
  const original = new Map(interrupted.files);
  assert.throws(interrupted.execute, /Simulated rename failure/);
  assert.deepEqual(interrupted.files, original, 'A failed replacement must restore all original files');
}

console.log('PASS: synchronized version bump, mismatch protection, and rollback');
