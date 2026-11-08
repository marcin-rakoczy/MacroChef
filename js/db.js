// IndexedDB (Dexie.js) repositories for MacroChef
window.MacroChef = window.MacroChef || {};

(function () {
  const db = new Dexie('MacroChefDB');

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

  const seedInitialData = async () => {
    if (window.MacroChef.STARTER_RECIPES) {
      await db.recipes.bulkAdd(window.MacroChef.STARTER_RECIPES);
    }
    if (window.MacroChef.DEFAULT_PLAN) {
      await db.planner.bulkAdd(window.MacroChef.DEFAULT_PLAN);
    }
    if (window.MacroChef.DEFAULT_GOALS) {
      await db.goals.put(window.MacroChef.DEFAULT_GOALS);
    }
  };

  db.on('populate', async () => {
    await seedInitialData();
    if (window.MacroChef.LIDL_PRODUCTS) {
      await db.products.bulkAdd(window.MacroChef.LIDL_PRODUCTS);
    }
  });

  const repositories = {
    async initialize() {
      await db.open();
      if (await db.recipes.count() === 0) {
        await seedInitialData();
      }

      if (await db.products.count() === 0 && window.MacroChef.LIDL_PRODUCTS) {
        await db.products.bulkAdd(window.MacroChef.LIDL_PRODUCTS);
      }
    },

    recipes: {
      async getAll() {
        return await db.recipes.toArray();
      },

      async save(recipeData) {
        const recipeToSave = recipeData.id
          ? recipeData
          : { ...recipeData, id: `rec-${Date.now()}` };
        await db.recipes.put(recipeToSave);
        return recipeToSave;
      },

      async delete(id) {
        await db.transaction('rw', db.recipes, db.planner, async () => {
          await db.recipes.delete(id);
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
        });
      }
    },

    planner: {
      async getMap() {
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

      async saveSlot(dayKey, currentDayPlan, mealType, recipeId) {
        const updatedDay = { ...(currentDayPlan || {}), [mealType]: recipeId };
        await db.planner.put({ dayKey, ...updatedDay });
        return updatedDay;
      },

      async clear() {
        const days = window.MacroChef.DAYS_KEYS || [
          'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
        ];
        const emptyArr = days.map((dayKey) => ({ dayKey }));
        await db.transaction('rw', db.planner, async () => {
          await db.planner.clear();
          await db.planner.bulkAdd(emptyArr);
        });

        const emptyMap = {};
        days.forEach((dayKey) => {
          emptyMap[dayKey] = {};
        });
        return emptyMap;
      }
    },

    goals: {
      async get() {
        const goals = await db.goals.get('user_goals');
        return goals || window.MacroChef.DEFAULT_GOALS;
      },

      async save(goals) {
        const toSave = { id: 'user_goals', ...goals };
        await db.goals.put(toSave);
        return toSave;
      }
    },

    products: {
      async getAll() {
        const products = await db.products.toArray();
        if (products.length === 0 && window.MacroChef.LIDL_PRODUCTS) {
          return window.MacroChef.LIDL_PRODUCTS;
        }
        return products;
      },

      async save(productData) {
        const toSave = productData.id
          ? productData
          : { ...productData, id: `lidl-custom-${Date.now()}` };
        await db.products.put(toSave);
        return toSave;
      },

      async delete(id) {
        await db.products.delete(id);
      }
    }
  };

  window.MacroChef.repositories = repositories;
})();
