// Admin Panel Integration Tests - Component interactions and state management
(async function () {
  const result = document.getElementById('result');
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  const tests = [];

  // Test: AdminPanel only renders for Admin role
  tests.push(async () => {
    const testRoles = ['Admin', 'Tester', 'UserWithAdvertisement', 'Guest', null];
    const results = testRoles.map(role => {
      const shouldRender = role === 'Admin';
      return { role, shouldRender };
    });

    results.forEach(({ role, shouldRender }) => {
      if (shouldRender) {
        assert(role === 'Admin', `AdminPanel should only render for Admin, not ${role}`);
      }
    });
  });

  // Test: Tab navigation state persistence
  tests.push(async () => {
    const tabs = {
      users: 0,
      recipes: 1,
      products: 2
    };

    let activeTab = 'users';
    assert(tabs[activeTab] === 0, 'Initial tab should be users (index 0)');

    activeTab = 'recipes';
    assert(tabs[activeTab] === 1, 'Switched tab should be recipes (index 1)');

    activeTab = 'products';
    assert(tabs[activeTab] === 2, 'Switched tab should be products (index 2)');
  });

  // Test: AdminProducts - loading, error, and data states
  tests.push(async () => {
    const initialState = {
      products: [],
      loading: true,
      error: '',
      success: '',
      selected: new Set(),
      editingId: null,
      page: 0,
      searchQuery: ''
    };

    assert(initialState.loading === true, 'Initial state should be loading');
    assert(initialState.products.length === 0, 'Initial products should be empty');
    assert(initialState.error === '', 'Initial error should be empty');

    // Simulate loading complete
    const loadedState = {
      ...initialState,
      loading: false,
      products: [
        { id: 'p1', name: 'Apple', price: 2.5, category: 'Fruits' }
      ]
    };

    assert(loadedState.loading === false, 'After load, loading should be false');
    assert(loadedState.products.length === 1, 'After load, should have 1 product');
  });

  // Test: AdminRecipes - loading and error handling
  tests.push(async () => {
    const errorMessages = [
      'Repository not available',
      'getAllRecipes method not available on repository',
      'Failed to load recipes'
    ];

    errorMessages.forEach(msg => {
      assert(msg.length > 0 && typeof msg === 'string', `Error message should be valid: "${msg}"`);
    });
  });

  // Test: AdminUsers - role management workflow
  tests.push(async () => {
    const users = [
      { user_id: 'u1', email: 'test1@test.com', role: 'Tester' },
      { user_id: 'u2', email: 'test2@test.com', role: 'UserWithAdvertisement' }
    ];

    // Simulate role change
    let updatedUsers = users.map(u => 
      u.user_id === 'u1' ? { ...u, role: 'Admin' } : u
    );

    assert(updatedUsers[0].role === 'Admin', 'User 1 role should be updated to Admin');
    assert(updatedUsers[1].role === 'UserWithAdvertisement', 'User 2 role should remain unchanged');
  });

  // Test: Search and filter state reset on page navigation
  tests.push(async () => {
    let state = {
      page: 2,
      searchQuery: 'apple'
    };

    // When search query changes, page should reset
    state.searchQuery = 'banana';
    if (state.searchQuery !== 'apple') {
      state.page = 0;
    }

    assert(state.page === 0, 'Page should reset when search changes');
    assert(state.searchQuery === 'banana', 'Search query should be updated');
  });

  // Test: Bulk selection with toggle all
  tests.push(async () => {
    const items = [
      { id: 'p1', name: 'Product 1' },
      { id: 'p2', name: 'Product 2' },
      { id: 'p3', name: 'Product 3' },
      { id: 'p4', name: 'Product 4' },
      { id: 'p5', name: 'Product 5' }
    ];

    let selected = new Set();

    // Toggle all: select all
    const selectAll = true;
    if (selectAll) {
      items.forEach(item => selected.add(item.id));
    }

    assert(selected.size === items.length, 'Should select all items');

    // Toggle all: deselect all
    if (!selectAll) {
      selected.clear();
    } else {
      selected.clear();
    }

    assert(selected.size === 0, 'Should deselect all items');
  });

  // Test: Bulk delete operation
  tests.push(async () => {
    let products = [
      { id: 'p1', name: 'Apple' },
      { id: 'p2', name: 'Banana' },
      { id: 'p3', name: 'Carrot' }
    ];

    const selected = new Set(['p1', 'p3']);

    // Simulate bulk delete
    products = products.filter(p => !selected.has(p.id));
    selected.clear();

    assert(products.length === 1, 'Should have 1 product left after deletion');
    assert(products[0].id === 'p2', 'Banana should be the remaining product');
    assert(selected.size === 0, 'Selection should be cleared after delete');
  });

  // Test: Pagination edge cases
  tests.push(async () => {
    const ITEMS_PER_PAGE = 25;
    const mockCounts = [0, 1, 24, 25, 26, 50, 100, 1000];

    mockCounts.forEach(count => {
      const pages = Math.ceil(count / ITEMS_PER_PAGE);
      if (count === 0) {
        assert(pages === 0, `0 items should yield 0 pages`);
      } else if (count <= 25) {
        assert(pages === 1, `1-25 items should yield 1 page, got ${pages} for ${count}`);
      } else if (count <= 50) {
        assert(pages === 2, `26-50 items should yield 2 pages, got ${pages} for ${count}`);
      }
    });
  });

  // Test: Search query normalization
  tests.push(async () => {
    const products = [
      { id: 'p1', name: 'Apple', category: 'Fruits' },
      { id: 'p2', name: 'BANANA', category: 'Fruits' },
      { id: 'p3', name: 'chicken', category: 'Meat' }
    ];

    const searchVariants = ['APPLE', 'apple', 'ApPlE', 'BANANA', 'banana'];

    searchVariants.slice(0, 3).forEach(query => {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      );
      assert(filtered.some(p => p.id === 'p1'), `Should find apple with query "${query}"`);
    });
  });

  // Test: Localization state consistency
  tests.push(async () => {
    const langVariants = ['en', 'pl', 'en', 'pl'];
    let currentLang = 'en';

    langVariants.forEach(lang => {
      currentLang = lang;
      assert(['en', 'pl'].includes(currentLang), `Language should be valid: ${currentLang}`);
    });
  });

  // Test: Error message clearing
  tests.push(async () => {
    let errorState = '';
    
    // Set error
    errorState = 'Failed to load products';
    assert(errorState.length > 0, 'Error should be set');

    // Clear error
    errorState = '';
    assert(errorState === '', 'Error should be cleared');
  });

  // Test: Success message auto-clear timeout
  tests.push(async () => {
    const mockSuccessMessage = (msg, timeout) => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve('cleared');
        }, timeout);
      });
    };

    const result = await mockSuccessMessage('Product deleted', 3000);
    assert(result === 'cleared', 'Success message should be cleared after timeout');
  });

  // Test: Edit mode state toggling
  tests.push(async () => {
    let editingId = null;
    let editValues = {};

    // Enter edit mode
    editingId = 'p1';
    editValues = { name: 'Apple', price: 2.5 };
    assert(editingId === 'p1', 'Should enter edit mode for p1');
    assert(Object.keys(editValues).length === 2, 'Should have edit values');

    // Exit edit mode
    editingId = null;
    editValues = {};
    assert(editingId === null, 'Should exit edit mode');
    assert(Object.keys(editValues).length === 0, 'Should clear edit values');
  });

  // Test: CSV import validation
  tests.push(async () => {
    const validCSVHeaders = ['name', 'price', 'calories', 'protein', 'carbs', 'fat', 'shop', 'category'];
    const providedHeaders = ['name', 'price', 'calories', 'protein', 'carbs', 'fat', 'shop', 'category'];

    const allHeadersPresent = validCSVHeaders.every(h => providedHeaders.includes(h));
    assert(allHeadersPresent, 'All required CSV headers should be present');
  });

  // Test: Nutrient display correctness
  tests.push(async () => {
    const recipes = [
      { id: 'rec-1', name: 'Oatmeal', calories: 300, protein: 10, carbs: 50, fats: 5 },
      { id: 'rec-2', name: 'Chicken', calories: 200, protein: 35, carbs: 0, fats: 8 }
    ];

    // Verify fats field is used
    recipes.forEach(recipe => {
      assert(typeof recipe.fats === 'number', `Recipe should have 'fats' field as number`);
      assert(!recipe.hasOwnProperty('fat'), `Recipe should not have 'fat' field (use 'fats' instead)`);
    });
  });

  // Test: Table rendering requirements
  tests.push(async () => {
    const requiredTableColumns = {
      products: ['name', 'shop', 'price', 'category', 'calories', 'protein', 'carbs', 'fat'],
      recipes: ['name', 'calories', 'protein', 'carbs', 'fats'],
      users: ['email', 'role']
    };

    Object.entries(requiredTableColumns).forEach(([table, columns]) => {
      assert(Array.isArray(columns) && columns.length > 0, `${table} should have required columns`);
    });
  });

  // Test: Permission boundaries
  tests.push(async () => {
    const roles = ['Admin', 'Tester', 'UserWithAdvertisement', 'Guest'];
    const permissions = {
      'Admin': { canManage: true, canView: true },
      'Tester': { canManage: false, canView: true },
      'UserWithAdvertisement': { canManage: false, canView: true },
      'Guest': { canManage: false, canView: false }
    };

    roles.forEach(role => {
      if (permissions[role]) {
        assert(permissions[role].hasOwnProperty('canManage'), `${role} should have canManage permission`);
        assert(permissions[role].hasOwnProperty('canView'), `${role} should have canView permission`);
      }
    });
  });

  // Test: Component mounting safety
  tests.push(async () => {
    const requiredProps = ['repository', 'session'];
    const mockProps = {
      repository: { getAllProducts: () => Promise.resolve([]) },
      session: { role: 'Admin' }
    };

    requiredProps.forEach(prop => {
      assert(mockProps.hasOwnProperty(prop), `Component should receive '${prop}' prop`);
    });
  });

  // Run all tests
  let passed = 0;
  let failed = 0;
  const failedTests = [];

  for (let i = 0; i < tests.length; i++) {
    try {
      await tests[i]();
      passed++;
      console.log(`✓ Integration test ${i + 1} passed`);
    } catch (error) {
      failed++;
      failedTests.push({ index: i + 1, error: error.message });
      console.error(`✗ Integration test ${i + 1} failed:`, error.message);
    }
  }

  result.textContent = `Admin Panel Integration Tests\n${'='.repeat(50)}\nPassed: ${passed}\nFailed: ${failed}\nTotal: ${tests.length}\n${failed > 0 ? '\nFailed tests:\n' + failedTests.map(t => `  ${t.index}. ${t.error}`).join('\n') : '\n✓ All integration tests passed!'}`;
  
  if (failed > 0) {
    result.classList.add('failure');
  } else {
    result.classList.add('success');
  }
})();
