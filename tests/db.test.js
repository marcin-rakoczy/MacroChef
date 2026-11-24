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
    assert(typeof plan.id === 'string' && await db.planner.count() === 0, 'Planner migration failed');

    const ownerMigrationName = `${name}-owner-migration`;
    scopedDatabases.add(ownerMigrationName);
    const oldOwnerDb = new Dexie(ownerMigrationName);
    oldOwnerDb.version(8).stores({
      recipes: 'id', planner: 'dayKey', plannerEntries: 'id, dayKey', goals: 'id',
      products: 'id, name, category', OutboxQueue: 'id, timestamp', SyncState: 'id',
      settings: 'id, userId', migrationState: 'id, userId'
    });
    await oldOwnerDb.open();
    await oldOwnerDb.recipes.bulkAdd([
      { id: 'legacy-local', name: 'Local' },
      { id: 'legacy-synced', name: 'Unknown remote owner' },
      { id: 'legacy-foreign', userId: 'other-user', name: 'Foreign' }
    ]);
    await oldOwnerDb.SyncState.put({
      id: 'recipes:legacy-synced', table: 'recipes', recordId: 'legacy-synced', updatedAt: '2026-01-01T00:00:00Z'
    });
    await oldOwnerDb.OutboxQueue.put({
      id: 'legacy-queue', table: 'recipes', action: 'update',
      payload: { id: 'legacy-synced', value: { id: 'legacy-synced', name: 'Local edit' } },
      sequence: 1, timestamp: 1, baseUpdatedAt: '2026-01-01T00:00:00Z'
    });
    oldOwnerDb.close();
    const ownerMigrated = new window.MacroChef.DexieCalorieRepository(ownerMigrationName, {
      seedDefaults: false, userId: 'migration-owner'
    });
    scopedRepositories.push(ownerMigrated);
    await ownerMigrated.initialize();
    const migratedVisible = await ownerMigrated.getAllRecipes();
    assert(migratedVisible.length === 1 && migratedVisible[0].id === 'legacy-local' &&
      migratedVisible[0].userId === 'migration-owner', 'Legacy private records were not scoped');
    const unverified = await ownerMigrated.db.recipes.get('legacy-synced');
    assert(unverified.ownerUnverified && unverified.userId === '@unverified' &&
      (await ownerMigrated.db.recipes.get('legacy-foreign')).userId === 'other-user',
      'Unknown or foreign legacy ownership was reassigned');
    assert((await ownerMigrated.db.OutboxQueue.get('legacy-queue')).userId === 'migration-owner' &&
      (await ownerMigrated.db.SyncState.get('recipes:legacy-synced')).userId === 'migration-owner',
      'Legacy outbox or sync state was not preserved and scoped');
    const migrationManager = new window.MacroChef.AppSyncManager();
    migrationManager.start({ repository: ownerMigrated, userId: 'migration-owner', client: {} });
    const migratedRemote = {
      products: [], plannerEntries: [], goals: [],
      recipes: [{ id: 'legacy-synced', user_id: 'migration-owner',
        data: { id: 'legacy-synced', name: 'Old server' }, updated_at: '2026-01-01T00:00:00Z' }]
    };
    try {
      await migrationManager.pull(migratedRemote, []);
      assert((await ownerMigrated.db.recipes.get('legacy-synced')).ownerUnverified &&
        await ownerMigrated.db.OutboxQueue.get('legacy-queue'), 'Pending legacy edit was overwritten');
      migrationManager.request = async (_table, _params, _method, payload) => ({
        status: 200, data: [{ ...payload, updated_at: '2026-01-02T00:00:00Z' }]
      });
      await migrationManager.push(await ownerMigrated.db.OutboxQueue.get('legacy-queue'), migratedRemote);
      await migrationManager.pull(migratedRemote, []);
      assert(!(await ownerMigrated.db.OutboxQueue.get('legacy-queue')) &&
        (await ownerMigrated.db.recipes.get('legacy-synced')).userId === 'migration-owner' &&
        (await ownerMigrated.db.recipes.get('legacy-synced')).name === 'Local edit',
        'Verified legacy edit was not preserved and re-scoped');
    } finally {
      await migrationManager.stop();
    }
    const markerName = `${name}-foreign-marker`;
    scopedDatabases.add(markerName);
    const markerRepo = new window.MacroChef.DexieCalorieRepository(markerName, {
      seedDefaults: false, userId: 'migration-owner', legacyDatabaseName: `${name}-legacy`
    });
    scopedRepositories.push(markerRepo);
    await markerRepo.db.open();
    await markerRepo.db.migrationState.put({ id: '@scoped-database-migration', userId: 'other-user' });
    let markerRejected = false;
    try {
      await markerRepo.migrateLegacyDatabase();
    } catch (error) {
      markerRejected = /another user/.test(error.message);
    }
    assert(markerRejected && (await markerRepo.db.migrationState.get('@scoped-database-migration')).userId === 'other-user',
      'Foreign migration marker was not rejected');
    await markerRepo.db.migrationState.delete('@scoped-database-migration');
    await markerRepo.db.recipes.put({ id: 'foreign-destination', userId: 'other-user', name: 'Keep' });
    markerRepo.legacyDatabaseName = ownerMigrated.db.name;
    let foreignDestinationRejected = false;
    try {
      await markerRepo.migrateLegacyDatabase();
    } catch (error) {
      foreignDestinationRejected = /another user/.test(error.message);
    }
    assert(foreignDestinationRejected && (await markerRepo.db.recipes.get('foreign-destination')).name === 'Keep',
      'Migration did not preserve foreign destination records');

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
    const plansToClear = await db.plannerEntries.toArray();
    for (const plannerDay of plansToClear) {
      for (const slot of ['Breakfast', 'Lunch', 'Dinner', 'Snack']) {
        if (plannerDay[slot]) {
          await repository.savePlannerSlot(plannerDay.dayKey, plannerDay, slot, '');
        }
      }
    }
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

    const fresh = new window.MacroChef.DexieCalorieRepository(freshName);
    try {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      await fresh.initialize();
      assert(await fresh.db.recipes.count() === 0, 'Demo recipes were seeded');
      assert(await fresh.db.plannerEntries.count() === 0, 'Demo plan was seeded');
      assert(await fresh.db.goals.count() === 1, 'Default goals missing');
      assert(await fresh.db.OutboxQueue.count() === 0, 'Initial data was journaled');

      await fresh.db.recipes.bulkAdd([
        { id: 'rec-demo-local', userId: 'guest', name: { en: 'Berry Protein Oats Bowl', pl: 'Owsianka' } },
        { id: 'rec-demo-synced', userId: 'guest', name: { en: 'Greek Yogurt & Almond Snack', pl: 'Jogurt' } },
        { id: 'rec-user', userId: 'guest', name: { en: 'My recipe', pl: 'Mój przepis' } }
      ]);
      await fresh.db.SyncState.put({ id: 'recipes:rec-demo-synced', userId: 'guest', table: 'recipes', recordId: 'rec-demo-synced', updatedAt: '2026-01-01T00:00:00Z' });
      await fresh.initialize();
      const remaining = (await fresh.db.recipes.toArray()).map((r) => r.id).sort();
      assert(JSON.stringify(remaining) === JSON.stringify(['rec-demo-synced', 'rec-user']), `Legacy demo recipes not purged: ${remaining}`);
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
    assert(new Set([a, b, otherTenant, otherIssuer].map((item) => item.repository.db.name)).size === 4,
      'Accounts, tenants or issuers share a database');
    assert(a.shoppingStorageKey !== b.shoppingStorageKey, 'Shopping keys are shared between accounts');
    await a.repository.initialize();
    await b.repository.initialize();
    assert(await a.repository.db.recipes.count() === 0, 'Account data was seeded before cloud integration');
    await a.repository.saveRecipe({ name: 'Account A private' });
    assert(await b.repository.db.recipes.count() === 0, 'Account data leaked to another database');
    await aAgain.repository.initialize();
    assert((await aAgain.repository.db.recipes.toArray())[0].name.en === 'Account A private', 'Same account could not reopen data');
    assert(!(await db.recipes.toArray()).some((item) => item.name.en === 'Account A private'), 'Account write changed guest data');
    let invalidScopeRejected = false;
    try { await window.MacroChef.createScopedRepository({ issuer: 'test', tenantId: '', userId: 'a' }); }
    catch (error) { invalidScopeRejected = error instanceof TypeError; }
    assert(invalidScopeRejected, 'Invalid scope was accepted');

    const migrationScope = await window.MacroChef.createScopedRepository({ ...identity, userId: 'migration-account' });
    const migrationName = migrationScope.repository.db.name;
    const legacyName = migrationName.replace(/^PROD_account-/, 'MacroChef-account-');
    scopedRepositories.push(migrationScope.repository);
    scopedDatabases.add(migrationName);
    scopedDatabases.add(legacyName);
    const legacy = new window.MacroChef.DexieCalorieRepository(legacyName, {
      exactDatabaseName: true, seedDefaults: false, userId: 'migration-account'
    });
    await legacy.initialize();
    const privateRecipe = await legacy.saveRecipe({ name: 'Private migration recipe' });
    await legacy.savePlannerSlot('Monday', {}, 'Breakfast', privateRecipe.id);
    await legacy.saveGoals({ calories: 1777 });
    const legacyQueue = await legacy.db.OutboxQueue.count();
    legacy.close();
    await migrationScope.repository.initialize();
    const migratedRecipe = await migrationScope.repository.db.recipes.get(privateRecipe.id);
    assert(migratedRecipe && (migratedRecipe.name.en || migratedRecipe.name) === 'Private migration recipe',
      'Scoped migration lost the private recipe');
    assert((await migrationScope.repository.db.plannerEntries.toArray())[0].Breakfast === privateRecipe.id,
      'Scoped migration lost the plan');
    assert((await migrationScope.repository.db.goals.toArray())[0].calories === 1777,
      'Scoped migration lost the goals');
    assert(await migrationScope.repository.db.OutboxQueue.count() === legacyQueue,
      'Scoped migration lost pending writes');
    await legacy.db.open();
    await legacy.db.recipes.put({ id: 'legacy-late', name: 'Old tab write' });
    legacy.close();
    migrationScope.repository.close();
    const reopenedMigration = await window.MacroChef.createScopedRepository({ ...identity, userId: 'migration-account' });
    scopedRepositories.push(reopenedMigration.repository);
    await reopenedMigration.repository.initialize();
    assert(!await reopenedMigration.repository.db.recipes.get('legacy-late') &&
      await reopenedMigration.repository.db.recipes.get(privateRecipe.id), 'Scoped migration repeated after completion');

    const originalEnvironment = window.MacroChef.ENV;
    const guestEnvironment = `TEST-${crypto.randomUUID()}`;
    window.MacroChef.ENV = guestEnvironment;
    try {
      const oldGuestName = `${guestEnvironment}_MacroChefDB`;
      const oldGuest = new window.MacroChef.DexieCalorieRepository(oldGuestName, {
        exactDatabaseName: true, seedDefaults: false
      });
      scopedDatabases.add(oldGuestName);
      await oldGuest.initialize();
      const oldGuestRecipe = await oldGuest.saveRecipe({ name: 'Guest migration recipe' });
      oldGuest.close();
      assert(await window.MacroChef.guestDatabaseExists(), 'Legacy guest database was not detected');
      const migratedGuest = window.MacroChef.createGuestRepository({ seedDefaults: false });
      scopedRepositories.push(migratedGuest);
      scopedDatabases.add(migratedGuest.db.name);
      await migratedGuest.initialize();
      assert(await migratedGuest.db.recipes.get(oldGuestRecipe.id), 'Guest migration lost the recipe');
    } finally {
      window.MacroChef.ENV = originalEnvironment;
    }

    const lifecycle = new window.MacroChef.RepositoryScopeLifecycle();
    const lifecycleEvents = [];
    const isolatedA = await lifecycle.switchTo(async () => {
      const scope = await window.MacroChef.createScopedRepository({ ...identity, userId: 'isolated-a' });
      scopedRepositories.push(scope.repository);
      scopedDatabases.add(scope.repository.db.name);
      await scope.repository.initialize();
      scope.syncManager = { async stop() { lifecycleEvents.push('stop'); } };
      return scope;
    });
    const isolatedRecipe = await isolatedA.repository.saveRecipe({ name: 'Isolated private recipe' });
    await isolatedA.repository.savePlannerSlot('Monday', {}, 'Breakfast', isolatedRecipe.id);
    await isolatedA.repository.saveGoals({ calories: 1888 });
    const subscription = isolatedA.repository.watchAppData().subscribe({ next() {} });
    const dispose = isolatedA.repository.disposeSubscriptions.bind(isolatedA.repository);
    isolatedA.repository.disposeSubscriptions = () => { lifecycleEvents.push('unsubscribe'); dispose(); };
    const close = isolatedA.repository.close.bind(isolatedA.repository);
    isolatedA.repository.close = () => { lifecycleEvents.push('close'); return close(); };
    const isolatedB = await lifecycle.switchTo(async () => {
      lifecycleEvents.push('create-b');
      const scope = await window.MacroChef.createScopedRepository({ ...identity, userId: 'isolated-b' });
      scopedRepositories.push(scope.repository);
      scopedDatabases.add(scope.repository.db.name);
      await scope.repository.initialize();
      return scope;
    });
    assert(lifecycleEvents.indexOf('stop') < lifecycleEvents.indexOf('unsubscribe') &&
      lifecycleEvents.indexOf('unsubscribe') < lifecycleEvents.indexOf('close') &&
      lifecycleEvents.indexOf('close') < lifecycleEvents.indexOf('create-b') &&
      isolatedA.repository.subscriptions.size === 0, 'Account teardown order was not enforced');
    subscription.unsubscribe();
    assert(await isolatedB.repository.db.recipes.count() === 0 &&
      await isolatedB.repository.db.plannerEntries.count() === 0 &&
      (await isolatedB.repository.db.goals.toArray()).every((item) => item.calories !== 1888),
      'Private account data leaked into another scope');
    const isolatedGuest = await lifecycle.switchTo(async () => {
      const guest = new window.MacroChef.DexieCalorieRepository(`${name}-guest`, { seedDefaults: false });
      scopedRepositories.push(guest);
      scopedDatabases.add(guest.db.name);
      await guest.initialize();
      return { repository: guest };
    });
    assert(await isolatedGuest.repository.db.recipes.count() === 0 &&
      await isolatedGuest.repository.db.plannerEntries.count() === 0 &&
      await isolatedGuest.repository.db.goals.count() === 0 &&
      isolatedGuest.repository.db.name !== isolatedA.repository.db.name,
      'Private account data leaked into the guest scope');
    await lifecycle.switchTo(null);
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
    let rejectWrites = null;
    let emptyWrites = false;
    let noContentWrites = false;
    let omitProductFromList = false;
    const originalFetch = window.fetch;
    window.fetch = async (input, options) => {
      const url = new URL(input);
      const table = url.pathname.split('/').pop();
      if (url.pathname.endsWith('/rpc/is_admin')) {
        const owner = JSON.parse(options.body).check_user;
        return new Response(JSON.stringify(owner === 'other-admin'), { status: 200 });
      }
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
      if (rejectWrites) return new Response(rejectWrites.body, { status: rejectWrites.status });
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
      if (noContentWrites) return new Response(null, { status: 204, headers: { 'Content-Range': '*/1' } });
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
        id: 'shared-product', name_polish: 'Produkt', name_english: 'Product', category: 'other',
        category_polish: 'Inne', category_english: 'Other', unit: 'g', package_size: 100,
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
      await syncRepo.db.recipes.put({ id: 'foreign-private', userId: 'other-user', name: 'Private' });
      await syncRepo.db.plannerEntries.put({ id: 'foreign-plan', userId: 'other-user', dayKey: 'Tuesday', Breakfast: 'foreign-private' });
      await syncRepo.db.goals.put({ id: 'foreign-goal', userId: 'other-user', calories: 9999 });
      await syncRepo.db.OutboxQueue.put({
        id: 'foreign-outbox', userId: 'other-user', table: 'recipes', action: 'create',
        payload: { id: 'foreign-outbox-recipe', name: 'Private' }, sequence: 999, timestamp: 1
      });
      await syncRepo.db.SyncState.put({
        id: 'recipes:foreign-ghost', userId: 'other-user', table: 'recipes',
        recordId: 'foreign-ghost', updatedAt: '2025-01-01T00:00:00Z'
      });
      tables.recipes.push({
        id: 'remote-private', user_id: 'other-user', data: { id: 'remote-private', name: 'Remote private' },
        updated_at: '2025-01-01T00:00:00Z'
      });
      const visibleRecipes = await syncRepo.getAllRecipes();
      assert(visibleRecipes.some((item) => item.id === 'admin-global') &&
        !visibleRecipes.some((item) => item.id === 'foreign-private'),
        'Recipe query leaked a private record or hid the Admin library');
      const observedData = await new Promise((resolve, reject) => {
        const subscription = syncRepo.watchAppData().subscribe({
          next(value) { subscription.unsubscribe(); resolve(value); }, error: reject
        });
      });
      assert(!observedData.plan.Tuesday && observedData.goals.calories !== 9999,
        'Planner or goals query leaked another account');
      let deniedForeign = false;
      try { await syncRepo.saveRecipe({ id: 'foreign-private', name: 'Overwrite' }); }
      catch (error) { deniedForeign = /another user/.test(error.message); }
      assert(deniedForeign, 'Another user recipe could be overwritten');
      deniedForeign = false;
      try { await syncRepo.deleteRecipe('foreign-private'); }
      catch (error) { deniedForeign = /another user/.test(error.message); }
      assert(deniedForeign && (await syncRepo.db.recipes.get('foreign-private')).name === 'Private',
        'Another user recipe could be deleted');
      await syncRepo.saveGoals({ calories: 1770 });
      const ownQueue = await syncRepo.db.OutboxQueue.where('userId').equals('account-sync').toArray();
      assert(ownQueue.length === 1 && ownQueue[0].table === 'goals' &&
        (ownQueue[0].payload.value || ownQueue[0].payload).userId === 'account-sync', 'Owned changes were not stamped');
      await manager.sync();
      assert(await syncRepo.db.OutboxQueue.get('foreign-outbox') &&
        !tables.recipes.some((row) => row.id === 'foreign-outbox-recipe') &&
        !await syncRepo.db.recipes.get('remote-private') &&
        (await syncRepo.db.goals.get('foreign-goal')).calories === 9999 &&
        (await syncRepo.db.plannerEntries.get('foreign-plan')).Breakfast === 'foreign-private' &&
        manager.getStatus().pendingCount === 0, 'Sync applied another user data or queue');
      assert(!requests.some((item) => item.table === 'recipes' && item.method !== 'GET' &&
        item.payload && item.payload.id === 'foreign-outbox-recipe'), 'Foreign outbox was flushed');
      await syncRepo.db.OutboxQueue.delete('foreign-outbox');
      await syncRepo.db.SyncState.delete('recipes:foreign-ghost');
      await syncRepo.db.recipes.delete('foreign-private');
      await syncRepo.db.plannerEntries.delete('foreign-plan');
      await syncRepo.db.goals.delete('foreign-goal');
      tables.recipes = tables.recipes.filter((row) => row.id !== 'remote-private');
      const preparedAt = new Date('2025-02-03T04:05:06.000Z');
      const changes = {
        title: 'Oats', imageUrl: undefined, nutrition: { fiber: undefined, protein: 30 },
        meals: [undefined, { recipeId: 'r1', note: undefined }], preparedAt
      };
      await syncRepo.mutations.transaction([syncRepo.db.recipes], ({ update }) =>
        update(syncRepo.db.recipes, remoteRecipe.id, changes));
      rejectWrites = { status: 503, body: 'unavailable' };
      await manager.sync();
      const serialized = requests.filter((item) => item.table === 'recipes' && item.method === 'PATCH').pop().payload.data;
      assert(serialized.title === 'Oats' && serialized.imageUrl === null &&
        serialized.nutrition.fiber === null && serialized.nutrition.protein === 30 &&
        serialized.meals[0] === null && serialized.meals[1].note === null &&
        serialized.preparedAt === preparedAt.toISOString(), 'Nested outbox values were not preserved on the wire');
      assert(await syncRepo.db.OutboxQueue.count() === 1 && changes.imageUrl === undefined &&
        changes.nutrition.fiber === undefined && changes.meals[1].note === undefined &&
        changes.preparedAt === preparedAt, 'A rejected write was removed or its input was mutated');
      rejectWrites = null;
      noContentWrites = true;
      await manager.sync();
      noContentWrites = false;
      assert(await syncRepo.db.OutboxQueue.count() === 0, 'Verified 204 did not acknowledge the update');
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
      for (const rejection of [
        { status: 401, body: 'unauthorized' },
        { status: 403, body: 'forbidden' },
        { status: 400, body: '{"code":"42501"}' }
      ]) {
        rejectWrites = rejection;
        await manager.sync();
        let queued = await syncRepo.db.OutboxQueue.toArray();
        assert(manager.getStatus().state === 'conflict' && manager.getStatus().permissionErrors &&
          queued.length === 1 && queued[0].permissionError.includes('Permission denied'),
          'Permission rejection must flag and preserve the queued write');
        const writes = requests.filter((item) => item.table === 'goals' && item.method !== 'GET').length;
        await manager.sync();
        assert(requests.filter((item) => item.table === 'goals' && item.method !== 'GET').length === writes,
          'A flagged permission error was retried without user action');
        await manager.retryPermissionErrors();
        queued = await syncRepo.db.OutboxQueue.toArray();
        assert(!queued[0].permissionError, 'Explicit retry did not clear the permission flag');
      }
      rejectWrites = null;
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
      const goalConflict = manager.getStatus();
      const pendingGoal = (await syncRepo.db.OutboxQueue.toArray())[0];
      assert(goalConflict.conflictCount === 1 && goalConflict.pendingCount === 1 &&
        goalConflict.conflicts[0].table === 'goals' &&
        goalConflict.conflicts[0].recordId === pendingGoal.payload.id &&
        goalConflict.conflicts[0].serverUpdatedAt === '2026-02-01T00:00:00Z',
        'Goal conflict metadata or pending count is missing');

      tables.goals[0].updated_at = pendingGoal.baseUpdatedAt;
      await manager.sync();
      assert(await syncRepo.db.OutboxQueue.count() === 0 && manager.getStatus().state === 'synced',
        'Acknowledged goal update remained queued');
      const ownRecipe = await syncRepo.saveRecipe({ name: 'Own conflict recipe' });
      await manager.sync();
      const localRecipe = await syncRepo.db.recipes.get(ownRecipe.id);
      const editedRecipe = await syncRepo.saveRecipe({ ...localRecipe, name: 'Local edit' });
      const remoteGlobal = tables.recipes.find((item) => item.id === ownRecipe.id);
      remoteGlobal.updated_at = '2026-03-01T00:00:00Z';
      remoteGlobal.data.name = 'Server edit';
      await manager.sync();
      const recipeConflict = manager.getStatus();
      assert((await syncRepo.db.recipes.get(ownRecipe.id)).name === 'Local edit' &&
        await syncRepo.db.OutboxQueue.count() === 1, 'Recipe conflict lost the local edit or outbox entry');
      assert(recipeConflict.conflictCount === 1 && recipeConflict.pendingCount === 1 &&
        recipeConflict.conflicts[0].table === 'recipes' &&
        recipeConflict.conflicts[0].recordId === ownRecipe.id &&
        recipeConflict.conflicts[0].localUpdatedAt === editedRecipe.updatedAt &&
        recipeConflict.conflicts[0].serverUpdatedAt === '2026-03-01T00:00:00Z',
        'Recipe conflict metadata is incorrect');

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
