// Default initial weekly plan
window.MacroChef = window.MacroChef || {};

window.MacroChef.DEFAULT_PLAN = [
  { dayKey: 'Monday', Breakfast: 'rec-2', Lunch: 'rec-1', Dinner: 'rec-3', Snack: 'rec-4' },
  { dayKey: 'Tuesday', Breakfast: 'rec-2', Lunch: 'rec-1', Dinner: 'rec-3', Snack: 'rec-4' },
  { dayKey: 'Wednesday', Breakfast: 'rec-2', Lunch: 'rec-1', Dinner: 'rec-3', Snack: 'rec-4' },
  { dayKey: 'Thursday', Breakfast: 'rec-2', Lunch: 'rec-1' },
  { dayKey: 'Friday', Breakfast: 'rec-2', Lunch: 'rec-1' },
  { dayKey: 'Saturday' },
  { dayKey: 'Sunday' }
];

window.MacroChef.DEFAULT_GOALS = {
  id: 'user_goals',
  calories: 2200,
  protein: 160,
  carbs: 220,
  fats: 70,
  age: '',
  weight: '',
  height: '',
  sex: '',
  activityPal: '',
  userGoal: ''
};

