const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workflow = read('.github/workflows/deploy.yml').replace(/\r\n/g, '\n');
const jobs = new Map([...workflow.matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:\n|(?![\s\S]))/gm)]
  .map((match) => [match[1], match[2]]));
const job = (name) => {
  const body = jobs.get(name);
  assert.ok(body, `Missing workflow job: ${name}`);
  return body;
};
const testJob = job('test');
const previewJob = job('build-preview');
const buildJob = job('build');
const deployJob = job('deploy-github-pages');
const triggers = workflow.slice(0, workflow.indexOf('\njobs:'));
assert.match(triggers, /(?:^|\n)  push:\n    branches:\n      - main(?:\n|$)/);
assert.match(triggers, /(?:^|\n)  pull_request:\n    branches:\n      - main(?:\n|$)/);
assert.match(triggers, /(?:^|\n)  workflow_dispatch:/);
assert.doesNotMatch(testJob, /^    if:/m, 'Tests must run for all configured events');
assert.doesNotMatch(`${testJob}\n${buildJob}\n${deployJob}`, /^\s+continue-on-error:/m);
assert.doesNotMatch(`${testJob}\n${buildJob}\n${deployJob}`, /^ {6,}if:/m);
assert.match(testJob, /name: Run tests\n        shell: bash\n        run: \|/);
assert.match(testJob, /node tests\/deployPipeline\.test\.js/);
assert.match(testJob, /for test in tests\/\*\.test\.js; do/);
assert.match(testJob, /node "\$test"/);
assert.match(testJob, /tests\/\*\.browser\.test\.js/);
assert.match(previewJob, /^    needs: test$/m);
assert.match(previewJob, /github\.event_name == 'push'/);
assert.match(previewJob, /contains\(github\.event\.head_commit\.message, '\[skip ci\]'\)/);
assert.doesNotMatch(`${testJob}\n${previewJob}`, /bump-version\.js|actions\/deploy-pages@/);
assert.match(buildJob, /^    needs: test$/m);
const releaseGuard = "github.ref == 'refs/heads/main' && github.event_name == 'workflow_dispatch'";
assert.ok(buildJob.includes(`    if: ${releaseGuard}\n`), 'Build must be manual and limited to main');
assert.ok(deployJob.includes(`    if: ${releaseGuard} && needs.test.result == 'success' && needs.build.result == 'success'\n`),
  'Deploy must require a successful manual main release');
assert.match(deployJob, /^    needs: \[test, build\]$/m);
assert.doesNotMatch(`${buildJob}\n${deployJob}`, /\balways\s*\(/);
assert.match(buildJob, /token: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
assert.doesNotMatch(buildJob, /persist-credentials:\s*false/);
assert.match(buildJob, /git config user\.name "github-actions\[bot\]"/);
assert.match(buildJob, /git add package\.json sw\.js js\/data\/appVersion\.js dist\/ macrochef_calorie_meal_planner_pwa\.html/);
assert.match(buildJob, /git commit .*chore: bump version \[skip ci\]/);
assert.match(buildJob, /git push origin HEAD:refs\/heads\/main/);
assert.match(buildJob, /test "\$\(tr -d '\\r\\n' < CNAME\)" = "macrochef\.pl"/);
assert.match(buildJob, /uses: actions\/upload-pages-artifact@v\d+[\s\S]*?name: github-pages\n\s+path: \./);
assert.match(deployJob, /uses: actions\/deploy-pages@v\d+/);
assert.match(workflow, /contents: write/);
assert.match(workflow, /pages: write/);
assert.match(workflow, /id-token: write/);
const bump = buildJob.indexOf('node scripts/bump-version.js');
const build = buildJob.indexOf('npm run build');
const commit = buildJob.indexOf('git commit');
const upload = buildJob.indexOf('actions/upload-pages-artifact@');
assert.ok(bump >= 0 && bump < build && build < commit && commit < upload,
  'Production must bump, build, commit, and then upload');
assert.equal(read('CNAME').trim(), 'macrochef.pl');

const version = JSON.parse(read('package.json')).version;
assert.match(version, /^\d+\.\d+\.\d+$/);
assert.ok(read('js/data/appVersion.js').includes(`window.MacroChef.APP_VERSION = '${version}';`));
assert.ok(read('sw.js').includes(`const CACHE_NAME = 'macrochef-v${version}';`));
assert.match(read('js/components/Header.js'), /window\.MacroChef\.APP_VERSION/);
assert.equal(JSON.parse(read('package.json')).scripts.build, 'node build.js');

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'macrochef-deploy-test-'));
try {
  for (const file of ['package.json', 'build.js', 'index.html', 'sw.js']) {
    fs.copyFileSync(path.join(root, file), path.join(temporaryRoot, file));
  }
  fs.mkdirSync(path.join(temporaryRoot, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts', 'bump-version.js'),
    path.join(temporaryRoot, 'scripts', 'bump-version.js'));
  for (const directory of ['js', 'src']) {
    fs.cpSync(path.join(root, directory), path.join(temporaryRoot, directory), { recursive: true });
  }
  execSync('npm run build', { cwd: temporaryRoot, stdio: 'pipe' });
  const output = fs.readFileSync(path.join(temporaryRoot, 'dist', 'index.html'), 'utf8');
  const template = read('index.html');
  const localScripts = [...template.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]
    .map((match) => match[1]).filter((src) => !/^(?:https?:)?\/\//.test(src));
  let previousOffset = -1;
  for (const src of localScripts) {
    assert.ok(output.includes(read(src)), `${src} must be included in the generated HTML`);
    const offset = output.indexOf(read(src), previousOffset + 1);
    assert.ok(offset > previousOffset, `${src} must be included in template order`);
    previousOffset = offset;
    assert.ok(!output.includes(`src="${src}"`), `${src} must not remain an external script`);
  }
  for (const src of ['js/supabaseClient.js', 'js/auth.js', 'js/services/recipeImageAI.js',
    'js/components/AuthModal.js', 'js/components/AdBanner.js', 'js/components/RecipeModal.js']) {
    assert.ok(localScripts.includes(src), `${src} must be included in the application`);
  }
  assert.ok(output.includes(`window.MacroChef.APP_VERSION = '${version}';`));
  assert.match(output, /<script type="text\/babel">/);

  const [major, minor, patch] = version.split('.');
  const nextVersion = `${major}.${minor}.${Number(patch) + 1}`;
  execSync('node scripts/bump-version.js && npm run build', { cwd: temporaryRoot, stdio: 'pipe' });
  assert.equal(JSON.parse(fs.readFileSync(path.join(temporaryRoot, 'package.json'), 'utf8')).version, nextVersion);
  assert.ok(fs.readFileSync(path.join(temporaryRoot, 'sw.js'), 'utf8').includes(`macrochef-v${nextVersion}`));
  assert.ok(fs.readFileSync(path.join(temporaryRoot, 'dist', 'index.html'), 'utf8')
    .includes(`window.MacroChef.APP_VERSION = '${nextVersion}';`));

  fs.appendFileSync(path.join(temporaryRoot, 'index.html'), '\n<script src="js/missing.js"></script>\n');
  const invalid = spawnSync(process.execPath, ['build.js'], { cwd: temporaryRoot, encoding: 'utf8' });
  assert.notEqual(invalid.status, 0, 'Unexpected local scripts must fail the build');
  assert.match(invalid.stderr, /script list.*must match/i);

  fs.writeFileSync(path.join(temporaryRoot, 'index.html'), template);
  fs.unlinkSync(path.join(temporaryRoot, 'js', 'auth.js'));
  const missing = spawnSync(process.execPath, ['build.js'], { cwd: temporaryRoot, encoding: 'utf8' });
  assert.notEqual(missing.status, 0, 'A missing application script must fail the build');
  assert.match(missing.stderr, /MISSING: auth\.js/);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log('PASS: deployment guards, version parity, and isolated build output');
