const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workflow = (name) => read(`.github/workflows/${name}.yml`).replace(/\r\n/g, '\n');
const ci = workflow('ci');
const prod = workflow('deploy-prod');
const test = workflow('deploy-test');
const feature = workflow('deploy-feature');
const job = (source, name) => {
  const jobs = source.slice(source.indexOf('\njobs:') + 1);
  const match = jobs.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, 'm'));
  const body = match && match[1];
  assert.ok(body, `Missing workflow job: ${name}`);
  return body;
};
assert.equal(fs.existsSync(path.join(root, '.github', 'workflows', 'deploy.yml')), false);
assert.match(ci, /^name: CI Tests$/m);
assert.match(ci, /^  push:\n    branches:\n      - main$/m);
assert.match(ci, /^  pull_request:$/m);
assert.match(ci, /^  workflow_call:$/m);
const testJob = job(ci, 'test');
assert.match(testJob, /github\.event_name != 'push' \|\| !contains\(github\.event\.head_commit\.message, '\[skip ci\]'\)/);
assert.match(testJob, /for test in tests\/\*\.test\.js; do/);
assert.match(testJob, /node "\$test"/);
assert.match(testJob, /tests\/\*\.browser\.test\.js/);
assert.match(testJob, /npm run build/);
assert.doesNotMatch(ci, /bump-version\.js|git push|actions\/deploy-pages@|cloudflare\/wrangler-action@/);

for (const [source, name] of [[prod, 'PROD'], [test, 'TEST'], [feature, 'FEATURE']]) {
  assert.match(source, new RegExp(`^name: Deploy to ${name}$`, 'm'));
  assert.match(source, /^  workflow_dispatch:/m);
  assert.doesNotMatch(source, /^  (?:push|pull_request):/m);
  assert.doesNotMatch(source, /^\s+continue-on-error:|\balways\s*\(/m);
  assert.match(job(source, 'ci'), /uses: \.\/\.github\/workflows\/ci\.yml/);
}
assert.match(prod, /contents: write/);
assert.match(prod, /pages: write/);
assert.match(prod, /id-token: write/);
assert.match(prod, /group: pages-prod\n  cancel-in-progress: false/);
assert.match(job(prod, 'validate-main'), /"\$GITHUB_REF" != "refs\/heads\/main"/);
assert.match(job(prod, 'validate-main'), /::error::PROD deployment must be run from the main branch/);
assert.match(job(prod, 'ci'), /^    needs: validate-main$/m);
const buildJob = job(prod, 'build');
const deployJob = job(prod, 'deploy');
assert.match(buildJob, /^    needs: ci$/m);
assert.match(buildJob, /ref: main\n          token: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
assert.match(buildJob, /git rev-parse HEAD.*GITHUB_SHA/);
assert.doesNotMatch(buildJob, /persist-credentials:\s*false/);
assert.match(buildJob, /git config user\.name "github-actions\[bot\]"/);
assert.match(buildJob, /git add package\.json sw\.js js\/data\/appVersion\.js dist\/ macrochef_calorie_meal_planner_pwa\.html/);
assert.match(buildJob, /git commit .*chore\(release\): bump version \[skip ci\]/);
assert.match(buildJob, /git push origin HEAD:refs\/heads\/main/);
assert.match(buildJob, /test "\$\(tr -d '\\r\\n' < CNAME\)" = "macrochef\.pl"/);
assert.match(buildJob, /uses: actions\/configure-pages@v5/);
assert.match(buildJob, /uses: actions\/upload-pages-artifact@v3[\s\S]*?name: github-pages\n\s+path: \./);
assert.match(deployJob, /^    needs: \[ci, build\]$/m);
assert.match(deployJob, /name: github-pages/);
assert.match(deployJob, /uses: actions\/deploy-pages@v4/);
const bump = buildJob.indexOf('node scripts/bump-version.js');
const build = buildJob.indexOf('npm run build');
const commit = buildJob.indexOf('git commit');
const upload = buildJob.indexOf('actions/upload-pages-artifact@');
assert.ok(bump >= 0 && bump < build && build < commit && commit < upload,
  'Production must bump, build, commit, and then upload');
assert.equal(read('CNAME').trim(), 'macrochef.pl');

for (const source of [test, feature]) {
  const deploy = job(source, 'deploy');
  assert.match(deploy, /needs: (?:ci|\[validate-feature, ci\])/);
  assert.match(deploy, /actions\/checkout@v4/);
  assert.match(deploy, /actions\/setup-node@v4/);
  assert.match(deploy, /npm run build/);
  assert.match(deploy, /result\.production_branch == "main"/);
  assert.ok(deploy.indexOf('result.production_branch == "main"') < deploy.indexOf('cloudflare/wrangler-action@v3'));
  assert.match(deploy, /cloudflare\/wrangler-action@v3/);
  assert.match(deploy, /apiToken: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(deploy, /accountId: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
  assert.doesNotMatch(source, /bump-version\.js|git (?:commit|push)/);
}
assert.match(job(test, 'deploy'), /pages deploy \. --project-name=macrochef-3wo --branch=main/);
assert.match(job(test, 'deploy'), /name: Report deployment\n        run: \|\n          echo 'TEST: https:\/\/test\.macrochef\.pl' >> "\$GITHUB_STEP_SUMMARY"/);
assert.match(feature, /feature_name:\n\s+description:.*\n\s+required: true\n\s+type: string/);
assert.match(job(feature, 'validate-feature'), /FEATURE_NAME: \$\{\{ inputs\.feature_name \}\}/);
assert.ok(job(feature, 'validate-feature').includes(
  '[[ ${#FEATURE_NAME} -gt 63 || ! "$FEATURE_NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ || "$FEATURE_NAME" == "main" ]]'
), 'Preview names must be safe branch slugs and must not target main');
assert.match(job(feature, 'ci'), /needs: validate-feature/);
assert.match(job(feature, 'deploy'), /pages deploy \. --project-name=macrochef-3wo --branch=\$\{\{ needs\.validate-feature\.outputs\.branch \}\}/);
assert.match(job(feature, 'deploy'), /pages-deployment-alias-url/);
assert.match(job(feature, 'deploy'), /GITHUB_STEP_SUMMARY/);

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
