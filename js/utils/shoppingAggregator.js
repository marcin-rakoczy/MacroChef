// Aggregation engine for whole-package shopping lists & food waste reduction
window.MacroChef = window.MacroChef || {};

window.MacroChef.shoppingAggregator = {
  getRecipePlanCounts(plan) {
    const counts = {};
    if (!plan) return counts;
    Object.values(plan).forEach((dayMeals) => {
      if (!dayMeals) return;
      Object.values(dayMeals).forEach((recipeId) => {
        if (recipeId) {
          counts[recipeId] = (counts[recipeId] || 0) + 1;
        }
      });
    });
    return counts;
  },

  calculateShoppingList(plan, recipes, lang) {
    const { getLocalized } = window.MacroChef.helpers;
    const recipePlanCounts = this.getRecipePlanCounts(plan);
    const map = {};

    Object.entries(recipePlanCounts).forEach(([recipeId, timesPlanned]) => {
      const rec = (recipes || []).find((r) => r.id === recipeId);
      if (!rec || !rec.ingredients) return;

      const scaleFactor = timesPlanned / (rec.servings || 1);

      rec.ingredients.forEach((ing) => {
        const ingName = getLocalized(ing.name, lang);
        const key = ingName.toLowerCase().trim();
        const requiredAmount = (Number(ing.amount) || 0) * scaleFactor;
        const pkgSize = Number(ing.packageSize) || Number(ing.amount) || 1;

        if (!map[key]) {
          map[key] = {
            name: ingName,
            totalRequired: 0,
            unit: ing.unit || 'g',
            packageSize: pkgSize,
            packageUnit: ing.packageUnit || ing.unit || 'g',
            recipesUsedIn: new Set()
          };
        }

        map[key].totalRequired += requiredAmount;
        map[key].recipesUsedIn.add(getLocalized(rec.name, lang));
      });
    });

    return Object.values(map).map((item) => {
      const packagesNeeded = Math.ceil(item.totalRequired / item.packageSize) || 1;
      const totalBoughtAmount = packagesNeeded * item.packageSize;
      const leftoverAmount = Math.max(0, totalBoughtAmount - item.totalRequired);

      return {
        ...item,
        packagesNeeded,
        totalBoughtAmount,
        leftoverAmount,
        recipesUsedIn: Array.from(item.recipesUsedIn)
      };
    });
  }
};

