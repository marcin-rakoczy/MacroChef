(function () {
  const { assert, equal, test, run } = window.MacroChefTests;
  const { permissions, TRANSLATIONS, components } = window.MacroChef;
  let language = 'en';
  window.MacroChef.useI18n = () => ({
    lang: language, t: TRANSLATIONS[language],
    darkMode: false, setDarkMode() {}, colorTheme: 'emerald', setColorTheme() {}
  });
  const rootElement = document.getElementById('test-root');
  const recipe = {
    id: 'recipe-1', name: { en: 'Meal', pl: 'Posiłek' },
    category: { en: 'Lunch', pl: 'Obiad' }, prepTime: '10 min',
    calories: 300, servings: 1, protein: 10, carbs: 20, fats: 5
  };
  async function waitFor(check) {
    for (let i = 0; i < 100; i++) {
      if (check()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Timed out waiting for UI');
  }

  test('Permissions fail closed for unknown roles', () => {
    for (const role of ['Admin', 'Guest', 'Tester', 'UserWithAdvertisement', 'Unknown', null, undefined]) {
      equal(permissions.canManageRecipes(role), role === 'Admin' || role === 'Guest', `Manage recipes: ${role}`);
      equal(permissions.showAds(role), role === 'UserWithAdvertisement', `Show ads: ${role}`);
    }
  });

  test('Library only exposes recipe actions to Admin and Guest', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      for (const role of ['Admin', 'Guest', 'Tester', 'UserWithAdvertisement']) {
        const allowed = permissions.canManageRecipes(role);
        root.render(<components.RecipeLibrary recipes={[recipe]} canManageRecipes={allowed}
          onCreateRecipe={() => {}} onEditRecipe={() => {}} onDeleteRecipe={() => {}}
          onImportRecipes={() => {}} onStartBatchCooking={() => {}} />);
        await waitFor(() => rootElement.querySelector('h3'));
        await waitFor(() => Boolean(rootElement.querySelector('input[type="file"]')) === allowed);
        equal(Boolean(rootElement.querySelector('input[type="file"]')), allowed, `Import: ${role}`);
        equal(Boolean(rootElement.querySelector('[title="Edit Recipe"]')), allowed, `Edit: ${role}`);
        equal(Boolean(rootElement.querySelector('[title="Delete Recipe"]')), allowed, `Delete: ${role}`);
        equal(rootElement.textContent.includes(TRANSLATIONS.en.createRecipe), allowed, `Create: ${role}`);
        equal(rootElement.textContent.includes(TRANSLATIONS.en.recipesReadOnly), !allowed, `Read-only: ${role}`);
        assert(rootElement.textContent.includes(TRANSLATIONS.en.cookBatch), 'Batch cooking disappeared');
      }
      language = 'pl';
      root.render(<components.RecipeLibrary recipes={[recipe]} canManageRecipes={false}
        onStartBatchCooking={() => {}} />);
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.pl.recipesReadOnly));
    } finally {
      root.unmount();
      language = 'en';
    }
  });

  test('Admin and guest can create, edit, delete and import recipes', async () => {
    const root = ReactDOM.createRoot(rootElement);
    const originalConfirm = window.confirm;
    const originalAlert = window.alert;
    const originalParse = window.MacroChef.recipeCsv.parse;
    const actions = [];
    window.confirm = () => true;
    window.alert = () => {};
    window.MacroChef.recipeCsv.parse = () => [recipe];
    try {
      for (const role of ['Admin', 'Guest']) {
        root.render(<div data-role={role}>
          <components.RecipeLibrary recipes={[recipe]} canManageRecipes={permissions.canManageRecipes(role)}
            onCreateRecipe={() => actions.push(`${role}:create`)}
            onEditRecipe={(item) => actions.push(`${role}:edit:${item.id}`)}
            onDeleteRecipe={(id) => actions.push(`${role}:delete:${id}`)}
            onImportRecipes={async (items) => actions.push(`${role}:import:${items[0].id}`)}
            onStartBatchCooking={() => {}} />
        </div>);
        await waitFor(() => rootElement.querySelector(`[data-role="${role}"] input[type="file"]`));
        Array.from(rootElement.querySelectorAll('button'))
          .find((button) => button.textContent.includes(TRANSLATIONS.en.createRecipe)).click();
        rootElement.querySelector('[title="Edit Recipe"]').click();
        rootElement.querySelector('[title="Delete Recipe"]').click();
        const input = rootElement.querySelector('input[type="file"]');
        Object.defineProperty(input, 'files', {
          configurable: true, value: [{ text: async () => 'recipe' }]
        });
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await waitFor(() => actions.includes(`${role}:import:${recipe.id}`));
        for (const action of ['create', `edit:${recipe.id}`, `delete:${recipe.id}`]) {
          assert(actions.includes(`${role}:${action}`), `${role} could not ${action}`);
        }
      }
    } finally {
      root.unmount();
      window.confirm = originalConfirm;
      window.alert = originalAlert;
      window.MacroChef.recipeCsv.parse = originalParse;
    }
  });

  test('Ad slot follows role and network changes', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    const root = ReactDOM.createRoot(rootElement);
    try {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      root.render(<components.AdBanner role="UserWithAdvertisement" />);
      await waitFor(() => rootElement.querySelector('aside'));
      assert(rootElement.textContent.includes(TRANSLATIONS.en.adSlot), 'Online slot missing');
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.en.adOffline));
      for (const role of ['Admin', 'Tester', 'Guest', 'Unknown']) {
        root.render(<components.AdBanner role={role} />);
        await waitFor(() => !rootElement.querySelector('aside'));
        assert(!rootElement.querySelector('aside'), `Ad visible for ${role}`);
      }
      language = 'pl';
      root.render(<components.AdBanner role="UserWithAdvertisement" />);
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.pl.adOffline));
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      window.dispatchEvent(new Event('online'));
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.pl.adSlot));
    } finally {
      root.unmount();
      if (original) Object.defineProperty(navigator, 'onLine', original);
      else delete navigator.onLine;
      language = 'en';
    }
  });

  test('Role changes close recipe editing and reject an in-flight import', async () => {
    let imported = 0;
    let saved = 0;
    let resolveFile;
    let alerted = '';
    const originalAlert = window.alert;
    const originalParse = window.MacroChef.recipeCsv.parse;
    const shoppingKey = `rbac-test-${crypto.randomUUID()}`;
    window.alert = (message) => { alerted = message; };
    window.MacroChef.recipeCsv.parse = () => [recipe];
    window.rbacRecipes = [recipe];
    const repository = {
      async saveRecipes() { imported++; },
      async saveRecipe() { saved++; }
    };
    const root = ReactDOM.createRoot(rootElement);
    const renderRole = (role) => root.render(<window.MacroChef.App repositories={repository}
      shoppingStorageKey={shoppingKey} session={role === 'Guest' ? null : { role }} />);
    try {
      renderRole('Admin');
      await waitFor(() => rootElement.querySelector('[data-testid="planner-create"]'));
      rootElement.querySelector('[data-testid="planner-create"]').click();
      await waitFor(() => rootElement.querySelector('[data-testid="recipe-modal"]'));
      const staleSave = window.rbacSaveRecipe;
      await staleSave(recipe);
      equal(saved, 1, 'Admin could not save a recipe');
      await waitFor(() => !rootElement.querySelector('[data-testid="recipe-modal"]'));
      rootElement.querySelector('[data-testid="planner-create"]').click();
      await waitFor(() => rootElement.querySelector('[data-testid="recipe-modal"]'));
      renderRole('Tester');
      await waitFor(() => rootElement.querySelector('[data-testid="planner-readonly"]'));
      assert(!rootElement.querySelector('[data-testid="recipe-modal"]'), 'Recipe modal remained open');
      let denied = false;
      try {
        await staleSave(recipe);
      } catch (error) {
        denied = error.message === TRANSLATIONS.en.recipesReadOnly;
      }
      assert(denied && saved === 1, 'Stale save was not rejected');

      renderRole('Admin');
      await waitFor(() => rootElement.querySelector('[data-testid="planner-create"]'));
      Array.from(rootElement.querySelectorAll('button')).find((button) => button.textContent === 'Open library').click();
      await waitFor(() => rootElement.querySelector('input[type="file"]'));
      const input = rootElement.querySelector('input[type="file"]');
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [{ text: () => new Promise((resolve) => { resolveFile = resolve; }) }]
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await waitFor(() => typeof resolveFile === 'function');
      renderRole('Tester');
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.en.recipesReadOnly));
      resolveFile('test');
      await waitFor(() => alerted);
      equal(imported, 0, 'Import was saved after role downgrade');
      assert(alerted.includes(TRANSLATIONS.en.recipesReadOnly), 'Permission error was not shown');

      renderRole('UserWithAdvertisement');
      await waitFor(() => rootElement.querySelector('aside'));
      assert(rootElement.textContent.includes(TRANSLATIONS.en.recipesReadOnly), 'Read-only message missing');
      renderRole('Guest');
      await waitFor(() => !rootElement.querySelector('aside') && rootElement.querySelector('input[type="file"]'));
      Array.from(rootElement.querySelectorAll('button'))
        .find((button) => button.textContent.includes(TRANSLATIONS.en.createRecipe)).click();
      await waitFor(() => rootElement.querySelector('[data-testid="recipe-modal"]'));
      await window.rbacSaveRecipe(recipe);
      equal(saved, 2, 'Guest could not save a local recipe');
    } finally {
      root.unmount();
      localStorage.removeItem(shoppingKey);
      window.alert = originalAlert;
      window.MacroChef.recipeCsv.parse = originalParse;
      delete window.rbacRecipes;
      delete window.rbacSaveRecipe;
    }
  });

  run();
})();
