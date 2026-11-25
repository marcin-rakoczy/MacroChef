// build.js - Zero-dependency single-file packaging utility for MacroChef
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const JS_DIR = path.join(ROOT_DIR, 'js');

console.log('[MacroChef Build] Checking modular files...');

const filesToBundle = [
  'data/appVersion.js',
  'data/lidlProducts.js',
  'data/defaultPlan.js',
  'i18n/translations.js',
  'i18n/days.js',
  'i18n/context.js',
  'utils/helpers.js',
  'utils/recipeImages.js',
  'utils/recipeCsv.js',
  'utils/productCatalogCsv.js',
  '../src/core/nutrition/calculations.js',
  'utils/shoppingAggregator.js',
  'supabaseClient.js',
  'services/recipeImageAI.js',
  'auth.js',
  'permissions.js',
  'db.js',
  'session/repositoryScope.js',
  'sync/AppSyncManager.js',
  'hooks/useRepositoryQuery.js',
  'components/Icon.js',
  'components/AuthGate.js',
  'components/LoginScreen.js',
  'components/AdBanner.js',
  'components/AuthModal.js',
  'components/Header.js',
  'components/Navigation.js',
  'components/RecipePickerModal.js',
  'components/MealPlanner.js',
  'components/RecipeLibrary.js',
  'components/BatchCooking.js',
  'components/ShoppingList.js',
  'components/MacroTracker.js',
  'components/RecipeModal.js',
  'components/AdminPanel.js',
  'components/AdminUsers.js',
  'components/AdminRecipes.js',
  'components/AdminProducts.js',
  'app.js',
  'components/SessionApp.js',
  'main.js'
];

let allExist = true;
filesToBundle.forEach((relPath) => {
  const fullPath = path.join(JS_DIR, relPath);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ ${relPath}`);
  } else {
    console.error(`  ✗ MISSING: ${relPath}`);
    allExist = false;
  }
});

if (!allExist) {
  process.exit(1);
}

// Inline the application scripts while retaining external assets and browser-side Babel
const bundleContent = filesToBundle
  .map((relPath) => {
    const fullPath = path.join(JS_DIR, relPath);
    return `// ==========================================\n// File: ${relPath}\n// ==========================================\n` + fs.readFileSync(fullPath, 'utf8');
  })
  .join('\n\n');

// Read index.html template and create bundled version
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

// Replace script tags with inlined bundled script
const scriptTagRegex = /<!-- Non-JSX Core Scripts[\s\S]*?<!-- App Component & Main Bootstrapper[\s\S]*?<script type="text\/babel" src="js\/main\.js"><\/script>/;
const scriptSection = indexHtml.match(scriptTagRegex);
if (!scriptSection) {
  throw new Error('Could not find the application script section in index.html.');
}
const scriptSources = (html) => {
  const sources = [];
  const tags = /<!--[\s\S]*?-->|<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi;
  for (const match of html.matchAll(tags)) {
    if (match[1] === undefined) continue;
    const src = match[1].match(/(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
    if (src) sources.push(src[1] || src[2] || src[3] || '');
  }
  return sources;
};
const localScripts = scriptSources(indexHtml)
  .filter((src) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src));
const bundledScripts = filesToBundle.map((file) => path.posix.normalize(`js/${file}`));
const sectionScripts = scriptSources(scriptSection[0]);
if (JSON.stringify(localScripts) !== JSON.stringify(bundledScripts) ||
    JSON.stringify(sectionScripts) !== JSON.stringify(bundledScripts)) {
  throw new Error('Application script list in index.html must match the build script list and order.');
}
if (/<\/script/i.test(bundleContent)) {
  throw new Error('Application scripts cannot contain an HTML closing script tag.');
}

const bundledHtml = indexHtml.replace(
  scriptTagRegex,
  `<!-- Bundled MacroChef Application Script -->\n  <script type="text/babel">\n${bundleContent}\n  </script>`
);

// Write to macrochef_calorie_meal_planner_pwa.html to keep original file updated with all refactorings & fixes
fs.writeFileSync(path.join(ROOT_DIR, 'macrochef_calorie_meal_planner_pwa.html'), bundledHtml, 'utf8');
console.log('✓ Successfully synchronized macrochef_calorie_meal_planner_pwa.html (standalone single-file bundle).');

// Also create dist/ directory
const distDir = path.join(ROOT_DIR, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}
fs.writeFileSync(path.join(distDir, 'index.html'), bundledHtml, 'utf8');
console.log('✓ Successfully created dist/index.html.');

console.log('[MacroChef Build] Build completed successfully.');
