// build.js - Zero-dependency bundler and local dev utility for MacroChef
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const JS_DIR = path.join(ROOT_DIR, 'js');

console.log('[MacroChef Build] Checking modular files...');

const filesToBundle = [
  'data/appVersion.js',
  'data/lidlProducts.js',
  'data/starterRecipes.js',
  'data/defaultPlan.js',
  'i18n/translations.js',
  'i18n/days.js',
  'i18n/context.js',
  'utils/helpers.js',
  'utils/recipeCsv.js',
  'utils/productCatalogCsv.js',
  '../src/core/nutrition/calculations.js',
  'utils/shoppingAggregator.js',
  'supabaseClient.js',
  'auth.js',
  'db.js',
  'session/repositoryScope.js',
  'sync/AppSyncManager.js',
  'hooks/useRepositoryQuery.js',
  'components/Icon.js',
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

// Generate single-file distribution for double-click offline file:// support
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
