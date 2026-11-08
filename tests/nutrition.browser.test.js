(function () {
  const { assert, equal, test, run } = window.MacroChefTests;
  const nutrition = window.MacroChef.macroCalculations;
  const profile = { age: 50, weight: 105, height: 180, sex: 'male', activityPal: '1.45' };

  [
    { sex: 'male', age: 50, expected: 2799 },
    { sex: 'female', age: 50, expected: 2558 },
    { sex: 'male', age: 18, expected: 3031 },
    { sex: 'female', age: 120, expected: 2050 }
  ].forEach(({ sex, age, expected }) => {
    test(`Mifflin-St Jeor CPM: ${sex}, age ${age}`, () => {
      const input = { ...profile, sex, age };
      const before = JSON.stringify(input);
      const actual = nutrition.calculateMaintenanceCalories(input);
      equal(actual, expected, 'CPM');
      equal(JSON.stringify(input), before, 'Input must remain unchanged');
    });
  });

  [17, 121].forEach((age) => {
    test(`Reject age ${age}`, () => {
      equal(nutrition.calculateMaintenanceCalories({ ...profile, age }), null, 'Invalid profile');
    });
  });

  test('Extreme body weight: Mifflin-St Jeor CPM', () => {
    const goals = { age: 50, weight: 500, height: 180, sex: 'male', activityPal: '1.25' };
    const cpm = nutrition.calculateMaintenanceCalories(goals);
    equal(cpm, 7350, 'CPM');
  });

  [
    { goal: 'weightLoss', calories: 2299, protein: 210, carbs: 192, fats: 77 },
    { goal: 'maintenance', calories: 2799, protein: 179, carbs: 312, fats: 93 },
    { goal: 'muscleGain', calories: 3099, protein: 189, carbs: 415, fats: 76 }
  ].forEach((scenario) => {
    test(`Macro grams and calories: ${scenario.goal}`, () => {
      const goals = { ...profile, calories: scenario.calories, userGoal: scenario.goal };
      const cpm = nutrition.calculateMaintenanceCalories(goals);
      const distribution = nutrition.calculateDistribution(goals, cpm);
      equal(distribution.protein, scenario.protein, 'Protein grams');
      equal(distribution.carbs, scenario.carbs, 'Carbohydrate grams');
      equal(distribution.fats, scenario.fats, 'Fat grams');
      equal(distribution.proteinKcal, scenario.protein * 4, 'Protein kcal');
      equal(distribution.carbsKcal, scenario.carbs * 4, 'Carbohydrate kcal');
      equal(distribution.fatsKcal, scenario.fats * 9, 'Fat kcal');
      assert(Math.abs(distribution.totalKcal - scenario.calories) <= 2, 'Rounding exceeds 2 kcal');
    });
  });

  test('Female weight-loss minimum fat calculation', () => {
    const goals = { ...profile, sex: 'female', calories: 2200, userGoal: 'weightLoss' };
    const macros = nutrition.calculateMacrosForGoal(goals, 2558);
    equal(macros.protein, 210, 'Protein grams');
    equal(macros.fats, 84, 'Fat grams');
    equal(macros.carbs, 151, 'Carbohydrate grams');
  });

  test('Weight-loss recommendation stays at or above PPM', () => {
    const goals = { age: 30, weight: 100, height: 180, sex: 'male', activityPal: '1.25' };
    const ppm = 10 * goals.weight + 6.25 * goals.height - 5 * goals.age + 5;
    const cpm = nutrition.calculateMaintenanceCalories(goals);
    const recommended = nutrition.calculateRecommendedCalories(cpm, 'weightLoss', goals);
    assert(recommended >= ppm, `Suggested ${recommended} kcal is below PPM ${ppm} kcal`);
  });

  test('Fractional PPM rounds the minimum upwards', () => {
    const goals = { age: 30, weight: 100, height: 181, sex: 'female', activityPal: '1.25' };
    const ppm = nutrition.calculateBasalCalories(goals);
    const cpm = nutrition.calculateMaintenanceCalories(goals);
    equal(nutrition.calculateRecommendedCalories(cpm, 'weightLoss', goals), Math.ceil(ppm), 'Minimum');
  });

  test('Weight loss requires a valid profile', () => {
    let failed = false;
    try { nutrition.calculateRecommendedCalories(2000, 'weightLoss'); }
    catch (error) { failed = error instanceof TypeError; }
    assert(failed, 'Missing profile was accepted');
  });

  ['weightLoss', 'maintenance', 'muscleGain'].forEach((userGoal) => {
    test(`Extreme weight never produces negative macro grams: ${userGoal}`, () => {
      const goals = { age: 120, weight: 500, height: 50, sex: 'female', activityPal: '1.25',
        calories: 500, userGoal };
      const cpm = nutrition.calculateMaintenanceCalories(goals);
      const macros = nutrition.calculateMacrosForGoal(goals, cpm);
      assert(Object.values(macros).every((value) => value >= 0),
        `Negative macro value: ${JSON.stringify(macros)}`);
      const distribution = nutrition.calculateDistribution(goals, cpm);
      assert(distribution.totalKcal > goals.calories, 'Infeasible target must remain visible');
    });
  });

  run();
})();
