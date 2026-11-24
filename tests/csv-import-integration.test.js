/**
 * CSV Import Integration Test
 * Tests the complete flow: parse CSV -> map to recipe structure -> validate
 */

const fs = require('fs');
const path = require('path');

// Mock window and global objects
globalThis.window = {
  MacroChef: {},
  crypto: { randomUUID: () => Math.random().toString(36).substr(2, 9) }
};

// Load the CSV parser
const parserCode = fs.readFileSync(
  path.join(__dirname, '../js/utils/recipeCsv.js'),
  'utf8'
);

// Execute parser code
eval(parserCode);

// Test utilities
const assert = (condition, message) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
};

const assertEquals = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
  }
};

const assertTrue = (condition, message) => {
  if (!condition) throw new Error(`Expected true: ${message}`);
};

let testsPassed = 0;
let testsFailed = 0;
const results = [];

const test = (name, fn) => {
  try {
    fn();
    testsPassed++;
    results.push({ status: '✅', name });
    console.log(`✅ ${name}`);
  } catch (error) {
    testsFailed++;
    results.push({ status: '❌', name, error: error.message });
    console.error(`❌ ${name}: ${error.message}`);
  }
};

// Main Tests
console.log('\n📋 CSV Import Integration Tests\n');

// Test 1: Load real CSV file with proper headers
test('Load real CSV fixture with proper headers', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'macrochef-breakfast-recipes.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const recipes = window.MacroChef.recipeCsv.parseCSV(csvText);
  
  assertTrue(Array.isArray(recipes), 'Result should be an array');
  assertTrue(recipes.length > 0, 'Should parse at least one recipe');
});

// Test 2: Verify parsed recipe structure
test('Parsed recipes have correct structure', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'macrochef-breakfast-recipes.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const recipes = window.MacroChef.recipeCsv.parseCSV(csvText);
  
  const recipe = recipes[0];
  const requiredFields = [
    'name', 'category', 'prepTime', 'servings',
    'calories', 'protein', 'carbs', 'fats',
    'ingredients', 'steps'
  ];
  
  requiredFields.forEach(field => {
    assertTrue(field in recipe, `Recipe should have ${field} field`);
  });
});

// Test 3: Verify field names match AdminRecipes expectations
test('Field names match AdminRecipes.js mapping', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'macrochef-breakfast-recipes.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const recipes = window.MacroChef.recipeCsv.parseCSV(csvText);
  
  const recipe = recipes[0];
  
  // Map as done in AdminRecipes.js handleImportCSV
  const mapped = {
    name: recipe.name,
    category: recipe.category || 'Inne',
    prepTime: recipe.prepTime || 0,
    servings: recipe.servings || 1,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fats: recipe.fats,
    steps: recipe.steps,
    ingredients: recipe.ingredients || []
  };
  
  // Verify all fields are accessible
  Object.entries(mapped).forEach(([key, value]) => {
    assertTrue(value !== undefined && value !== null, `${key} should have a value`);
  });
});

// Test 4: Parse multiple recipes and verify all fields populated
test('Multiple recipes parsed with all fields', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'macrochef-breakfast-recipes.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const recipes = window.MacroChef.recipeCsv.parseCSV(csvText);
  
  recipes.forEach((recipe, idx) => {
    assertTrue(recipe.name && recipe.name.pl.length > 0, `Recipe ${idx} should have name`);
    assertTrue(recipe.category && recipe.category.pl.length > 0, `Recipe ${idx} should have category`);
    assertTrue(typeof recipe.calories === 'number', `Recipe ${idx} should have numeric calories`);
    assertTrue(typeof recipe.protein === 'number', `Recipe ${idx} should have numeric protein`);
    assertTrue(typeof recipe.carbs === 'number', `Recipe ${idx} should have numeric carbs`);
    assertTrue(typeof recipe.fats === 'number', `Recipe ${idx} should have numeric fats`);
    assertTrue(Array.isArray(recipe.ingredients), `Recipe ${idx} should have ingredients array`);
    assertTrue(Array.isArray(recipe.steps.pl), `Recipe ${idx} should have localized steps`);
  });
});

// Test 5: Verify ingredients are parsed with correct structure
test('Ingredients have correct structure', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'macrochef-breakfast-recipes.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const recipes = window.MacroChef.recipeCsv.parseCSV(csvText);
  
  // Find recipe with ingredients
  const recipeWithIngredients = recipes.find(r => r.ingredients && r.ingredients.length > 0);
  assertTrue(recipeWithIngredients !== undefined, 'Should find recipe with ingredients');
  
  if (recipeWithIngredients) {
    recipeWithIngredients.ingredients.forEach((ingredient, idx) => {
      assertTrue(ingredient.name && ingredient.name.pl.length > 0, `Ingredient ${idx} should have name`);
      // Other fields may be optional for this test
    });
  }
});

// Test 6: Verify macros are numeric and valid
test('Macro values are valid numbers', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'macrochef-breakfast-recipes.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const recipes = window.MacroChef.recipeCsv.parseCSV(csvText);
  
  recipes.forEach((recipe, idx) => {
    assertTrue(Number.isFinite(recipe.calories), `Recipe ${idx} calories should be a number`);
    assertTrue(Number.isFinite(recipe.protein), `Recipe ${idx} protein should be a number`);
    assertTrue(Number.isFinite(recipe.carbs), `Recipe ${idx} carbs should be a number`);
    assertTrue(Number.isFinite(recipe.fats), `Recipe ${idx} fats should be a number`);
    
    // Reasonable value ranges (adjust if needed)
    assertTrue(recipe.calories >= 0, `Recipe ${idx} calories should be >= 0`);
    assertTrue(recipe.protein >= 0, `Recipe ${idx} protein should be >= 0`);
    assertTrue(recipe.carbs >= 0, `Recipe ${idx} carbs should be >= 0`);
    assertTrue(recipe.fats >= 0, `Recipe ${idx} fat should be >= 0`);
  });
});

// Test 7: Verify steps are parsed correctly
test('Steps are parsed correctly', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'macrochef-breakfast-recipes.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const recipes = window.MacroChef.recipeCsv.parseCSV(csvText);
  
  recipes.forEach((recipe, idx) => {
    assertTrue(Array.isArray(recipe.steps.pl), `Recipe ${idx} steps should be localized`);
    
    if (recipe.steps.pl.length > 0) {
      recipe.steps.pl.forEach((step, stepIdx) => {
        assertTrue(typeof step === 'string' && step.length > 0, `Recipe ${idx} step ${stepIdx} should be non-empty string`);
      });
    }
  });
});

// Test 8: Integration test - AdminRecipes mapping
test('AdminRecipes.js integration mapping works', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'macrochef-breakfast-recipes.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const parsedRecipes = window.MacroChef.recipeCsv.parseCSV(csvText);
  
  // Simulate what handleImportCSV does
  const recipes = [];
  const session = { userId: 'test-user-123' };
  
  parsedRecipes.forEach(parsedRecipe => {
    const recipe = {
      id: window.crypto.randomUUID(),
      userId: session.userId,
      name: parsedRecipe.name,
      category: parsedRecipe.category || 'Inne',
      prepTime: parsedRecipe.prepTime || 0,
      servings: parsedRecipe.servings || 1,
      calories: parsedRecipe.calories,
      protein: parsedRecipe.protein,
      carbs: parsedRecipe.carbs,
      fats: parsedRecipe.fats,
      steps: parsedRecipe.steps,
      ingredients: parsedRecipe.ingredients || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    recipes.push(recipe);
  });
  
  assertTrue(recipes.length > 0, 'Should create mapped recipes');
  
  recipes.forEach((recipe, idx) => {
    assertTrue(recipe.id && recipe.id.length > 0, `Recipe ${idx} should have id`);
    assertTrue(recipe.userId === 'test-user-123', `Recipe ${idx} should have userId`);
    assertTrue(recipe.createdAt !== undefined, `Recipe ${idx} should have createdAt`);
    assertTrue(recipe.updatedAt !== undefined, `Recipe ${idx} should have updatedAt`);
    
    // This is the critical test - all these fields must exist and be accessible
    assertTrue(
      Number.isFinite(recipe.fats),
      `Recipe ${idx} should have valid fats`
    );
  });
});

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed === 0) {
  console.log('✅ All tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!\n');
  process.exit(1);
}
