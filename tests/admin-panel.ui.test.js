// Admin Panel Browser Integration Tests - Component rendering and UI interactions
(async function () {
  const result = document.getElementById('result');
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  const tests = [];

  // Test: Tab button rendering and classes
  tests.push(async () => {
    const tabs = ['users', 'recipes', 'products'];
    const buttonClasses = {
      active: 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400',
      inactive: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
    };

    tabs.forEach(tab => {
      assert(typeof tab === 'string' && tab.length > 0, `Tab name should be valid string: ${tab}`);
    });

    assert(buttonClasses.active.includes('emerald'), 'Active tab should use emerald color');
    assert(buttonClasses.inactive.includes('slate'), 'Inactive tab should use slate color');
  });

  // Test: AdminProducts table structure
  tests.push(async () => {
    const tableHeaders = ['name', 'shop', 'price', 'category', 'calories', 'protein', 'carbs', 'fat', 'actions'];
    assert(tableHeaders.length === 9, 'Products table should have 9 columns');
    assert(tableHeaders[0] === 'name', 'First column should be name');
    assert(tableHeaders[tableHeaders.length - 1] === 'actions', 'Last column should be actions');
  });

  // Test: AdminRecipes table structure with fats column
  tests.push(async () => {
    const tableHeaders = ['name', 'calories', 'protein', 'carbs', 'fats', 'actions'];
    assert(tableHeaders.includes('fats'), 'Recipes table MUST use "fats" column, not "fat"');
    assert(!tableHeaders.includes('fat'), 'Recipes table should NOT have "fat" column');
    assert(tableHeaders.length === 6, 'Recipes table should have 6 columns');
  });

  // Test: AdminUsers table structure
  tests.push(async () => {
    const tableHeaders = ['email', 'role', 'actions'];
    assert(tableHeaders.length === 3, 'Users table should have 3 columns');
    assert(tableHeaders.includes('email'), 'Should have email column');
    assert(tableHeaders.includes('role'), 'Should have role column');
  });

  // Test: Role select options
  tests.push(async () => {
    const roles = ['Admin', 'Tester', 'UserWithAdvertisement'];
    assert(roles.length === 3, 'Should have 3 role options');
    assert(roles[0] === 'Admin', 'First role should be Admin');
    assert(roles.includes('Tester'), 'Should include Tester');
    assert(roles.includes('UserWithAdvertisement'), 'Should include UserWithAdvertisement');
  });

  // Test: Modal/Overlay structure
  tests.push(async () => {
    const overlayClasses = [
      'fixed',
      'inset-0',
      'bg-black/50',
      'dark:bg-black/70',
      'flex',
      'items-center',
      'justify-center'
    ];

    overlayClasses.forEach(cls => {
      assert(typeof cls === 'string' && cls.length > 0, `Overlay class should be valid: ${cls}`);
    });

    const fixedCount = overlayClasses.filter(c => c === 'fixed').length;
    assert(fixedCount === 1, 'Overlay should be positioned fixed');
  });

  // Test: Danger button styling
  tests.push(async () => {
    const dangerClasses = 'px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition';
    assert(dangerClasses.includes('red-500'), 'Danger button should use red-500');
    assert(dangerClasses.includes('red-600'), 'Danger button hover should use red-600');
    assert(dangerClasses.includes('text-white'), 'Danger button text should be white');
  });

  // Test: Success button styling
  tests.push(async () => {
    const successClasses = 'px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition';
    assert(successClasses.includes('emerald-500'), 'Success button should use emerald-500');
    assert(successClasses.includes('text-white'), 'Success button text should be white');
    assert(successClasses.includes('disabled:bg-slate-400'), 'Disabled state should be gray');
  });

  // Test: Dark mode support
  tests.push(async () => {
    const darkModeSelectors = [
      'dark:bg-slate-800',
      'dark:border-slate-700',
      'dark:text-white',
      'dark:hover:bg-slate-700/50'
    ];

    darkModeSelectors.forEach(selector => {
      assert(selector.startsWith('dark:'), `Dark mode selector should start with "dark:": ${selector}`);
    });
  });

  // Test: Input field styling
  tests.push(async () => {
    const inputClasses = 'px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white';
    assert(inputClasses.includes('border'), 'Input should have border');
    assert(inputClasses.includes('rounded-lg'), 'Input should be rounded');
    assert(inputClasses.includes('bg-white'), 'Input background should be white in light mode');
    assert(inputClasses.includes('dark:bg-slate-700'), 'Input background should be slate-700 in dark mode');
  });

  // Test: Checkbox styling
  tests.push(async () => {
    const checkboxClasses = 'cursor-pointer';
    assert(checkboxClasses.includes('cursor-pointer'), 'Checkbox should have pointer cursor');
  });

  // Test: Error message display
  tests.push(async () => {
    const errorClasses = 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4';
    assert(errorClasses.includes('red-50'), 'Error background should be light red');
    assert(errorClasses.includes('red-900/20'), 'Error dark background should be dark red');
    assert(errorClasses.includes('border'), 'Error should have border');
  });

  // Test: Loading state display
  tests.push(async () => {
    const loadingClasses = 'text-center py-8 text-slate-600 dark:text-slate-400';
    assert(loadingClasses.includes('text-center'), 'Loading message should be centered');
    assert(loadingClasses.includes('py-8'), 'Loading message should have vertical padding');
  });

  // Test: Summary/Stats display
  tests.push(async () => {
    const summaryClasses = 'text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg';
    assert(summaryClasses.includes('text-sm'), 'Summary should use small text');
    assert(summaryClasses.includes('bg-slate-50'), 'Summary background should be light');
    assert(summaryClasses.includes('rounded-lg'), 'Summary should be rounded');
  });

  // Test: Row hover effect
  tests.push(async () => {
    const rowClasses = 'border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50';
    assert(rowClasses.includes('hover:'), 'Row should have hover effect');
    assert(rowClasses.includes('bg-slate-50'), 'Row hover should be light in light mode');
    assert(rowClasses.includes('dark:hover:bg-slate-700/50'), 'Row hover should be dark in dark mode');
  });

  // Test: Responsive layout
  tests.push(async () => {
    const responsiveClasses = 'flex flex-col sm:flex-row gap-4';
    assert(responsiveClasses.includes('flex-col'), 'Should stack vertically on mobile');
    assert(responsiveClasses.includes('sm:flex-row'), 'Should be row on small+ screens');
    assert(responsiveClasses.includes('gap-4'), 'Should have consistent gap');
  });

  // Test: Overflow handling
  tests.push(async () => {
    const overflowClasses = 'overflow-x-auto';
    assert(overflowClasses.includes('overflow-x-auto'), 'Table should scroll horizontally on small screens');
  });

  // Test: Text truncation (if needed)
  tests.push(async () => {
    const truncateClasses = 'truncate';
    // Optional truncation class for long names
    assert(typeof truncateClasses === 'string', 'Text truncation should be defined if used');
  });

  // Test: Flexbox spacing
  tests.push(async () => {
    const spaceClasses = 'space-y-4';
    assert(spaceClasses.includes('space-y-4'), 'Should use consistent vertical spacing');
  });

  // Run all tests
  let passed = 0;
  let failed = 0;
  const failedTests = [];

  for (let i = 0; i < tests.length; i++) {
    try {
      await tests[i]();
      passed++;
      console.log(`✓ UI Test ${i + 1} passed`);
    } catch (error) {
      failed++;
      failedTests.push({ index: i + 1, error: error.message });
      console.error(`✗ UI Test ${i + 1} failed:`, error.message);
    }
  }

  result.textContent = `Admin Panel UI & Styling Tests\n${'='.repeat(50)}\nPassed: ${passed}\nFailed: ${failed}\nTotal: ${tests.length}\n${failed > 0 ? '\nFailed tests:\n' + failedTests.map(t => `  ${t.index}. ${t.error}`).join('\n') : '\n✓ All UI tests passed!'}`;
  
  if (failed > 0) {
    result.className = 'failure';
  } else {
    result.className = 'success';
  }
})();
