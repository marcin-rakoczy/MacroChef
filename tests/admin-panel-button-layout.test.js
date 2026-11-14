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

// Test 1: AdminRecipes - Import button before search
test(
  'AdminRecipes: Import button positioned BEFORE search input',
  adminRecipesContent.includes('{/* Import CSV Button - Left Side */}') &&
  adminRecipesContent.indexOf('{/* Import CSV Button - Left Side */}') < adminRecipesContent.indexOf('{/* Search Box */}'),
  'Import button should appear first in JSX order'
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

// Test 5: AdminProducts - Import button before search
test(
  'AdminProducts: Import button positioned BEFORE search input',
  adminProductsContent.includes('{/* Import CSV Button - Left Side */}') &&
  adminProductsContent.indexOf('{/* Import CSV Button - Left Side */}') < adminProductsContent.indexOf('{/* Search Box */}'),
  'Import button should appear first in JSX order'
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

// Test 9: Consistency check - both components use same classes
test(
  'Both components: Consistent button styling',
  adminRecipesContent.includes('flex items-center justify-center gap-2') &&
  adminProductsContent.includes('flex items-center justify-center gap-2'),
  'Both should have identical flex container classes'
);

// Test 10: Responsive layout
test(
  'Both components: Use responsive layout (flex-col sm:flex-row)',
  adminRecipesContent.includes('flex flex-col sm:flex-row') &&
  adminProductsContent.includes('flex flex-col sm:flex-row'),
  'Should have Tailwind responsive classes for mobile/desktop'
);

// Test 11: No old icon symbol
test(
  'AdminRecipes: Old up-arrow icon (↑) removed',
  !adminRecipesContent.includes('<span>↑</span>'),
  'Old icon symbol should be replaced with SVG'
);

// Test 12: AdminProducts - No old icon symbol
test(
  'AdminProducts: Old up-arrow icon (↑) removed',
  !adminProductsContent.includes('<span>↑</span>'),
  'Old icon symbol should be replaced with SVG'
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
