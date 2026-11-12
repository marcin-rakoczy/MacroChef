// Dexie-backed implementation of MacroChef's data repository contract
window.MacroChef = window.MacroChef || {};

(function () {
  class ICalorieRepository {
    initialize() { throw new Error('initialize() must be implemented'); }
    watchAppData() { throw new Error('watchAppData() must be implemented'); }
    watchProducts() { throw new Error('watchProducts() must be implemented'); }
    watchSettings() { throw new Error('watchSettings() must be implemented'); }
    initializeSettings(defaults) { throw new Error('initializeSettings() must be implemented'); }
    saveSettings(settings) { throw new Error('saveSettings() must be implemented'); }
    getAllRecipes() { throw new Error('getAllRecipes() must be implemented'); }
    saveRecipe(recipeData) { throw new Error('saveRecipe() must be implemented'); }
    saveRecipes(recipes) { throw new Error('saveRecipes() must be implemented'); }
    deleteRecipe(id) { throw new Error('deleteRecipe() must be implemented'); }
    savePlannerSlot(dayKey, currentDayPlan, mealType, recipeId) {
      throw new Error('savePlannerSlot() must be implemented');
    }
    clearPlanner() { throw new Error('clearPlanner() must be implemented'); }
    saveGoals(goals) { throw new Error('saveGoals() must be implemented'); }
    saveProduct(productData) { throw new Error('saveProduct() must be implemented'); }
    deleteProduct(id) { throw new Error('deleteProduct() must be implemented'); }
  }

  const slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  const createId = (prefix) => {
    const cryptoApi = window.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
      return `${prefix}-${cryptoApi.randomUUID()}`;
    }
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    }
    throw new Error('Secure random number generation is required for database IDs');
  };

  const assertStringKey = (key, entity) => {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError(`${entity} primary key must be a non-empty string`);
    }
  };

  // Repository writes and their offline journal entries share one transaction.
  class OfflineMutationDecorator {
    constructor(db) {
      this.db = db;
    }

    transaction(tables, mutate) {
      const offline = navigator.onLine === false;
      return this.db.transaction('rw', ...tables, this.db.OutboxQueue, () => mutate({
        put: async (table, value) => {
          assertStringKey(value.id, table.name);
          const exists = await table.get(value.id);
          await table.put(value);
          if (offline) {
            await this.enqueue(table.name, exists ? 'update' : 'create',
              exists ? { id: value.id, value } : value);
          }
        },
        update: async (table, id, changes) => {
          assertStringKey(id, table.name);
          const count = await table.update(id, changes);
          if (count && offline) {
            await this.enqueue(table.name, 'update', { id, changes });
          }
        },
        delete: async (table, id) => {
          assertStringKey(id, table.name);
          const exists = await table.get(id);
          if (exists === undefined) return;
          await table.delete(id);
          if (offline) {
            await this.enqueue(table.name, 'delete', { id });
          }
        }
      }));
    }

    enqueue(table, action, payload) {
      return this.db.OutboxQueue.add({
        id: createId('outbox'),
        table,
        action,
        payload: Dexie.deepClone(payload),
        timestamp: Date.now()
      });
    }
  }

  class DexieCalorieRepository extends ICalorieRepository {
    constructor(databaseName = 'MacroChefDB', options = {}) {
      super();
      this.db = new Dexie(databaseName);
      this.seedDefaults = options.seedDefaults !== false;
      this.userId = options.userId || 'guest';

      this.db.version(1).stores({
        recipes: 'id',
        planner: 'dayKey',
        goals: 'id'
      });
      this.db.version(2).stores({
        recipes: 'id',
        planner: 'dayKey',
        goals: 'id',
        products: 'id, name, category'
      });
      this.db.version(3).stores({
        recipes: 'id',
        planner: 'dayKey',
        plannerEntries: 'id, dayKey',
        goals: 'id',
        products: 'id, name, category',
        OutboxQueue: 'id, timestamp'
      }).upgrade(async (tx) => {
        const recipeIds = new Map();
        const recipes = await tx.table('recipes').toArray();
        await tx.table('recipes').clear();
        for (const recipe of recipes) {
          const id = createId('rec');
          recipeIds.set(recipe.id, id);
          await tx.table('recipes').add({ ...recipe, id });
        }

        const plans = await tx.table('planner').toArray();
        for (const plan of plans) {
          const migrated = { ...plan, id: createId('plan') };
          slots.forEach((slot) => {
            if (recipeIds.has(migrated[slot])) migrated[slot] = recipeIds.get(migrated[slot]);
          });
          await tx.table('plannerEntries').add(migrated);
        }

        const goals = await tx.table('goals').toArray();
        await tx.table('goals').clear();
        for (const goal of goals) {
          await tx.table('goals').add({ ...goal, id: createId('goal') });
        }
        const products = await tx.table('products').toArray();
        await tx.table('products').clear();
        for (const product of products) {
          await tx.table('products').add({ ...product, id: createId('product') });
        }
      });
      this.db.version(4).stores({ planner: null });
      this.db.version(5).stores({ settings: 'id, userId' });
      this.mutations = new OfflineMutationDecorator(this.db);

      this.db.on('populate', async () => {
        if (this.seedDefaults) {
          await this.seedInitialData();
          await this.seedProducts();
        }
      });
    }

    async seedInitialData() {
      const recipes = window.MacroChef.STARTER_RECIPES || [];
      const recipeIds = new Map();
      const seededRecipes = recipes.map((recipe) => {
        const id = createId('rec');
        recipeIds.set(recipe.id, id);
        return { ...recipe, id };
      });
      if (seededRecipes.length) await this.db.recipes.bulkAdd(seededRecipes);

      if (window.MacroChef.DEFAULT_PLAN && await this.db.plannerEntries.count() === 0) {
        const plans = window.MacroChef.DEFAULT_PLAN.map((plan) => {
          const seeded = { ...plan, id: createId('plan') };
          slots.forEach((slot) => {
            if (recipeIds.has(seeded[slot])) seeded[slot] = recipeIds.get(seeded[slot]);
          });
          return seeded;
        });
        await this.db.plannerEntries.bulkAdd(plans);
      }
      if (window.MacroChef.DEFAULT_GOALS && await this.db.goals.count() === 0) {
        await this.db.goals.add({ ...window.MacroChef.DEFAULT_GOALS, id: createId('goal') });
      }
    }

    async seedProducts() {
      if (window.MacroChef.LIDL_PRODUCTS) {
        await this.db.products.bulkAdd(window.MacroChef.LIDL_PRODUCTS.map(
          (product) => ({ ...product, id: createId('product') })
        ));
      }
    }

    async initialize() {
      await this.db.open();
      if (!this.seedDefaults) return;
      if (await this.db.recipes.count() === 0) {
        await this.db.transaction('rw', this.db.recipes, this.db.plannerEntries, this.db.goals, () => this.seedInitialData());
      }
      if (await this.db.products.count() === 0) {
        await this.seedProducts();
      }
    }

    watchAppData() {
      return Dexie.liveQuery(async () => {
        const [recipes, plannerRows, storedGoals] = await Promise.all([
          this.db.recipes.toArray(),
          this.db.plannerEntries.toArray(),
          this.db.goals.toCollection().first()
        ]);
        const plan = {};
        plannerRows.forEach((item) => {
          plan[item.dayKey] = {
            Breakfast: item.Breakfast || '',
            Lunch: item.Lunch || '',
            Dinner: item.Dinner || '',
            Snack: item.Snack || ''
          };
        });
        return { recipes, plan, goals: storedGoals || window.MacroChef.DEFAULT_GOALS };
      });
    }

    watchProducts() {
      return Dexie.liveQuery(() => this.db.products.toArray());
    }

    watchSettings() {
      return Dexie.liveQuery(() => this.db.settings.where('userId').equals(this.userId).first());
    }

    async initializeSettings(defaults) {
      return await this.db.transaction('rw', this.db.settings, async () => {
        const current = await this.db.settings.where('userId').equals(this.userId).first();
        if (current) return current;
        const settings = { ...defaults, id: window.crypto.randomUUID(), userId: this.userId };
        await this.db.settings.add(settings);
        return settings;
      });
    }

    async saveSettings(settings) {
      return await this.mutations.transaction([this.db.settings], async ({ put }) => {
        const current = await this.db.settings.where('userId').equals(this.userId).first();
        if (!current) throw new Error('Settings have not been initialized');
        const saved = {
          ...current,
          lang: settings.lang,
          darkMode: settings.darkMode,
          colorTheme: settings.colorTheme
        };
        await put(this.db.settings, saved);
        return saved;
      });
    }

    async getAllRecipes() {
      return await this.db.recipes.toArray();
    }

    async saveRecipe(recipeData) {
      const recipe = { ...recipeData };
      if (recipe.id === undefined || recipe.id === null || recipe.id === '') recipe.id = createId('rec');
      assertStringKey(recipe.id, 'Recipe');
      await this.mutations.transaction([this.db.recipes], ({ put }) => {
        recipe.updatedAt = new Date().toISOString();
        return put(this.db.recipes, recipe);
      });
      return recipe;
    }

    async saveRecipes(recipeData) {
      if (!Array.isArray(recipeData) || recipeData.length === 0) {
        throw new TypeError('At least one recipe is required');
      }
      const recipes = recipeData.map((data) => ({
        ...data,
        id: createId('rec'),
        updatedAt: new Date().toISOString()
      }));
      await this.mutations.transaction([this.db.recipes], async ({ put }) => {
        for (const recipe of recipes) {
          await put(this.db.recipes, recipe);
        }
      });
      return recipes;
    }

    async deleteRecipe(id) {
      assertStringKey(id, 'Recipe');
      await this.mutations.transaction([this.db.recipes, this.db.plannerEntries], async ({ update, delete: remove }) => {
        await remove(this.db.recipes, id);
        const plans = await this.db.plannerEntries.toArray();
        for (const plan of plans) {
          const changes = {};
          slots.forEach((slot) => {
            if (plan[slot] === id) changes[slot] = undefined;
          });
          if (Object.keys(changes).length) await update(this.db.plannerEntries, plan.id, changes);
        }
      });
    }

    async savePlannerSlot(dayKey, currentDayPlan, mealType, recipeId) {
      assertStringKey(dayKey, 'Planner day');
      if (!slots.includes(mealType)) throw new TypeError('Invalid planner meal type');
      return await this.mutations.transaction([this.db.plannerEntries], async ({ put, update }) => {
        const current = await this.db.plannerEntries.where('dayKey').equals(dayKey).first();
        const updated = { ...(current || { id: createId('plan'), dayKey }), [mealType]: recipeId };
        if (current) {
          await update(this.db.plannerEntries, current.id, { [mealType]: recipeId });
        } else {
          await put(this.db.plannerEntries, updated);
        }
        const { id, dayKey: savedDay, ...plan } = updated;
        return plan;
      });
    }

    async clearPlanner() {
      const days = window.MacroChef.DAYS_KEYS || [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ];
      await this.mutations.transaction([this.db.plannerEntries], async ({ put, update, delete: remove }) => {
        const existing = await this.db.plannerEntries.toArray();
        for (const plan of existing) {
          if (!days.includes(plan.dayKey)) await remove(this.db.plannerEntries, plan.id);
        }
        for (const dayKey of days) {
          const plan = existing.find((item) => item.dayKey === dayKey);
          if (plan) {
            const changes = {};
            slots.forEach((slot) => { if (slot in plan) changes[slot] = undefined; });
            if (Object.keys(changes).length) await update(this.db.plannerEntries, plan.id, changes);
          } else {
            await put(this.db.plannerEntries, { id: createId('plan'), dayKey });
          }
        }
      });
      return Object.fromEntries(days.map((dayKey) => [dayKey, {}]));
    }

    async saveGoals(goals) {
      return await this.mutations.transaction([this.db.goals], async ({ put }) => {
        const current = await this.db.goals.toCollection().first();
        const toSave = { ...goals, id: current ? current.id : createId('goal') };
        await put(this.db.goals, toSave);
        return toSave;
      });
    }

    async saveProduct(productData) {
      const product = { ...productData };
      if (product.id === undefined || product.id === null || product.id === '') product.id = createId('product');
      assertStringKey(product.id, 'Product');
      await this.mutations.transaction([this.db.products], ({ put }) => put(this.db.products, product));
      return product;
    }

    async deleteProduct(id) {
      assertStringKey(id, 'Product');
      await this.mutations.transaction([this.db.products], ({ delete: remove }) => remove(this.db.products, id));
    }
  }

  window.MacroChef.ICalorieRepository = ICalorieRepository;
  window.MacroChef.DexieCalorieRepository = DexieCalorieRepository;
  window.MacroChef.repositories = new DexieCalorieRepository();
})();
