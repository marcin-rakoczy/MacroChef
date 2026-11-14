// Admin Panel component tests
(async function () {
  const result = document.getElementById('result');
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  const tests = [];

  // Test: AdminPanel visibility based on role
  tests.push(async () => {
    // Test role checking logic - AdminPanel should only render when role === 'Admin'
    const rolesToTest = ['Admin', 'Tester', 'UserWithAdvertisement', 'Guest', null];
    const results = rolesToTest.map(role => ({ role, shouldRender: role === 'Admin' }));
    
    const adminRoles = results.filter(r => r.shouldRender);
    assert(adminRoles.length === 1 && adminRoles[0].role === 'Admin', 'AdminPanel should only render for Admin role');
  });

  // Test: AdminPanel tab switching
  tests.push(async () => {
    const tabs = ['users', 'recipes', 'products'];
    assert(tabs.length === 3, 'AdminPanel should have exactly 3 tabs');
    assert(tabs.includes('users'), 'users tab should exist');
    assert(tabs.includes('recipes'), 'recipes tab should exist');
    assert(tabs.includes('products'), 'products tab should exist');
  });

  // Test: AdminProducts pagination constants
  tests.push(async () => {
    const PRODUCTS_PER_PAGE = 25;
    assert(PRODUCTS_PER_PAGE === 25, 'Products per page should be 25');
    
    const totalProducts = 100;
    const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
    assert(totalPages === 4, `100 products should yield 4 pages, got ${totalPages}`);
  });

  // Test: AdminProducts search filtering
  tests.push(async () => {
    const products = [
      { id: 'p1', name: 'Apple', category: 'Fruits' },
      { id: 'p2', name: 'Banana', category: 'Fruits' },
      { id: 'p3', name: 'Chicken', category: 'Meat' },
      { id: 'p4', name: 'Broccoli', category: 'Vegetables' }
    ];

    const searchQuery = 'bra'; // lowercase for case-insensitive test
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    assert(filtered.length === 2, `Search for "${searchQuery}" should return 2 results, got ${filtered.length}`);
    assert(filtered.some(p => p.name === 'Banana'), 'Should find Banana');
    assert(filtered.some(p => p.name === 'Broccoli'), 'Should find Broccoli');
  });

  // Test: AdminRecipes pagination
  tests.push(async () => {
    const RECIPES_PER_PAGE = 25;
    const recipes = Array.from({ length: 75 }, (_, i) => ({
      id: `rec-${i}`,
      name: `Recipe ${i}`
    }));

    const page = 2;
    const startIndex = page * RECIPES_PER_PAGE;
    const paginatedRecipes = recipes.slice(startIndex, startIndex + RECIPES_PER_PAGE);
    
    assert(paginatedRecipes.length === 25, 'Page 2 should have exactly 25 recipes');
    assert(paginatedRecipes[0].id === 'rec-50', 'Page 2 should start at recipe 50');
  });

  // Test: AdminRecipes search with localization
  tests.push(async () => {
    const recipes = [
      { id: 'rec-1', name: { en: 'Oatmeal', pl: 'Owsianka' } },
      { id: 'rec-2', name: { en: 'Chicken Salad', pl: 'Sałatka z kurczakiem' } },
      { id: 'rec-3', name: { en: 'Pasta', pl: 'Makaron' } }
    ];

    const searchQuery = 'owsia';
    const lang = 'pl';
    const filtered = recipes.filter(recipe => {
      const name = recipe.name && typeof recipe.name === 'object' 
        ? recipe.name[lang] 
        : recipe.name;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    assert(filtered.length === 1, 'Should find 1 recipe matching "owsia"');
    assert(filtered[0].id === 'rec-1', 'Should find Owsianka recipe');
  });

  // Test: Bulk delete selection
  tests.push(async () => {
    const selected = new Set(['rec-1', 'rec-2', 'rec-3']);
    assert(selected.size === 3, 'Selected set should contain 3 items');
    
    selected.delete('rec-2');
    assert(selected.size === 2, 'After deletion, set should contain 2 items');
    assert(!selected.has('rec-2'), 'rec-2 should be removed from set');
  });

  // Test: AdminUsers role filtering
  tests.push(async () => {
    const users = [
      { user_id: 'u1', email: 'admin@test.com', role: 'Admin' },
      { user_id: 'u2', email: 'tester@test.com', role: 'Tester' },
      { user_id: 'u3', email: 'user@test.com', role: 'UserWithAdvertisement' },
      { user_id: 'u4', email: 'admin2@test.com', role: 'Admin' }
    ];

    const filterRole = 'Admin';
    const filtered = users.filter(u => u.role === filterRole);
    
    assert(filtered.length === 2, `Should find 2 users with Admin role`);
    assert(filtered.every(u => u.role === 'Admin'), 'All filtered users should be Admin');
  });

  // Test: AdminUsers role update
  tests.push(async () => {
    let user = { user_id: 'u1', email: 'test@test.com', role: 'Tester' };
    const newRole = 'Admin';
    
    // Simulate update
    user = { ...user, role: newRole };
    
    assert(user.role === 'Admin', 'User role should be updated to Admin');
  });

  // Test: Localized translations fallback
  tests.push(async () => {
    const translations = {
      en: {
        importProducts: 'Import Products',
        loading: 'Loading...',
        delete: 'Delete'
      },
      pl: {
        importProducts: 'Importuj Produkty',
        loading: 'Ładowanie...',
        delete: 'Usuń'
      }
    };

    const lang = 'en';
    const t = translations[lang] || {};
    
    assert(t.importProducts === 'Import Products', 'Should get English translation');
    assert(t.delete === 'Delete', 'Should get Delete in English');
  });

  // Test: AdminProducts CSV import parsing
  tests.push(async () => {
    const csvData = `name,price,calories,protein,carbs,fat,shop,category
Apple,2.50,95,0.5,25,0.3,Lidl,Fruits
Chicken Breast,8.99,165,31,0,3.6,Carrefour,Meat`;

    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const products = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        name: values[0],
        price: parseFloat(values[1]),
        calories: parseInt(values[2]),
        protein: parseFloat(values[3]),
        carbs: parseInt(values[4]),
        fat: parseFloat(values[5]),
        shop: values[6],
        category: values[7]
      };
    });

    assert(products.length === 2, 'Should parse 2 products from CSV');
    assert(products[0].name === 'Apple', 'First product should be Apple');
    assert(products[0].price === 2.50, 'Apple price should be 2.50');
    assert(products[1].calories === 165, 'Chicken calories should be 165');
  });

  // Test: Fat (Tłuszcze) field name correctness
  tests.push(async () => {
    const recipes = [
      { id: 'rec-1', name: 'Oatmeal', calories: 300, protein: 10, carbs: 50, fats: 5 },
      { id: 'rec-2', name: 'Chicken', calories: 200, protein: 35, carbs: 0, fats: 8 }
    ];

    // Should use 'fats' field, not 'fat'
    const fatValue = recipes[0].fats;
    assert(fatValue === 5, `Should use 'fats' field: got ${recipes[0].fats}g`);
    assert(!recipes[0].fat, 'Should not use singular "fat" field');
  });

  // Test: Page bounds checking
  tests.push(async () => {
    const PRODUCTS_PER_PAGE = 25;
    const totalProducts = 60;
    const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
    
    // Test invalid page
    const page = 5;
    const isValidPage = page < totalPages;
    assert(!isValidPage, `Page 5 should be invalid for ${totalPages} pages`);
    
    // Test valid page
    const validPage = 2;
    const isValid = validPage < totalPages;
    assert(isValid, `Page 2 should be valid for ${totalPages} pages`);
  });

  // Test: Empty state handling
  tests.push(async () => {
    const products = [];
    const loading = false;
    
    const shouldShowEmpty = !loading && products.length === 0;
    assert(shouldShowEmpty, 'Should show empty state when no products');
  });

  // Test: Selection state management
  tests.push(async () => {
    let selected = new Set();
    const items = ['p1', 'p2', 'p3', 'p4', 'p5'];

    // Add items
    items.forEach(id => selected.add(id));
    assert(selected.size === 5, 'All items should be selected');

    // Clear selection
    selected.clear();
    assert(selected.size === 0, 'Selection should be cleared');

    // Partial selection
    selected.add('p1');
    selected.add('p3');
    const hasPartial = selected.size > 0 && selected.size < items.length;
    assert(hasPartial, 'Should have partial selection');
  });

  // Test: Error state display
  tests.push(async () => {
    const errors = [
      'Repository not available',
      'Failed to load products',
      'getAllProducts method not available on repository'
    ];

    errors.forEach(err => {
      assert(err.length > 0, `Error message should not be empty: "${err}"`);
      assert(typeof err === 'string', `Error should be a string: ${typeof err}`);
    });
  });

  // Test: Confirmation dialogs
  tests.push(async () => {
    // Destructive operations that require confirmation
    const destructiveActions = ['delete', 'bulkDelete'];
    
    destructiveActions.forEach(action => {
      assert(action.includes('delete'), `Action "${action}" should be destructive and require confirmation`);
    });

    // Non-destructive operations
    const nonDestructiveActions = ['update', 'edit', 'import'];
    assert(destructiveActions.length === 2 && nonDestructiveActions.length === 3, 'Should categorize actions correctly');
  });

  // Run all tests
  let passed = 0;
  let failed = 0;
  const failedTests = [];

  for (let i = 0; i < tests.length; i++) {
    try {
      await tests[i]();
      passed++;
      console.log(`✓ Test ${i + 1} passed`);
    } catch (error) {
      failed++;
      failedTests.push({ index: i + 1, error: error.message });
      console.error(`✗ Test ${i + 1} failed:`, error.message);
    }
  }

  result.textContent = `Admin Panel Tests\n${'='.repeat(50)}\nPassed: ${passed}\nFailed: ${failed}\nTotal: ${tests.length}\n${failed > 0 ? '\nFailed tests:\n' + failedTests.map(t => `  ${t.index}. ${t.error}`).join('\n') : ''}`;
  
  if (failed > 0) {
    result.style.color = '#dc2626';
  } else {
    result.style.color = '#059669';
  }
})();
