#!/usr/bin/env node
/**
 * Admin Panel Button Layout Test
 * Validates import button repositioning and icon changes
 */

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, condition, details = '') {
  const result = {
    name,
    passed: condition,
    details
  };
  testResults.tests.push(result);
  if (condition) {
    testResults.passed++;
    console.log(`✓ ${name}`);
  } else {
    testResults.failed++;
    console.log(`✗ ${name}`);
    if (details) console.log(`  ${details}`);
  }
}

// Read component files
const fs = require('fs');
const path = require('path');

const adminRecipesPath = path.join(__dirname, '../js/components/AdminRecipes.js');
const adminProductsPath = path.join(__dirname, '../js/components/AdminProducts.js');

const adminRecipesContent = fs.readFileSync(adminRecipesPath, 'utf8');
const adminProductsContent = fs.readFileSync(adminProductsPath, 'utf8');

console.log('\n=== Admin Panel Button Layout Tests ===\n');

// Test 1: AdminRecipes - Search on LEFT, Import on RIGHT
test(
  'AdminRecipes: Search input on LEFT, Import button on RIGHT',
  adminRecipesContent.includes('{/* Search Box - Left Side */}') &&
  adminRecipesContent.includes('{/* Import CSV Button - Right Side */}'),
  'Search should be labeled as left side, Import as right side'
);

// Test 2: AdminRecipes - SVG icon
test(
  'AdminRecipes: Contains SVG down-arrow icon',
  adminRecipesContent.includes('d="M19 14l-7 7m0 0l-7-7m7 7V3"'),
  'SVG path should match down-arrow (↓) icon'
);

// Test 3: AdminRecipes - Horizontal line element
test(
  'AdminRecipes: Icon includes horizontal line element',
  adminRecipesContent.includes('<div className="w-3 h-0.5 bg-current"></div>'),
  'Should have horizontal line div below arrow icon'
);

// Test 4: AdminRecipes - Emerald color scheme
test(
  'AdminRecipes: Uses emerald color scheme',
  adminRecipesContent.includes('text-emerald-700') &&
  adminRecipesContent.includes('border-emerald-300') &&
  adminRecipesContent.includes('dark:text-emerald-300') &&
  adminRecipesContent.includes('dark:border-emerald-700'),
  'Should have emerald-700, emerald-300 and dark mode variants'
);

// Test 5: AdminProducts - Search on LEFT, Import on RIGHT
test(
  'AdminProducts: Search input on LEFT, Import button on RIGHT',
  adminProductsContent.includes('{/* Search Box - Left Side */}') &&
  adminProductsContent.includes('{/* Import CSV Button - Right Side */}'),
  'Search should be labeled as left side, Import as right side'
);

// Test 6: AdminProducts - SVG icon
test(
  'AdminProducts: Contains SVG down-arrow icon',
  adminProductsContent.includes('d="M19 14l-7 7m0 0l-7-7m7 7V3"'),
  'SVG path should match down-arrow (↓) icon'
);

// Test 7: AdminProducts - Horizontal line element
test(
  'AdminProducts: Icon includes horizontal line element',
  adminProductsContent.includes('<div className="w-3 h-0.5 bg-current"></div>'),
  'Should have horizontal line div below arrow icon'
);

// Test 8: AdminProducts - Emerald color scheme
test(
  'AdminProducts: Uses emerald color scheme',
  adminProductsContent.includes('text-emerald-700') &&
  adminProductsContent.includes('border-emerald-300') &&
  adminProductsContent.includes('dark:text-emerald-300') &&
  adminProductsContent.includes('dark:border-emerald-700'),
  'Should have emerald-700, emerald-300 and dark mode variants'
);

// Test 9: Consistency check - Help section right-aligned
test(
  'Both components: Help section (template link + hints) RIGHT-aligned',
  adminRecipesContent.includes('sm:justify-end') &&
  adminProductsContent.includes('sm:justify-end') &&
  adminRecipesContent.includes('text-right') &&
  adminProductsContent.includes('text-right'),
  'Both should have right-alignment classes for template/hint sections'
);

// Test 10: Responsive layout with justify-between
test(
  'Both components: Use flex-row with justify-between for desktop layout',
  adminRecipesContent.includes('justify-between') &&
  adminProductsContent.includes('justify-between'),
  'Should have justify-between to spread search (left) and controls (right)'
);

// Test 11: Help section right-aligned for AdminRecipes
test(
  'AdminRecipes: Help section (download link + hints) RIGHT-aligned with text-right',
  adminRecipesContent.includes('sm:justify-end') &&
  adminRecipesContent.match(/space-y-2\s+text-right/),
  'Help section should use text-right class for right alignment'
);

// Test 12: Help section right-aligned for AdminProducts
test(
  'AdminProducts: Help section (download link + hints) RIGHT-aligned with text-right',
  adminProductsContent.includes('sm:justify-end') &&
  adminProductsContent.match(/space-y-2\s+text-right/),
  'Help section should use text-right class for right alignment'
);

// Print summary
console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${testResults.passed}`);
console.log(`Failed: ${testResults.failed}`);
console.log(`Total:  ${testResults.tests.length}`);

if (testResults.failed > 0) {
  console.log('\nFailed tests:');
  testResults.tests.filter(t => !t.passed).forEach(t => {
    console.log(`  • ${t.name}`);
    if (t.details) console.log(`    ${t.details}`);
  });
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
