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
        id: 'old-lidl-product',
        name: { pl: 'Masło, Mleczna Krowa, 82% (Pilos)', en: 'Mleczna Krowa Butter, 82% (Pilos)' },
        category: 'dairy',
        categoryName: { pl: 'Nabiał i Jaja', en: 'Dairy & Eggs' },
        unit: 'g',
        packageSize: 200,
        catalogSource: 'lidl-pl-official',
        sourceProductId: 'lidl-verified-1',
        sourceUrl: 'https://www.lidl.pl/p/test',
        sourceVerifiedAt: '2026-11-12'
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
      assert(officialProducts.length === 500, 'Lidl catalog was not seeded');
      assert(officialProducts.every((item) => !('sourceUrl' in item) && !('sourceVerifiedAt' in item)),
        'Catalog sync must remove old source metadata from stored products');
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
    delete navigator.onLine;
    const syncRepo = new window.MacroChef.DexieCalorieRepository(`${name}-sync`, {
      seedDefaults: false, userId: 'account-sync', role: 'Admin'
    });
    scopedRepositories.push(syncRepo);
    scopedDatabases.add(syncRepo.db.name);
    await syncRepo.initialize();
    const tables = { products: [], recipes: [], planner: [], goals: [] };
    const requests = [];
    let version = 0;
    let rejectWrites = false;
    let emptyWrites = false;
    let omitProductFromList = false;
    const originalFetch = window.fetch;
    window.fetch = async (input, options) => {
      const url = new URL(input);
      const table = url.pathname.split('/').pop();
      const rows = tables[table];
      assert(rows, `Unexpected remote table: ${table}`);
      const method = options.method;
      const payload = options.body && JSON.parse(options.body);
      requests.push({ table, method, payload });
      assert(options.headers.Authorization.startsWith('Bearer '), 'Missing authorization header');
      if (method === 'GET') {
        const owner = url.searchParams.get('user_id');
        const idFilter = url.searchParams.get('id');
        const visible = rows.filter((row) => (!owner || `eq.${row.user_id}` === owner) &&
          (!idFilter || `eq.${row.id}` === idFilter) &&
          !(table === 'products' && omitProductFromList && !idFilter));
        return new Response(JSON.stringify(visible), {
          status: 200, headers: { 'Content-Range': `0-${Math.max(0, visible.length - 1)}/${visible.length}` }
        });
      }
      if (rejectWrites) return new Response('forbidden', { status: 403 });
      if (emptyWrites) return new Response('[]', { status: 200 });
      const id = method === 'POST' ? payload.id : url.searchParams.get('id').slice(3);
      const index = rows.findIndex((item) => item.id === id);
      const expectedVersion = url.searchParams.get('updated_at');
      if (method !== 'POST' && (index < 0 || `eq.${rows[index].updated_at}` !== expectedVersion)) {
        return new Response('[]', { status: 200 });
      }
      let saved;
      if (method === 'DELETE') {
        saved = rows.splice(index, 1)[0];
      } else {
        saved = { ...payload, updated_at: `2026-01-01T00:00:${String(++version).padStart(2, '0')}Z` };
        if (index >= 0) rows[index] = saved;
        else rows.push(saved);
      }
      return new Response(JSON.stringify([saved]), { status: method === 'POST' ? 201 : 200 });
    };
    const client = {
      supabaseUrl: 'https://test.supabase.co', supabaseKey: 'public',
      auth: { async getSession() {
        return { data: { session: { access_token: 'test-token', user: { id: 'account-sync' } } }, error: null };
      }, async getUser() {
        return { data: { user: { id: 'account-sync' } }, error: null };
      } }
    };
    const manager = new window.MacroChef.AppSyncManager();
    try {
      tables.products.push({
        id: 'shared-product', name_pl: 'Produkt', name_en: 'Product', category: 'other',
        category_pl: 'Inne', category_en: 'Other', unit: 'g', package_size: 100,
        source_url: null, source_verified_at: null, updated_at: '2025-01-01T00:00:00Z'
      });
      tables.recipes.push({
        id: 'admin-global', user_id: 'other-admin', data: { id: 'admin-global', name: 'Global' },
        updated_at: '2025-01-01T00:00:00Z'
      });
      await syncRepo.initializeSettings({ lang: 'en', darkMode: false, colorTheme: 'emerald' });
      await syncRepo.saveSettings({ lang: 'pl', darkMode: false, colorTheme: 'emerald' });
      assert(await syncRepo.db.OutboxQueue.count() === 0, 'Settings must remain local');
      syncRepo.mutations.onChange = () => { throw new Error('Simulated notification failure'); };
      const remoteRecipe = await syncRepo.saveRecipe({ name: 'Online recipe' });
      syncRepo.mutations.onChange = null;
      assert(await syncRepo.db.recipes.get(remoteRecipe.id), 'A scheduling failure hid a committed local write');
      await syncRepo.savePlannerSlot('Monday', {}, 'Lunch', remoteRecipe.id);
      assert(await syncRepo.db.OutboxQueue.count() === 2, 'Online account writes were not queued');
      manager.start({ repository: syncRepo, userId: 'account-sync', client });
      await manager.sync();
      assert(manager.getStatus().state === 'synced', 'Initial sync failed');
      assert(await syncRepo.db.OutboxQueue.count() === 0, 'Acknowledged entries were not removed');
      assert(tables.recipes.length === 2 && tables.planner.length === 1, 'Remote records were not created');
      assert((await syncRepo.db.products.get('shared-product')).name.pl === 'Produkt' &&
        await syncRepo.db.recipes.get('admin-global'), 'Shared products or global recipes were not pulled');
      await syncRepo.seedProducts();
      assert(await syncRepo.db.products.get('shared-product'), 'Catalog seeding removed a synchronized product');
      omitProductFromList = true;
      await manager.sync();
      assert(await syncRepo.db.products.get('shared-product'), 'A paginated omission was treated as a deletion');
      omitProductFromList = false;
      tables.products.length = 0;
      await manager.sync();
      assert(!await syncRepo.db.products.get('shared-product'), 'Previously observed server deletion was not pulled');
      await syncRepo.savePlannerSlot('Monday', {}, 'Breakfast', remoteRecipe.id);
      await syncRepo.savePlannerSlot('Monday', {}, 'Dinner', remoteRecipe.id);
      await manager.sync();
      assert(await syncRepo.db.OutboxQueue.count() === 0 && tables.planner[0].data.Dinner === remoteRecipe.id,
        'Consecutive queued changes were not rebased after acknowledgement');
      await syncRepo.deleteRecipe(remoteRecipe.id);
      await manager.sync();
      const planWrite = requests.filter((item) => item.table === 'planner' && item.method === 'PATCH').pop();
      assert(planWrite && planWrite.payload.data.Lunch === null, 'Undefined was not sent as JSON null');
      assert(!('Lunch' in (await syncRepo.db.plannerEntries.toCollection().first())),
        'Pulled planner clearing did not preserve local deletion semantics');
      assert(await syncRepo.db.OutboxQueue.count() === 0, 'Deletion and update were not acknowledged');
      await syncRepo.saveGoals({ calories: 2200 });
      rejectWrites = true;
      await manager.sync();
      assert(manager.getStatus().state === 'conflict' && await syncRepo.db.OutboxQueue.count() === 1,
        'Rejected writes must remain queued');
      rejectWrites = false;
      emptyWrites = true;
      await manager.sync();
      assert(await syncRepo.db.OutboxQueue.count() === 1, 'A response without an affected row was acknowledged');
      emptyWrites = false;
      await manager.sync();
      assert(await syncRepo.db.OutboxQueue.count() === 0, 'Retry did not clear the acknowledged entry');
      tables.goals[0].updated_at = '2026-01-02T00:00:00Z';
      tables.goals[0].data.calories = 2250;
      await manager.sync();
      assert((await syncRepo.db.goals.toCollection().first()).calories === 2250,
        'A newer server version was not pulled');
      await syncRepo.saveGoals({ calories: 2300 });
      tables.goals[0].updated_at = '2026-02-01T00:00:00Z';
      tables.goals[0].data.calories = 2500;
      await manager.sync();
      assert(manager.getStatus().state === 'conflict' && await syncRepo.db.OutboxQueue.count() === 1,
        'Server conflict must preserve the queued local change');
      assert((await syncRepo.db.goals.toCollection().first()).calories === 2300,
        'Server conflict overwrote the pending local change');

      const localOnly = new window.MacroChef.DexieCalorieRepository(`${name}-local-only`, {
        seedDefaults: false, userId: 'tester', role: 'Tester'
      });
      scopedRepositories.push(localOnly);
      scopedDatabases.add(localOnly.db.name);
      await localOnly.initialize();
      await localOnly.finishGuestMigration({
        recipes: [{ id: 'guest-recipe', name: 'Local recipe' }],
        plans: [{ dayKey: 'Monday', Lunch: 'guest-recipe' }]
      }, true);
      assert((await localOnly.db.OutboxQueue.toArray()).every((item) => item.table !== 'recipes'),
        'Guest recipes for Tester must remain local');
      const testerClient = { ...client, auth: { async getSession() {
        return { data: { session: { access_token: 'tester-token', user: { id: 'tester' } } }, error: null };
      }, async getUser() {
        return { data: { user: { id: 'tester' } }, error: null };
      } } };
      const testerSync = new window.MacroChef.AppSyncManager();
      try {
        testerSync.start({ repository: localOnly, userId: 'tester', client: testerClient });
        await testerSync.sync();
        assert(testerSync.getStatus().state === 'conflict' && await localOnly.db.OutboxQueue.count() === 1,
          'Plan referring to local-only recipe must stay queued');
        assert(!tables.planner.some((row) => row.user_id === 'tester'), 'Invalid plan was uploaded');
      } finally {
        await testerSync.stop();
      }

      let resolveSession;
      const delayedClient = { ...client, auth: { getSession: () => new Promise((resolve) => { resolveSession = resolve; }) } };
      const stoppedSync = new window.MacroChef.AppSyncManager();
      stoppedSync.start({ repository: localOnly, userId: 'tester', client: delayedClient });
      const callsBeforeStop = requests.length;
      stoppedSync.running = stoppedSync.sync().catch(() => {});
      await stoppedSync.stop();
      resolveSession({ data: { session: { access_token: 'late', user: { id: 'tester' } } }, error: null });
      await stoppedSync.running;
      assert(requests.length === callsBeforeStop, 'Stopped session sent a late request');

      await manager.stop();
      const mismatchedSync = new window.MacroChef.AppSyncManager();
      const mismatchedClient = { ...client, auth: { ...client.auth, async getUser() {
        return { data: { user: { id: 'another-account' } }, error: null };
      } } };
      try {
        mismatchedSync.start({ repository: syncRepo, userId: 'account-sync', client: mismatchedClient });
        const beforeMismatch = requests.length;
        let rejected = false;
        try { await mismatchedSync.sync(); } catch (error) { rejected = /Verified token/.test(error.message); }
        assert(rejected && requests.length === beforeMismatch, 'A mismatched verified account was synchronized');
      } finally {
        await mismatchedSync.stop();
      }
      const debounceRepo = new window.MacroChef.DexieCalorieRepository(`${name}-debounce`, {
        seedDefaults: false, userId: 'debounce'
      });
      scopedRepositories.push(debounceRepo);
      scopedDatabases.add(debounceRepo.db.name);
      await debounceRepo.initialize();
      const debounceClient = { ...client, auth: { async getSession() {
        return { data: { session: { access_token: 'debounce-token', user: { id: 'debounce' } } }, error: null };
      }, async getUser() {
        return { data: { user: { id: 'debounce' } }, error: null };
      } } };
      const debounceSync = new window.MacroChef.AppSyncManager();
      const waitForSync = async () => {
        for (let i = 0; i < 250; i++) {
          if (debounceSync.getStatus().state === 'synced') return;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        throw new Error('Timed out waiting for debounced synchronization');
      };
      try {
        debounceSync.start({ repository: debounceRepo, userId: 'debounce', client: debounceClient });
        assert(debounceSync.getStatus().state === 'pending', 'Session start did not schedule sync');
        await waitForSync();
        await debounceRepo.saveGoals({ calories: 1800 });
        assert(debounceSync.getStatus().state === 'pending', 'Local write did not schedule sync');
        await waitForSync();
        assert(await debounceRepo.db.OutboxQueue.count() === 0, 'Debounced write was not synchronized');
        window.dispatchEvent(new Event('online'));
        assert(debounceSync.getStatus().state === 'pending', 'Reconnect did not schedule sync');
        await waitForSync();
      } finally {
        await debounceSync.stop();
      }
    } finally {
      await manager.stop();
      window.fetch = originalFetch;
    }

    result.textContent = 'PASS: migration, offline CRUD, rollback, scoped accounts, Supabase sync';
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
