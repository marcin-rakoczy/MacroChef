const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'macrochef-bundle-test-'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

try {
  for (const file of ['build.js', 'index.html']) {
    fs.copyFileSync(path.join(root, file), path.join(temporaryRoot, file));
  }
  for (const directory of ['js', 'src']) {
    fs.cpSync(path.join(root, directory), path.join(temporaryRoot, directory), { recursive: true });
  }

  const runBuild = () => spawnSync(process.execPath, ['build.js'], {
    cwd: temporaryRoot, encoding: 'utf8'
  });
  const result = runBuild();
  assert.ifError(result.error);
  assert.equal(result.status, 0, `Build failed: ${result.stderr}`);

  const template = read('index.html');
  const localScripts = [...template.matchAll(/<!--[\s\S]*?-->|<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi)]
    .filter((match) => match[1] !== undefined)
    .map((match) => match[1].match(/(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i))
    .filter(Boolean)
    .map((match) => match[1] || match[2] || match[3])
    .filter((src) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src));
  assert.ok(localScripts.length > 0, 'Template must contain local scripts');
  for (const src of [
    'js/supabaseClient.js', 'js/auth.js', 'js/services/recipeImageAI.js',
    'js/components/AuthModal.js', 'js/components/AdBanner.js', 'js/components/RecipeModal.js',
    'js/components/Header.js', 'js/components/RecipeLibrary.js', 'js/db.js',
    'js/app.js', 'js/i18n/translations.js'
  ]) {
    assert.ok(localScripts.includes(src), `Template is missing ${src}`);
  }
  const firstComponent = localScripts.findIndex((src) => src.startsWith('js/components/'));
  for (const src of ['js/supabaseClient.js', 'js/auth.js', 'js/db.js', 'js/services/recipeImageAI.js']) {
    assert.ok(localScripts.indexOf(src) < firstComponent, `${src} must precede components`);
    assert.ok(localScripts.indexOf(src) < localScripts.indexOf('js/app.js'), `${src} must precede the app`);
  }

  const expectedMarkers = localScripts.map((src) => path.posix.relative('js', src));
  const output = fs.readFileSync(path.join(temporaryRoot, 'dist', 'index.html'), 'utf8');
  const standalone = fs.readFileSync(path.join(temporaryRoot, 'macrochef_calorie_meal_planner_pwa.html'), 'utf8');
  assert.ok(output.length > 0, 'dist/index.html must not be empty');
  assert.equal(standalone, output, 'Standalone and dist HTML must match');
  assert.deepEqual([...output.matchAll(/^\/\/ File: (.+)$/gm)].map((match) => match[1]), expectedMarkers,
    'Every local script must be included exactly once in template order');
  let offset = -1;
  for (const src of localScripts) {
    const next = output.indexOf(read(src), offset + 1);
    assert.ok(next > offset, `${src} must appear in template order`);
    offset = next;
  }
  assert.doesNotMatch(output, /<script\b[^>]*\bsrc\s*=\s*["']?(?:\.\/)?(?:js|src)\//i,
    'Local application scripts must be inlined');
  assert.match(output, /<script type="text\/babel">/);
  assert.match(output, /<script src="https:\/\/unpkg\.com\/@babel\/standalone@/);
  for (const symbol of [
    'window.MacroChef.supabaseClient =', 'window.MacroChef.auth =',
    'window.MacroChef.recipeImageAI =', 'window.MacroChef.components.AuthModal =',
    'window.MacroChef.components.AdBanner =', 'window.MacroChef.components.RecipeModal =',
    'window.MacroChef.DexieCalorieRepository =', 'window.MacroChef.App ='
  ]) {
    assert.ok(output.includes(symbol), `Generated HTML is missing ${symbol}`);
  }

  for (const tag of [
    "<script src='js/extra.js'></script>",
    '<script src=js/extra.js></script>'
  ]) {
    fs.writeFileSync(path.join(temporaryRoot, 'index.html'), `${template}\n${tag}\n`);
    const invalid = runBuild();
    assert.ifError(invalid.error);
    assert.notEqual(invalid.status, 0, `Unexpected local script must fail the build: ${tag}`);
    assert.match(invalid.stderr, /script list.*must match/i);
  }
  fs.writeFileSync(path.join(temporaryRoot, 'index.html'), template);
  fs.unlinkSync(path.join(temporaryRoot, 'js', 'auth.js'));
  const missing = runBuild();
  assert.ifError(missing.error);
  assert.notEqual(missing.status, 0, 'Missing local scripts must fail the build');
  assert.match(missing.stderr, /MISSING: auth\.js/);

  console.log(`PASS: ${localScripts.length} ordered modules in dist and standalone HTML`);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
