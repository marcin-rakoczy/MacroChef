(async function () {
  const result = document.getElementById('result');
  const name = `MacroChef-test-${crypto.randomUUID()}`;
  const freshName = `${name}-fresh`;
  const catalogName = `${name}-catalog`;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  let repository;
  const scopedDatabases = new Set();
  const scopedRepositories = [];
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

    const imported = await repository.saveRecipes([
      { name: { en: 'Imported one', pl: 'Importowany jeden' } },
      { name: { en: 'Imported two', pl: 'Importowany dwa' } }
    ]);
    assert(imported.length === 2 && imported[0].id !== imported[1].id, 'Batch import IDs were not unique');
    assert(imported.every((item) => typeof item.updatedAt === 'string'), 'Batch import timestamps missing');
    const importedEntries = (await db.OutboxQueue.toArray()).filter(
      (entry) => entry.table === 'recipes' && entry.action === 'create' &&
        entry.payload.name && typeof entry.payload.name.en === 'string' &&
        entry.payload.name.en.startsWith('Imported ')
    );
    assert(importedEntries.length === 2, 'Batch import was not journaled');

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
    const recipeCountBeforeFailedImport = await db.recipes.count();
    try {
      await repository.saveRecipes([{ name: 'Must roll back 1' }, { name: 'Must roll back 2' }]);
    } catch (error) {
      failed = true;
    }
    assert(failed && await db.recipes.count() === recipeCountBeforeFailedImport, 'Failed batch import was not rolled back');
    failed = false;
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

    const oldCatalog = new window.MacroChef.DexieCalorieRepository(catalogName, { seedDefaults: false });
    await oldCatalog.db.open();
    await oldCatalog.db.products.bulkAdd([
      {
        id: 'legacy-default',
        name: { pl: 'Old default item', en: 'Old default item' },
        category: 'dairy',
        categoryName: { pl: 'Nabiał i Jaja', en: 'Dairy & Eggs' },
        unit: 'g',
        packageSize: 250
      },
      {
        id: 'user-product',
        name: { pl: 'Mój produkt', en: 'My product' },
        category: 'other',
        unit: 'g',
        packageSize: 123
      }
    ]);
    oldCatalog.db.close();
    const updatedCatalog = new window.MacroChef.DexieCalorieRepository(catalogName);
    try {
      await updatedCatalog.initialize();
      const savedProducts = await updatedCatalog.db.products.toArray();
      assert(!savedProducts.some((item) => item.id === 'legacy-default'), 'Unverified legacy default was retained');
      assert(savedProducts.some((item) => item.id === 'user-product'), 'User product was removed during catalog update');
      const officialProducts = savedProducts.filter((item) => item.catalogSource === 'lidl-pl-official');
      assert(officialProducts.length === 3, 'Verified Lidl catalog was not seeded');
      assert(officialProducts.every((item) => item.sourceUrl && item.sourceVerifiedAt),
        'Verified products must retain source provenance');
    } finally {
      updatedCatalog.db.close();
    }

    const identity = { issuer: 'test-issuer', tenantId: name, userId: 'account-a' };
    const a = await window.MacroChef.createScopedRepository(identity);
    const aAgain = await window.MacroChef.createScopedRepository({ ...identity });
    const b = await window.MacroChef.createScopedRepository({ ...identity, userId: 'account-b' });
    const otherTenant = await window.MacroChef.createScopedRepository({ ...identity, tenantId: `${name}-other` });
    const otherIssuer = await window.MacroChef.createScopedRepository({ ...identity, issuer: 'other-issuer' });
    [a, aAgain, b, otherTenant, otherIssuer].forEach((item) => {
      scopedRepositories.push(item.repository);
      scopedDatabases.add(item.repository.db.name);
    });
    assert(a.repository.db.name === aAgain.repository.db.name, 'Same scope must reopen the same database');
    assert(scopedDatabases.size === 4, 'Accounts, tenants or issuers share a database');
    assert(a.shoppingStorageKey !== b.shoppingStorageKey, 'Shopping keys are shared between accounts');
    await a.repository.initialize();
    await b.repository.initialize();
    assert(await a.repository.db.recipes.count() === 0, 'Account data was seeded before cloud integration');
    await a.repository.saveRecipe({ name: 'Account A private' });
    assert(await b.repository.db.recipes.count() === 0, 'Account data leaked to another database');
    await aAgain.repository.initialize();
    assert((await aAgain.repository.db.recipes.toArray())[0].name === 'Account A private', 'Same account could not reopen data');
    assert(!(await db.recipes.toArray()).some((item) => item.name === 'Account A private'), 'Account write changed guest data');
    let invalidScopeRejected = false;
    try { await window.MacroChef.createScopedRepository({ issuer: 'test', tenantId: '', userId: 'a' }); }
    catch (error) { invalidScopeRejected = error instanceof TypeError; }
    assert(invalidScopeRejected, 'Invalid scope was accepted');
    const contract = new window.MacroChef.AppSyncManager();
    let abstractRejected = false;
    try { contract.requestSync(); } catch (error) { abstractRejected = /must be implemented/.test(error.message); }
    assert(abstractRejected, 'Abstract sync contract silently succeeded');
    result.textContent = 'PASS: migration, offline CRUD, rollback, scoped accounts, sync contract';
  } catch (error) {
    console.error(error);
    result.textContent = `FAIL: ${error.stack || error}`;
  } finally {
    delete navigator.onLine;
    if (repository) repository.db.close();
    scopedRepositories.forEach((item) => item.db.close());
    for (const databaseName of scopedDatabases) await Dexie.delete(databaseName);
    await Dexie.delete(name);
    await Dexie.delete(freshName);
    await Dexie.delete(catalogName);
  }
})();
