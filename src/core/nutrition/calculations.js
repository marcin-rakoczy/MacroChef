// Pure calculations for macros and daily goals
window.MacroChef = window.MacroChef || {};

(function () {
const macroCalculations = {
  calculateMaintenanceCalories(goals) {
    const age = Number(goals.age);
    const weight = Number(goals.weight);
    const height = Number(goals.height);
    const activity = String(goals.activityPal);
    if (!Number.isFinite(age) || age < 18 || age > 120 ||
        !Number.isFinite(weight) || weight <= 0 || weight > 500 ||
        !Number.isFinite(height) || height < 50 || height > 300 ||
        (goals.sex !== 'female' && goals.sex !== 'male') ||
        !['1.25', '1.45', '1.65', '1.85', '2.2'].includes(activity)) {
      return null;
    }
    return Math.round((10 * weight + 6.25 * height - 5 * age +
      (goals.sex === 'female' ? -161 : 5)) * Number(activity));
  },

  calculateRecommendedCalories(cpm, userGoal) {
    if (cpm === null) return null;
    const adjustments = { weightLoss: -500, muscleGain: 300, maintenance: 0, healthyHabits: 0 };
    return Math.max(500, cpm + (adjustments[userGoal] || 0));
  },

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

  calculateMacrosForGoal(goals, cpm) {
    const calories = Number(goals.calories) || 2000;
    const weight = Number(goals.weight) || 70;
    const sex = goals.sex || 'male';
    const userGoal = goals.userGoal || '';

    let protein = 0;
    let fats = 0;
    let carbs = 0;

    if (userGoal === 'weightLoss') {
      // Weight loss: protein 2g/kg, fats 30% of calories, carbs fill remainder
      protein = Math.round(weight * 2);
      fats = Math.round((calories * 0.30) / 9);
      
      // Safety check for women: minimum 0.8g/kg
      if (sex === 'female' && fats < weight * 0.8) {
        fats = Math.round(weight * 0.8);
      }
      
      const usedCalories = protein * 4 + fats * 9;
      carbs = Math.max(0, Math.round((calories - usedCalories) / 4));
    } else if (userGoal === 'maintenance') {
      // Maintenance: protein 1.6-1.8g/kg (use 1.7), fats 30%, carbs fill remainder
      protein = Math.round(weight * 1.7);
      fats = Math.round((calories * 0.30) / 9);
      
      const usedCalories = protein * 4 + fats * 9;
      carbs = Math.max(0, Math.round((calories - usedCalories) / 4));
    } else if (userGoal === 'muscleGain') {
      // Muscle gain: protein 1.8g/kg, fats 20-25% (use 22%), carbs 50-55% (use 53%)
      protein = Math.round(weight * 1.8);
      fats = Math.round((calories * 0.22) / 9);
      
      const usedCalories = protein * 4 + fats * 9;
      carbs = Math.max(0, Math.round((calories - usedCalories) / 4));
    } else {
      // Healthy habits: no automatic adjustment, use input values
      protein = Number(goals.protein) || 0;
      carbs = Number(goals.carbs) || 0;
      fats = Number(goals.fats) || 0;
    }

    // Ensure sum equals calorie goal (adjust carbs for rounding)
    const calculatedCalories = protein * 4 + carbs * 4 + fats * 9;
    if (calculatedCalories !== calories && userGoal !== 'healthyHabits') {
      const difference = calories - (protein * 4 + fats * 9);
      carbs = Math.round(difference / 4);
    }

    return { protein, carbs, fats };
  },

  calculateDistribution(goals, cpm) {
    const calories = Number(goals.calories) || 2000;
    let protein = Number(goals.protein) || 0;
    let carbs = Number(goals.carbs) || 0;
    let fats = Number(goals.fats) || 0;

    // If a goal is selected and we have CPM, recalculate macros
    if (goals.userGoal && goals.userGoal !== 'healthyHabits' && cpm) {
      const calculated = macroCalculations.calculateMacrosForGoal(goals, cpm);
      protein = calculated.protein;
      carbs = calculated.carbs;
      fats = calculated.fats;
    }

    const proteinKcal = protein * 4;
    const carbsKcal = carbs * 4;
    const fatsKcal = fats * 9;

    return {
      protein,
      carbs,
      fats,
      proteinKcal,
      carbsKcal,
      fatsKcal,
      proteinPercent: calories > 0 ? Math.round((proteinKcal / calories) * 100) : 0,
      carbsPercent: calories > 0 ? Math.round((carbsKcal / calories) * 100) : 0,
      fatsPercent: calories > 0 ? Math.round((fatsKcal / calories) * 100) : 0,
      totalKcal: proteinKcal + carbsKcal + fatsKcal
    };
  }
};
window.MacroChef.macroCalculations = Object.freeze(macroCalculations);
})();
