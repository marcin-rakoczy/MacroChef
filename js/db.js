// IndexedDB (Dexie.js) Data Access Layer for MacroChef
window.MacroChef = window.MacroChef || {};

(function () {
  const db = new Dexie('MacroChefDB');

  // Schema definitions
  db.version(1).stores({
    recipes: 'id',
    planner: 'dayKey',
    goals: 'id'
  });

  db.version(2).stores({
    recipes: 'id',
    planner: 'dayKey',
    goals: 'id',
    products: 'id, name, category'
  });

  // Seed on populate
  db.on('populate', () => {
    if (window.MacroChef.STARTER_RECIPES) {
      db.recipes.bulkAdd(window.MacroChef.STARTER_RECIPES);
    }
    if (window.MacroChef.DEFAULT_PLAN) {
      db.planner.bulkAdd(window.MacroChef.DEFAULT_PLAN);
    }
    if (window.MacroChef.DEFAULT_GOALS) {
      db.goals.add(window.MacroChef.DEFAULT_GOALS);
    }
    if (window.MacroChef.LIDL_PRODUCTS) {
      db.products.bulkAdd(window.MacroChef.LIDL_PRODUCTS);
    }
  });

  const dbService = {
    rawDb: db,

    async init() {
      await db.open();
      const count = await db.recipes.count();
      if (count === 0) {
        if (window.MacroChef.STARTER_RECIPES) {
          await db.recipes.bulkAdd(window.MacroChef.STARTER_RECIPES);
        }
        if (window.MacroChef.DEFAULT_PLAN) {
          await db.planner.bulkAdd(window.MacroChef.DEFAULT_PLAN);
        }
        if (window.MacroChef.DEFAULT_GOALS) {
          await db.goals.add(window.MacroChef.DEFAULT_GOALS);
        }
      }

      const prodCount = await db.products.count();
      if (prodCount === 0 && window.MacroChef.LIDL_PRODUCTS) {
        await db.products.bulkAdd(window.MacroChef.LIDL_PRODUCTS);
      }
    },

    async getAllRecipes() {
      return await db.recipes.toArray();
    },

    async saveRecipe(recipeData) {
      const isNew = !recipeData.id;
      const recipeToSave = isNew
        ? { ...recipeData, id: `rec-${Date.now()}` }
        : recipeData;
      await db.recipes.put(recipeToSave);
      return recipeToSave;
    },

    async deleteRecipe(id) {
      await db.recipes.delete(id);

      // Clean up planner references
      const allPlans = await db.planner.toArray();
      for (const day of allPlans) {
        let modified = false;
        ['Breakfast', 'Lunch', 'Dinner', 'Snack'].forEach((slot) => {
          if (day[slot] === id) {
            delete day[slot];
            modified = true;
          }
        });
        if (modified) {
          await db.planner.put(day);
        }
      }
    },

    async getPlannerMap() {
      const planArr = await db.planner.toArray();
      const planMap = {};
      planArr.forEach((item) => {
        planMap[item.dayKey] = {
          Breakfast: item.Breakfast || '',
          Lunch: item.Lunch || '',
          Dinner: item.Dinner || '',
          Snack: item.Snack || ''
        };
      });
      return planMap;
    },

    async savePlannerSlot(dayKey, currentDayPlan, mealType, recipeId) {
      const updatedDay = { ...(currentDayPlan || {}), [mealType]: recipeId };
      await db.planner.put({
        dayKey,
        ...updatedDay
      });
      return updatedDay;
    },

    async clearPlanner() {
      const days = window.MacroChef.DAYS_KEYS || [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ];
      const emptyArr = days.map((dayKey) => ({ dayKey }));
      await db.planner.clear();
      await db.planner.bulkAdd(emptyArr);

      const emptyMap = {};
      days.forEach((dayKey) => {
        emptyMap[dayKey] = {};
      });
      return emptyMap;
    },

    async getGoals() {
      const goals = await db.goals.get('user_goals');
      return goals || window.MacroChef.DEFAULT_GOALS;
    },

    async saveGoals(goals) {
      const toSave = { id: 'user_goals', ...goals };
      await db.goals.put(toSave);
      return toSave;
    },

    async getAllProducts() {
      const prods = await db.products.toArray();
      if (prods.length === 0 && window.MacroChef.LIDL_PRODUCTS) {
        return window.MacroChef.LIDL_PRODUCTS;
      }
      return prods;
    },

    async saveProduct(productData) {
      const isNew = !productData.id;
      const toSave = isNew
        ? { ...productData, id: `lidl-custom-${Date.now()}` }
        : productData;
      await db.products.put(toSave);
      return toSave;
    },

    async deleteProduct(id) {
      await db.products.delete(id);
    }
  };

  window.MacroChef.dbService = dbService;
})();
