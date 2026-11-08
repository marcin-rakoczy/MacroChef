// Dexie-backed implementation of MacroChef's data repository contract
window.MacroChef = window.MacroChef || {};

(function () {
  /**
   * @interface
   * @class
   */
  class ICalorieRepository {
    initialize() { throw new Error('initialize() must be implemented'); }
    watchAppData() { throw new Error('watchAppData() must be implemented'); }
    watchProducts() { throw new Error('watchProducts() must be implemented'); }
    getAllRecipes() { throw new Error('getAllRecipes() must be implemented'); }
    saveRecipe(recipeData) { throw new Error('saveRecipe() must be implemented'); }
    deleteRecipe(id) { throw new Error('deleteRecipe() must be implemented'); }
    savePlannerSlot(dayKey, currentDayPlan, mealType, recipeId) {
      throw new Error('savePlannerSlot() must be implemented');
    }
    clearPlanner() { throw new Error('clearPlanner() must be implemented'); }
    saveGoals(goals) { throw new Error('saveGoals() must be implemented'); }
    saveProduct(productData) { throw new Error('saveProduct() must be implemented'); }
    deleteProduct(id) { throw new Error('deleteProduct() must be implemented'); }
  }

  const createId = (prefix) => {
    const cryptoApi = window.crypto;
    let identifier;

    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
      identifier = cryptoApi.randomUUID();
    } else if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      identifier = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    } else {
      identifier = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
      });
    }

    return `${prefix}-${identifier}`;
  };

  const assertStringKey = (key, entity) => {
    if (typeof key !== 'string' || key.length === 0) {
      throw new TypeError(`${entity} primary key must be a non-empty string`);
    }
  };

  class DexieCalorieRepository extends ICalorieRepository {
    constructor() {
      super();
      this.db = new Dexie('MacroChefDB');

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

      this.db.on('populate', async () => {
        await this.seedInitialData();
        if (window.MacroChef.LIDL_PRODUCTS) {
          await this.db.products.bulkAdd(window.MacroChef.LIDL_PRODUCTS);
        }
      });
    }

    async seedInitialData() {
      if (window.MacroChef.STARTER_RECIPES) {
        await this.db.recipes.bulkAdd(window.MacroChef.STARTER_RECIPES);
      }
      if (window.MacroChef.DEFAULT_PLAN) {
        await this.db.planner.bulkAdd(window.MacroChef.DEFAULT_PLAN);
      }
      if (window.MacroChef.DEFAULT_GOALS) {
        await this.db.goals.put(window.MacroChef.DEFAULT_GOALS);
      }
    }

    async initialize() {
      await this.db.open();
      if (await this.db.recipes.count() === 0) {
        await this.seedInitialData();
      }

      if (await this.db.products.count() === 0 && window.MacroChef.LIDL_PRODUCTS) {
        await this.db.products.bulkAdd(window.MacroChef.LIDL_PRODUCTS);
      }
    }

    watchAppData() {
      return Dexie.liveQuery(async () => {
        const [recipes, plannerRows, storedGoals] = await Promise.all([
          this.db.recipes.toArray(),
          this.db.planner.toArray(),
          this.db.goals.get('user_goals')
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
        return {
          recipes,
          plan,
          goals: storedGoals || window.MacroChef.DEFAULT_GOALS
        };
      });
    }

    watchProducts() {
      return Dexie.liveQuery(async () => {
        const products = await this.db.products.toArray();
        return products.length === 0 && window.MacroChef.LIDL_PRODUCTS
          ? window.MacroChef.LIDL_PRODUCTS
          : products;
      });
    }

    async getAllRecipes() {
      return await this.db.recipes.toArray();
    }

    async saveRecipe(recipeData) {
      const recipeToSave = { ...recipeData };
      if (recipeToSave.id === undefined || recipeToSave.id === null || recipeToSave.id === '') {
        recipeToSave.id = createId('rec');
      }
      assertStringKey(recipeToSave.id, 'Recipe');
      await this.db.recipes.put(recipeToSave);
      return recipeToSave;
    }

    async deleteRecipe(id) {
      assertStringKey(id, 'Recipe');
      await this.db.transaction('rw', this.db.recipes, this.db.planner, async () => {
        await this.db.recipes.delete(id);
        const allPlans = await this.db.planner.toArray();
        for (const day of allPlans) {
          let modified = false;
          ['Breakfast', 'Lunch', 'Dinner', 'Snack'].forEach((slot) => {
            if (day[slot] === id) {
              delete day[slot];
              modified = true;
            }
          });
          if (modified) {
            await this.db.planner.put(day);
          }
        }
      });
    }

    async savePlannerSlot(dayKey, currentDayPlan, mealType, recipeId) {
      assertStringKey(dayKey, 'Planner day');
      const updatedDay = { ...(currentDayPlan || {}), [mealType]: recipeId };
      await this.db.planner.put({ dayKey, ...updatedDay });
      return updatedDay;
    }

    async clearPlanner() {
      const days = window.MacroChef.DAYS_KEYS || [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ];
      const emptyArr = days.map((dayKey) => ({ dayKey }));
      await this.db.transaction('rw', this.db.planner, async () => {
        await this.db.planner.clear();
        await this.db.planner.bulkAdd(emptyArr);
      });

      const emptyMap = {};
      days.forEach((dayKey) => {
        emptyMap[dayKey] = {};
      });
      return emptyMap;
    }

    async saveGoals(goals) {
      const toSave = { ...goals, id: 'user_goals' };
      assertStringKey(toSave.id, 'Goals');
      await this.db.goals.put(toSave);
      return toSave;
    }

    async saveProduct(productData) {
      const toSave = { ...productData };
      if (toSave.id === undefined || toSave.id === null || toSave.id === '') {
        toSave.id = createId('product');
      }
      assertStringKey(toSave.id, 'Product');
      await this.db.products.put(toSave);
      return toSave;
    }

    async deleteProduct(id) {
      assertStringKey(id, 'Product');
      await this.db.products.delete(id);
    }
  }

  window.MacroChef.ICalorieRepository = ICalorieRepository;
  window.MacroChef.DexieCalorieRepository = DexieCalorieRepository;
  window.MacroChef.repositories = new DexieCalorieRepository();
})();
