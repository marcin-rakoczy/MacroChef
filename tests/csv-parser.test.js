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
    const validRecipes = recipes.filter(r => r.name && r.name.trim());
    assert(validRecipes.length >= 9, `Found ${validRecipes.length} valid recipes`);
    
    // Test first recipe
    const firstRecipe = recipes[0];
    assert(firstRecipe.name.includes('Nocna owsianka'), 'First recipe name correct');
    assert(firstRecipe.category === 'Śniadanie', 'Category is breakfast');
    assert(firstRecipe.servings === 3, 'Servings correct');
    assert(firstRecipe.caloriesPerServing === 490, 'Calories per serving correct');
    assert(firstRecipe.proteinPerServing === 33, 'Protein per serving correct');
    assert(firstRecipe.carbsPerServing === 66, 'Carbs per serving correct');
    assert(firstRecipe.fatsPerServing === 10, 'Fats per serving correct');
    
    // Test ingredients
    assert(firstRecipe.ingredients.length === 5, 'Parsed 5 ingredients');
    assert(firstRecipe.ingredients[0].name === 'Skyr jogurt typu islandzkiego naturalny XXL (Pilos)', 'First ingredient name correct');
    assert(firstRecipe.ingredients[0].amount === 450, 'First ingredient amount correct');
    assert(firstRecipe.ingredients[0].unit === 'g', 'First ingredient unit correct');
    assert(firstRecipe.ingredients[0].packageSize === 450, 'First ingredient package size correct');
    
    // Test steps
    assert(firstRecipe.steps.length > 0, 'Steps parsed');
    assert(firstRecipe.steps[0].startsWith('Przygotuj'), 'First step correct');
    
    // Test second recipe - frittata
    const frittataRecipe = recipes[1];
    assert(frittataRecipe.name.includes('frittata'), 'Second recipe is frittata');
    assert(frittataRecipe.servings === 4, 'Frittata servings correct');
    assert(frittataRecipe.ingredients.length === 5, 'Frittata has 5 ingredients');
    
    // Test recipe with vegan tofu
    const veganRecipe = recipes.find(r => r.name.includes('Wegańska'));
    assert(veganRecipe !== undefined, 'Found vegan recipe');
    if (veganRecipe) {
      assert(veganRecipe.ingredients.length === 6, 'Vegan recipe has 6 ingredients');
    }
    
    // Test macros calculation
    console.log('\n📊 Macro Validation\n');
    recipes.forEach((recipe, idx) => {
      const totalCalories = recipe.caloriesPerServing;
      const caloriesFromMacros = 
        (recipe.proteinPerServing * 4) + 
        (recipe.carbsPerServing * 4) + 
        (recipe.fatsPerServing * 9);
      
      const diff = Math.abs(totalCalories - caloriesFromMacros);
      const valid = diff < 10; // Allow 10 cal rounding error
      
      if (!valid) {
        console.warn(`⚠️ Recipe ${idx + 1} (${recipe.name}): Calories mismatch`);
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
        recipe.caloriesPerServing > 0 &&
        recipe.ingredients.length > 0 &&
        recipe.steps.length > 0;
      
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
