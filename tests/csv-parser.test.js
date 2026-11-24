#!/usr/bin/env node
/**
 * Test Recipe CSV Parser
 * Tests parsing of Polish breakfast recipes from CSV
 */

const fs = require('fs');
const path = require('path');

// Mock window and React globals for Node.js
global.window = {
  crypto: {
    randomUUID: () => Math.random().toString(36).substring(2, 15)
  }
};

// Load the CSV parser
const recipeCSVCode = fs.readFileSync(
  path.join(__dirname, '../js/utils/recipeCsv.js'),
  'utf-8'
);

// Create a new context to execute the code
eval(recipeCSVCode.replace('window.MacroChef.recipeCsv = {', 'global.MacroChefRecipeCSV = {'));

const parseCSV = eval(recipeCSVCode.match(/const parseCSV = [\s\S]*?^  \};/m)?.[0] || '');

// Extract functions from the module
const csvModule = {};
eval(recipeCSVCode);
const { parseCSV: csvParse, parseCSVLine, createTemplate } = global.window.MacroChef.recipeCsv;

// Test data
const testCSVPath = path.join(__dirname, './fixtures/macrochef-recipes-sniadania.csv');

const tests = [];
let passedTests = 0;
let failedTests = 0;

const assert = (condition, message) => {
  if (condition) {
    passedTests++;
    console.log(`✅ ${message}`);
  } else {
    failedTests++;
    console.error(`❌ ${message}`);
  }
};

console.log('🧪 Recipe CSV Parser Tests\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Parse CSV Line with quotes
console.log('📋 Test Suite: CSV Line Parsing\n');
const testLine = `"Jaja ściółkowe";10;"pcs";"10";"pcs"`;
const parsed = parseCSVLine(testLine);
assert(parsed.length === 5, 'Parse CSV line with 5 fields');
assert(parsed[0] === 'Jaja ściółkowe', 'First field correctly unquoted');
assert(parsed[1] === '10', 'Second field parsed as number');

// Test 2: Load and parse real file
console.log('\n📋 Test Suite: Real File Parsing\n');
if (fs.existsSync(testCSVPath)) {
  const fileContent = fs.readFileSync(testCSVPath, 'utf-8');
  
  try {
    const recipes = csvParse(fileContent, 'pl');
    
    assert(recipes.length > 0, `Loaded ${recipes.length} recipes`);
    // May be 9 or 10 depending on trailing empty lines
    const validRecipes = recipes.filter(r => r.name && r.name.pl.trim());
    assert(validRecipes.length >= 9, `Found ${validRecipes.length} valid recipes`);
    
    // Test first recipe
    const firstRecipe = recipes[0];
    assert(firstRecipe.name.pl.includes('Nocna owsianka'), 'First recipe name correct');
    assert(firstRecipe.category.pl === 'Śniadanie', 'Category is breakfast');
    assert(firstRecipe.servings === 3, 'Servings correct');
    assert(firstRecipe.calories === 490, 'Calories per serving correct');
    assert(firstRecipe.protein === 33, 'Protein per serving correct');
    assert(firstRecipe.carbs === 66, 'Carbs per serving correct');
    assert(firstRecipe.fats === 10, 'Fats per serving correct');
    
    // Test ingredients
    assert(firstRecipe.ingredients.length === 5, 'Parsed 5 ingredients');
    assert(firstRecipe.ingredients[0].name.pl === 'Skyr jogurt typu islandzkiego naturalny XXL (Pilos)', 'First ingredient name correct');
    assert(firstRecipe.ingredients[0].amount === 450, 'First ingredient amount correct');
    assert(firstRecipe.ingredients[0].unit === 'g', 'First ingredient unit correct');
    assert(firstRecipe.ingredients[0].packageSize === 450, 'First ingredient package size correct');
    
    // Test steps
    assert(firstRecipe.steps.pl.length > 0, 'Steps parsed');
    assert(firstRecipe.steps.pl[0].startsWith('Przygotuj'), 'First step correct');
    
    // Test second recipe - frittata
    const frittataRecipe = recipes[1];
    assert(frittataRecipe.name.pl.includes('frittata'), 'Second recipe is frittata');
    assert(frittataRecipe.servings === 4, 'Frittata servings correct');
    assert(frittataRecipe.ingredients.length === 5, 'Frittata has 5 ingredients');
    
    // Test recipe with vegan tofu
    const veganRecipe = recipes.find(r => r.name.pl.includes('Wegańska'));
    assert(veganRecipe !== undefined, 'Found vegan recipe');
    if (veganRecipe) {
      assert(veganRecipe.ingredients.length === 6, 'Vegan recipe has 6 ingredients');
    }
    
    // Test macros calculation
    console.log('\n📊 Macro Validation\n');
    recipes.forEach((recipe, idx) => {
      const totalCalories = recipe.calories;
      const caloriesFromMacros = 
        (recipe.protein * 4) +
        (recipe.carbs * 4) +
        (recipe.fats * 9);
      
      const diff = Math.abs(totalCalories - caloriesFromMacros);
      const valid = diff < 10; // Allow 10 cal rounding error
      
      if (!valid) {
        console.warn(`⚠️ Recipe ${idx + 1} (${recipe.name.pl}): Calories mismatch`);
        console.log(`   Stated: ${totalCalories}, Calculated: ${caloriesFromMacros.toFixed(0)}`);
      }
    });
    
    // Summary
    console.log('\n📋 Test Suite: Recipe Structure\n');
    recipes.forEach((recipe, idx) => {
      const hasAllFields = 
        recipe.name &&
        recipe.category &&
        recipe.servings > 0 &&
        recipe.calories > 0 &&
        recipe.ingredients.length > 0 &&
        recipe.steps.pl.length > 0;
      
      assert(hasAllFields, `Recipe ${idx + 1} has all required fields`);
    });
    
  } catch (err) {
    console.error(`❌ Failed to parse CSV: ${err.message}`);
    failedTests++;
  }
} else {
  console.warn(`⚠️  Test file not found: ${testCSVPath}`);
  console.log('Skipping real file tests');
}

// Test 3: Template generation
console.log('\n📋 Test Suite: Template Generation\n');
const templatePL = createTemplate('pl');
assert(templatePL.includes('nazwa'), 'Polish template has "nazwa" header');
assert(templatePL.includes('Przykładowy przepis'), 'Polish template has example values');

const templateEN = createTemplate('en');
assert(templateEN.includes('name'), 'English template has "name" header');
assert(templateEN.includes('Example recipe'), 'English template has example values');
const [englishRecipe] = csvParse(templateEN, 'en');
assert(englishRecipe && englishRecipe.name.en === 'Example recipe' && englishRecipe.fats === 12,
  'English template parses with its macros');
const quotedCsv = templateEN.replace('"Example recipe"', '"Chicken; ""rice"""')
  .replace('"Cook rice|Cook chicken|Serve on plate"', '"Step 1; Step 2|Serve"');
const [quotedRecipe] = csvParse(quotedCsv, 'en');
assert(quotedRecipe.name.en === 'Chicken; "rice"' && quotedRecipe.servings === 2 &&
  quotedRecipe.calories === 450 && quotedRecipe.steps.en[0] === 'Step 1; Step 2',
  'Quoted semicolons and escaped quotes do not shift columns');
const multilineCsv = templateEN.replace('"Cook rice|Cook chicken|Serve on plate"', '"First line\r\nSecond line"');
assert(csvParse(multilineCsv, 'en')[0].steps.en[0] === 'First line\r\nSecond line',
  'Quoted multiline fields are preserved');
const commaRows = window.MacroChef.recipeCsv.parseRows('\uFEFFsep=,\r\n"name;description",servings\r\n"Meal; one",2');
assert(commaRows[0][0] === 'name;description' && commaRows[1][1] === '2',
  'BOM and separator directive select the delimiter');
const detectedRows = window.MacroChef.recipeCsv.parseRows('"name;description",servings\r\n"Meal; one",2');
assert(detectedRows[0].length === 2 && detectedRows[1][0] === 'Meal; one',
  'Delimiter detection ignores quoted semicolons');
let malformedRejected = false;
try { csvParse(templateEN + '\r\n"unterminated', 'en'); } catch (error) { malformedRejected = /unclosed/.test(error.message); }
assert(malformedRejected, 'Unclosed quoted fields are rejected');
let suffixRejected = false;
try { window.MacroChef.recipeCsv.parseRows('"value"junk;next'); } catch (error) { suffixRejected = /invalid quoted/.test(error.message); }
assert(suffixRejected, 'Unexpected characters after closing quotes are rejected');

// Test 4: Import upsert planning
console.log('\n🔁 Test Suite: Import add/update planning\n');
const { planRecipeImport } = global.window.MacroChef.recipeCsv;
const longName = 'A'.repeat(50);
const existingRecipes = [
  { id: 'old-1', name: { pl: 'Jajecznica ze Szpinakiem', en: 'Jajecznica ze Szpinakiem' }, category: { en: 'Breakfast', pl: 'Śniadanie' },
    caloriesPerServing: 250, proteinPerServing: 20, carbsPerServing: 5, fatPerServing: 15, createdAt: '2026-01-01' },
  { id: 'old-2', name: longName + 'stary', category: 'Obiad', calories: 500, protein: 40, carbs: 50, fats: 10 }
];
const imported = [
  { name: { pl: 'jajecznica ze szpinakiem ' }, category: { en: 'Breakfast', pl: 'Śniadanie' }, calories: 250, protein: 20, carbs: 5, fats: 15 },
  { name: { pl: longName + 'nowy' }, category: { en: 'Lunch', pl: 'Obiad' }, calories: 500, protein: 40, carbs: 50, fats: 10 },
  { name: { pl: 'Jajecznica ze Szpinakiem' }, category: { en: 'Breakfast', pl: 'Śniadanie' }, calories: 251, protein: 20, carbs: 5, fats: 15 },
  { name: { pl: 'Jajecznica ze Szpinakiem' }, category: { en: 'Dinner', pl: 'Kolacja' }, calories: 250, protein: 20, carbs: 5, fats: 15 }
];
const importPlan = planRecipeImport(imported, existingRecipes);
assert(importPlan.total === 4 && importPlan.updated === 2 && importPlan.added === 2, 'Counts rows, updates and additions');
assert(importPlan.recipes[0].id === 'old-1' && importPlan.recipes[0].createdAt === '2026-01-01', 'Match overwrites existing id (case/whitespace/legacy fields ignored)');
assert(importPlan.recipes[1].id === 'old-2', 'Name compared on first 50 characters; PL/EN category equivalent');
assert(!['old-1', 'old-2'].includes(importPlan.recipes[2].id), 'Different calories => new recipe');
assert(!['old-1', 'old-2'].includes(importPlan.recipes[3].id), 'Different category => new recipe');
const repeatPlan = planRecipeImport([imported[3], imported[3]], []);
assert(repeatPlan.added === 1 && repeatPlan.updated === 1 && repeatPlan.recipes[0].id === repeatPlan.recipes[1].id, 'Duplicate rows within one file collapse into one recipe');
const diacriticCategories = csvParse('nazwa;kategoria;czasPrzygotowania;porcje;kalorieNaPorcje;bialkoNaPorcje;weglowodanyNaPorcje;tluszczeNaPorcje\nA;Śniadanie;5;1;1;1;1;1\nB;Przekąska;5;1;1;1;1;1');
assert(diacriticCategories[0].category.en === 'Breakfast' && diacriticCategories[1].category.en === 'Snack', 'Polish categories with diacritics are recognised');

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);

if (failedTests > 0) {
  console.log('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}
