const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'nutrition', 'calculations.js'), 'utf8'),
  context
);
const nutrition = context.window.MacroChef.macroCalculations;
const plain = (value) => JSON.parse(JSON.stringify(value));
const profile = { age: 50, weight: 105, height: 180, sex: 'male', activityPal: '1.45' };
const original = JSON.stringify(profile);
const cpm = nutrition.calculateMaintenanceCalories(profile);
assert.equal(cpm, 2799);
assert.equal(nutrition.calculateMaintenanceCalories({ ...profile, sex: 'female' }), 2558);
assert.equal(nutrition.calculateMaintenanceCalories({ ...profile, age: 17 }), null);
assert.equal(nutrition.calculateMaintenanceCalories({ ...profile, weight: 0 }), null);
assert.equal(nutrition.calculateMaintenanceCalories({ ...profile, height: 301 }), null);
assert.equal(nutrition.calculateMaintenanceCalories({ ...profile, activityPal: '1.5' }), null);
assert.equal(nutrition.calculateMaintenanceCalories({ ...profile, sex: '' }), null);
assert.notEqual(nutrition.calculateMaintenanceCalories({
  age: 18, weight: 1, height: 50, sex: 'female', activityPal: '1.25'
}), null);
assert.notEqual(nutrition.calculateMaintenanceCalories({
  age: 120, weight: 500, height: 300, sex: 'male', activityPal: '2.2'
}), null);
assert.equal(nutrition.calculateRecommendedCalories(cpm, 'weightLoss', profile), 2299);
assert.equal(nutrition.calculateRecommendedCalories(cpm, 'muscleGain'), 3099);
assert.equal(nutrition.calculateRecommendedCalories(600, 'weightLoss', profile), 1930);
assert.equal(nutrition.calculateRecommendedCalories(null, 'maintenance'), null);
assert.deepEqual(plain(nutrition.calculateMacrosForGoal({
  calories: 2300, weight: 105, sex: 'male', userGoal: 'weightLoss'
}, cpm)), { protein: 210, carbs: 192, fats: 77 });
assert.deepEqual(plain(nutrition.calculateMacrosForGoal({
  calories: 2200, weight: 105, sex: 'female', userGoal: 'weightLoss'
}, cpm)), { protein: 210, carbs: 151, fats: 84 });
assert.deepEqual(plain(nutrition.calculateMacrosForGoal({
  calories: 2799, weight: 105, userGoal: 'maintenance'
}, cpm)), { protein: 179, carbs: 312, fats: 93 });
assert.deepEqual(plain(nutrition.calculateMacrosForGoal({
  calories: 3099, weight: 105, userGoal: 'muscleGain'
}, cpm)), { protein: 189, carbs: 415, fats: 76 });
assert.deepEqual(plain(nutrition.calculateMacrosForGoal({
  calories: 2000, protein: 90, carbs: 200, fats: 50, userGoal: 'healthyHabits'
}, cpm)), { protein: 90, carbs: 200, fats: 50 });
const goals = { calories: 2300, weight: 105, userGoal: 'weightLoss' };
const distribution = nutrition.calculateDistribution(goals, cpm);
assert.equal(distribution.totalKcal, 2301);
assert.equal(nutrition.calculateDistribution(goals, null).totalKcal, 0);
const plan = { Monday: { Breakfast: 'a', Lunch: 'a', Snack: 'missing' } };
const recipes = [{ id: 'a', calories: 300, protein: 20, carbs: 30, fats: 10 }];
const inputs = JSON.stringify({ plan, recipes, goals });
assert.deepEqual(plain(nutrition.getDailyTotals('Monday', plan, recipes)),
  { calories: 600, protein: 40, carbs: 60, fats: 20 });
assert.equal(JSON.stringify({ plan, recipes, goals }), inputs);
assert.equal(JSON.stringify(profile), original);
assert.deepEqual(plain(nutrition.calculateDistribution(goals, cpm)), plain(distribution));
console.log('PASS: nutrition calculations, validation, and input immutability');
