// Pure calculations for macros and daily goals
window.MacroChef = window.MacroChef || {};

window.MacroChef.macroCalculations = {
  getDailyTotals(dayKey, plan, recipes) {
    const dayPlan = (plan && plan[dayKey]) || {};
    const totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };

    Object.values(dayPlan).forEach((recipeId) => {
      if (!recipeId) return;
      const rec = (recipes || []).find((r) => r.id === recipeId);
      if (rec) {
        totals.calories += Number(rec.calories) || 0;
        totals.protein += Number(rec.protein) || 0;
        totals.carbs += Number(rec.carbs) || 0;
        totals.fats += Number(rec.fats) || 0;
      }
    });

    return totals;
  },

  calculateDistribution(goals) {
    const calories = Number(goals.calories) || 2000;
    const proteinKcal = (Number(goals.protein) || 0) * 4;
    const carbsKcal = (Number(goals.carbs) || 0) * 4;
    const fatsKcal = (Number(goals.fats) || 0) * 9;

    return {
      proteinKcal,
      carbsKcal,
      fatsKcal,
      proteinPercent: Math.round((proteinKcal / calories) * 100),
      carbsPercent: Math.round((carbsKcal / calories) * 100),
      fatsPercent: Math.round((fatsKcal / calories) * 100)
    };
  }
};

