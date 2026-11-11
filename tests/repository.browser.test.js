(function () {
  const { assert, equal, test, run } = window.MacroChefTests;

  async function withRepository(runCase) {
    const name = `MacroChef-repository-test-${crypto.randomUUID()}`;
    const repository = new window.MacroChef.DexieCalorieRepository(name, { seedDefaults: false });
    try {
      await repository.initialize();
      await runCase(repository);
    } finally {
      repository.db.close();
      await Dexie.delete(name);
    }
  }

  test('Create and read recipes with unique string IDs', () => withRepository(async (repository) => {
    const first = await repository.saveRecipe({ name: 'First meal' });
    const second = await repository.saveRecipe({ name: 'Second meal' });
    const recipes = await repository.getAllRecipes();
    assert(typeof first.id === 'string' && first.id.length > 0, 'First ID is not a nonempty string');
    assert(typeof second.id === 'string' && first.id !== second.id, 'IDs are not unique strings');
    equal(recipes.length, 2, 'Saved recipe count');
    assert(recipes.some((recipe) => recipe.id === first.id && recipe.name === 'First meal'),
      'Saved recipe not returned');
  }));

  test('Goals persist across reopening and overwrite the existing record', () => withRepository(async (repository) => {
    const original = {
      userGoal: 'healthyHabits', age: '42', weight: '83.5', height: '180',
      sex: 'male', activityPal: '1.45', calories: 2400, protein: 160, carbs: 250, fats: 80
    };
    const first = await repository.saveGoals(original);
    const updated = { ...original, age: '43', weight: '82', calories: 2300, protein: 150 };
    const second = await repository.saveGoals(updated);
    equal(second.id, first.id, 'Goals record ID changed');
    repository.db.close();
    const reopened = new window.MacroChef.DexieCalorieRepository(repository.db.name, { seedDefaults: false });
    try {
      await reopened.initialize();
      const rows = await reopened.db.goals.toArray();
      equal(rows.length, 1, 'Goals record count');
      Object.keys(updated).forEach((key) => equal(rows[0][key], updated[key], `Restored ${key}`));
    } finally {
      reopened.db.close();
    }
  }));

  test('Offline goal edits are stored and journaled', () => withRepository(async (repository) => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      const first = await repository.saveGoals({ age: '42', calories: 2400 });
      await repository.saveGoals({ ...first, age: '43', calories: 2300 });
      const stored = await repository.db.goals.toArray();
      const queue = await repository.db.OutboxQueue.toArray();
      equal(stored.length, 1, 'Offline goals record count');
      equal(stored[0].age, '43', 'Offline age');
      equal(stored[0].calories, 2300, 'Offline calories');
      assert(queue.some((entry) => entry.table === 'goals' && entry.action === 'create'),
        'Missing offline goals creation');
      assert(queue.some((entry) => entry.table === 'goals' && entry.action === 'update' &&
        entry.payload.value.calories === 2300), 'Missing offline goals update');
    } finally {
      delete navigator.onLine;
    }
  }));

  test('Settings migrate once, persist after reopening and remain user-scoped', () => withRepository(async (repository) => {
    const defaults = { lang: 'en', colorTheme: 'violet', darkMode: true };
    const [first, concurrent] = await Promise.all([
      repository.initializeSettings(defaults),
      repository.initializeSettings({ lang: 'pl', colorTheme: 'emerald', darkMode: false })
    ]);
    equal(first.id, concurrent.id, 'Concurrent initialization created duplicate settings');
    const changed = { lang: 'pl', colorTheme: 'mono', darkMode: false };
    await repository.saveSettings(changed);
    await repository.initializeSettings(defaults);
    const other = new window.MacroChef.DexieCalorieRepository(repository.db.name, {
      seedDefaults: false, userId: 'other-user'
    });
    try {
      await other.initializeSettings(defaults);
      repository.db.close();
      await repository.db.open();
      const restored = await repository.initializeSettings(defaults);
      Object.keys(changed).forEach((key) => equal(restored[key], changed[key], `Restored ${key}`));
      equal((await other.db.settings.where('userId').equals('other-user').first()).lang, 'en',
        'Other user settings changed');
      equal(await other.db.settings.count(), 2, 'Settings record count');
    } finally {
      other.db.close();
    }
  }));

  test('Offline settings changes are journaled', () => withRepository(async (repository) => {
    await repository.initializeSettings({ lang: 'pl', colorTheme: 'emerald', darkMode: false });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      await repository.saveSettings({ lang: 'en', colorTheme: 'violet', darkMode: true });
      const entry = (await repository.db.OutboxQueue.toArray())[0];
      assert(entry && entry.table === 'settings' && entry.action === 'update' &&
        entry.payload.value.lang === 'en', 'Settings update was not journaled');
    } finally {
      delete navigator.onLine;
    }
  }));

  test('Delete recipe and clear only its planner references', () => withRepository(async (repository) => {
    const deleted = await repository.saveRecipe({ name: 'Delete' });
    const kept = await repository.saveRecipe({ name: 'Keep' });
    await repository.savePlannerSlot('Monday', {}, 'Breakfast', deleted.id);
    await repository.savePlannerSlot('Monday', {}, 'Lunch', kept.id);
    await repository.deleteRecipe(deleted.id);
    const recipes = await repository.getAllRecipes();
    const day = await repository.db.plannerEntries.where('dayKey').equals('Monday').first();
    assert(!recipes.some((recipe) => recipe.id === deleted.id), 'Deleted recipe remains');
    assert(recipes.some((recipe) => recipe.id === kept.id), 'Unrelated recipe removed');
    assert(!('Breakfast' in day) && day.Lunch === kept.id, 'Planner references not updated');
  }));

  test('Separate account scopes isolate reads and deletes', async () => {
    const tenantId = `test-${crypto.randomUUID()}`;
    const scope = { issuer: 'test-issuer', tenantId, userId: 'A' };
    const scoped = [];
    try {
      const first = await window.MacroChef.createScopedRepository(scope);
      scoped.push(first.repository);
      const second = await window.MacroChef.createScopedRepository({ ...scope, userId: 'B' });
      scoped.push(second.repository);
      await Promise.all(scoped.map((repository) => repository.initialize()));
      const mealA = await first.repository.saveRecipe({ name: 'A private' });
      const mealB = await second.repository.saveRecipe({ name: 'B private' });
      const visibleA = await first.repository.getAllRecipes();
      await first.repository.deleteRecipe(mealB.id);
      const visibleB = await second.repository.getAllRecipes();
      equal(visibleA.length, 1, 'Account A recipe count');
      equal(visibleA[0].id, mealA.id, 'Account A sees its own recipe');
      equal(visibleB.length, 1, 'Account B recipe count');
      equal(visibleB[0].id, mealB.id, 'Account A must not delete B recipe');
    } finally {
      for (const repository of scoped) {
        const name = repository.db.name;
        repository.db.close();
        await Dexie.delete(name);
      }
    }
  });

  test('Recipe updatedAt exists and advances on update', () => withRepository(async (repository) => {
    const created = await repository.saveRecipe({ name: 'Original' });
    const before = Date.parse(created.updatedAt);
    assert(Number.isFinite(before), 'created recipe has no valid updatedAt');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const updated = await repository.saveRecipe({ ...created, name: 'Changed' });
    const stored = (await repository.getAllRecipes()).find((recipe) => recipe.id === created.id);
    const after = Date.parse(updated.updatedAt);
    assert(Number.isFinite(after) && after > before, 'updatedAt did not advance');
    equal(stored.updatedAt, updated.updatedAt, 'updatedAt was not persisted');
  }));

  test('Offline update journals the persisted timestamp', () => withRepository(async (repository) => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      const input = { name: 'Offline meal', updatedAt: '2000-01-01T00:00:00.000Z' };
      const created = await repository.saveRecipe(input);
      const queue = await repository.db.OutboxQueue.toArray();
      equal(input.updatedAt, '2000-01-01T00:00:00.000Z', 'Caller input mutated');
      assert(created.updatedAt !== input.updatedAt, 'Caller timestamp was trusted');
      equal(queue[0].payload.updatedAt, created.updatedAt, 'Journal timestamp differs');
    } finally {
      delete navigator.onLine;
    }
  }));

  run();
})();
