(async function () {
  const result = document.getElementById('result');
  const name = `MacroChef-test-${crypto.randomUUID()}`;
  const freshName = `${name}-fresh`;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  let repository;
  try {
    const old = new Dexie(name);
    old.version(1).stores({ recipes: 'id', planner: 'dayKey', goals: 'id' });
    old.version(2).stores({
      recipes: 'id', planner: 'dayKey', goals: 'id', products: 'id, name, category'
    });
    await old.open();
    await old.recipes.add({ id: 'rec-1', name: 'Old recipe' });
    await old.planner.add({ dayKey: 'Monday', Breakfast: 'rec-1' });
    await old.goals.add({ id: 'user_goals', calories: 2000 });
    await old.products.add({ id: 'lidl-1', name: 'Old product' });
    old.close();

    repository = new window.MacroChef.DexieCalorieRepository(name);
    const db = repository.db;
    await db.open();
    const [recipe] = await db.recipes.toArray();
    const [plan] = await db.plannerEntries.toArray();
    const [goal] = await db.goals.toArray();
    const [product] = await db.products.toArray();
    assert(recipe.id !== 'rec-1' && plan.Breakfast === recipe.id, 'Recipe reference migration failed');
    assert(goal.id !== 'user_goals' && goal.calories === 2000, 'Goals migration failed');
    assert(product.id !== 'lidl-1' && product.name === 'Old product', 'Product migration failed');
    assert(typeof plan.id === 'string' && !db.tables.some((table) => table.name === 'planner'), 'Planner migration failed');

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const newRecipe = await repository.saveRecipe({ name: 'New recipe' });
    await repository.savePlannerSlot('Monday', {}, 'Lunch', newRecipe.id);
    await repository.deleteRecipe(newRecipe.id);
    const updated = await db.plannerEntries.get(plan.id);
    assert(updated.Breakfast === recipe.id && !('Lunch' in updated), 'Planner edits lost data');
    const entries = await db.OutboxQueue.toArray();
    assert(entries.length === 4, 'Expected one journal entry per offline change');
    assert(entries.some((entry) => entry.action === 'create' && entry.payload.id === newRecipe.id), 'Missing create');
    assert(entries.some((entry) => entry.action === 'delete' && entry.payload.id === newRecipe.id), 'Missing delete');
    assert(entries.filter((entry) => entry.action === 'update' && entry.table === 'plannerEntries').length === 2, 'Missing updates');
    assert(entries.some((entry) => entry.payload.changes &&
      Object.prototype.hasOwnProperty.call(entry.payload.changes, 'Lunch') &&
      entry.payload.changes.Lunch === undefined), 'Missing removed field in journal');
    assert(entries.every((entry) => typeof entry.id === 'string' && typeof entry.timestamp === 'number'), 'Invalid journal metadata');

    await repository.saveRecipe({ ...recipe, name: 'Updated recipe' });
    const replacement = (await db.OutboxQueue.toArray()).find(
      (entry) => entry.action === 'update' && entry.table === 'recipes'
    );
    assert(replacement && replacement.payload.value.name === 'Updated recipe', 'Missing replacement payload');
    await repository.clearPlanner();
    assert((await db.plannerEntries.toArray()).every((item) => !item.Breakfast && !item.Lunch), 'Clear planner failed');

    const failQueue = () => { throw new Error('Queue write failed'); };
    db.OutboxQueue.hook('creating', failQueue);
    let failed = false;
    try {
      await repository.saveProduct({ name: 'Must roll back' });
    } catch (error) {
      failed = true;
    }
    db.OutboxQueue.hook('creating').unsubscribe(failQueue);
    assert(failed && !(await db.products.toArray()).some((item) => item.name === 'Must roll back'), 'Queue failure did not roll back');

    delete navigator.onLine;
    const count = await db.OutboxQueue.count();
    await repository.saveProduct({ name: 'Online product' });
    assert(await db.OutboxQueue.count() === count, 'Online mutation was journaled');

    const starterId = window.MacroChef.STARTER_RECIPES[0].id;
    const fresh = new window.MacroChef.DexieCalorieRepository(freshName);
    try {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      await fresh.initialize();
      const freshRecipes = await fresh.db.recipes.toArray();
      const freshPlans = await fresh.db.plannerEntries.toArray();
      assert(freshRecipes.length > 0 && freshPlans.length === 7, 'Initial data missing');
      assert(freshPlans.every((item) => !item.Breakfast || freshRecipes.some((r) => r.id === item.Breakfast)), 'Initial recipe references broken');
      assert(window.MacroChef.STARTER_RECIPES[0].id === starterId, 'Starter data was mutated');
      assert(await fresh.db.OutboxQueue.count() === 0, 'Initial data was journaled');
    } finally {
      fresh.db.close();
    }
    result.textContent = 'PASS: migration, initial data, offline CRUD, rollback, online writes';
  } catch (error) {
    console.error(error);
    result.textContent = `FAIL: ${error.stack || error}`;
  } finally {
    delete navigator.onLine;
    if (repository) repository.db.close();
    await Dexie.delete(name);
    await Dexie.delete(freshName);
  }
})();
