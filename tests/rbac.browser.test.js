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

  test('Header displays the localized sync status and conflict detail', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.Header syncStatus={{ state: 'conflict', message: 'Plan conflict' }} />);
      await waitFor(() => rootElement.querySelector('[role="status"]'));
      equal(rootElement.querySelector('[role="status"]').textContent, TRANSLATIONS.en.sync_conflict, 'Sync status');
      assert(rootElement.querySelector('[role="status"]').getAttribute('aria-label').includes('Plan conflict'),
        'Conflict detail is not accessible');
      language = 'pl';
      root.render(<components.Header syncStatus={{ state: 'synced' }} />);
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.pl.sync_synced));
    } finally {
      root.unmount();
      language = 'en';
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
        await waitFor(() => rootElement.querySelector('h2') &&
          Boolean(rootElement.querySelector('[title="Edit Recipe"]')) === allowed);
        assert(!rootElement.querySelector('input[type="file"]'), 'Library should not expose CSV import');
        equal(Boolean(rootElement.querySelector('[title="Edit Recipe"]')), allowed, `Edit: ${role}`);
        equal(Boolean(rootElement.querySelector('[title="Delete Recipe"]')), allowed, `Delete: ${role}`);
        equal(rootElement.textContent.includes(TRANSLATIONS.en.createRecipe), allowed, `Create: ${role}`);
        assert(rootElement.textContent.includes(TRANSLATIONS.en.cookBatch), 'Batch cooking disappeared');
      }
      language = 'pl';
      root.render(<components.RecipeLibrary recipes={[recipe]} canManageRecipes={false}
        onStartBatchCooking={() => {}} />);
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.pl.recipeSub));
    } finally {
      root.unmount();
      language = 'en';
    }
  });

  test('Admin and guest can create, edit and delete recipes', async () => {
    const root = ReactDOM.createRoot(rootElement);
    const originalConfirm = window.confirm;
    const originalAlert = window.alert;
    const actions = [];
    window.confirm = () => true;
    window.alert = () => {};
    try {
      for (const role of ['Admin', 'Guest']) {
        root.render(<div data-role={role}>
          <components.RecipeLibrary recipes={[recipe]} canManageRecipes={permissions.canManageRecipes(role)}
            onCreateRecipe={() => actions.push(`${role}:create`)}
            onEditRecipe={(item) => actions.push(`${role}:edit:${item.id}`)}
            onDeleteRecipe={(id) => actions.push(`${role}:delete:${id}`)}
            onStartBatchCooking={() => {}} />
        </div>);
        await waitFor(() => rootElement.querySelector(`[data-role="${role}"] [title="Edit Recipe"]`));
        Array.from(rootElement.querySelectorAll('button'))
          .find((button) => button.textContent.includes(TRANSLATIONS.en.createRecipe)).click();
        rootElement.querySelector('[title="Edit Recipe"]').click();
        rootElement.querySelector('[title="Delete Recipe"]').click();
        for (const action of ['create', `edit:${recipe.id}`, `delete:${recipe.id}`]) {
          assert(actions.includes(`${role}:${action}`), `${role} could not ${action}`);
        }
      }
    } finally {
      root.unmount();
      window.confirm = originalConfirm;
      window.alert = originalAlert;
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

  test('Role changes close recipe editing and reject stale saves', async () => {
    let saved = 0;
    const shoppingKey = `rbac-test-${crypto.randomUUID()}`;
    window.rbacRecipes = [recipe];
    const repository = {
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
      await waitFor(() => rootElement.querySelector('[title="Edit Recipe"]'));
      renderRole('Tester');
      await waitFor(() => !rootElement.querySelector('[title="Edit Recipe"]'));

      renderRole('UserWithAdvertisement');
      await waitFor(() => rootElement.querySelector('aside'));
      assert(!rootElement.querySelector('[title="Edit Recipe"]'), 'Advertised user can edit');
      renderRole('Guest');
      await waitFor(() => !rootElement.querySelector('aside') &&
        rootElement.textContent.includes(TRANSLATIONS.en.createRecipe));
      Array.from(rootElement.querySelectorAll('button'))
        .find((button) => button.textContent.includes(TRANSLATIONS.en.createRecipe)).click();
      await waitFor(() => rootElement.querySelector('[data-testid="recipe-modal"]'));
      await window.rbacSaveRecipe(recipe);
      equal(saved, 2, 'Guest could not save a local recipe');
    } finally {
      root.unmount();
      localStorage.removeItem(shoppingKey);
      delete window.rbacRecipes;
      delete window.rbacSaveRecipe;
    }
  });

  run();
})();
