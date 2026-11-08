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

  run();
})();
