// Weekly Meal Planner Tab Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;
  const { getLocalized } = window.MacroChef.helpers;
  const { getDailyTotals } = window.MacroChef.macroCalculations;

  function MealPlanner({
    t,
    lang,
    daysList,
    daysKeys,
    plan,
    recipes,
    goals,
    onAssignMeal,
    onClearWeek
  }) {
    const mealSlots = [
      { key: 'Breakfast', label: t.breakfast },
      { key: 'Lunch', label: t.lunch },
      { key: 'Dinner', label: t.dinner },
      { key: 'Snack', label: t.snack }
    ];

    return (
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="calendar" className="w-5 h-5 text-emerald-500" />
              <span>{t.weeklySchedule}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.weeklySub}
            </p>
          </div>

          <button
            onClick={onClearWeek}
            className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors"
          >
            <Icon name="rotate-ccw" className="w-3.5 h-3.5" />
            <span>{t.clearWeek}</span>
          </button>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {daysKeys.map((dayKey, idx) => {
            const dayNameDisplay = daysList[idx];
            const totals = getDailyTotals(dayKey, plan, recipes);
            const calPercent = Math.min(100, Math.round((totals.calories / (goals.calories || 2000)) * 100));

            return (
              <div
                key={dayKey}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 mb-3">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{dayNameDisplay}</span>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {totals.calories} / {goals.calories} kcal
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full transition-all duration-300 ${
                        calPercent > 105
                          ? 'bg-amber-500'
                          : calPercent > 90
                          ? 'bg-emerald-500'
                          : 'bg-teal-400'
                      }`}
                      style={{ width: `${calPercent}%` }}
                    />
                  </div>

                  {/* Meal Slots */}
                  <div className="space-y-3">
                    {mealSlots.map((slot) => {
                      const assignedId = plan[dayKey]?.[slot.key];
                      const recipe = recipes.find((r) => r.id === assignedId);

                      return (
                        <div
                          key={slot.key}
                          className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                            <span>{slot.label}</span>
                            {recipe && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {recipe.calories} kcal
                              </span>
                            )}
                          </div>

                          <select
                            value={assignedId || ''}
                            onChange={(e) => onAssignMeal(dayKey, slot.key, e.target.value)}
                            className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-slate-200"
                          >
                            <option value="">{t.addMeal}</option>
                            {recipes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {getLocalized(r.name, lang)} ({r.calories} kcal)
                              </option>
                            ))}
                          </select>

                          {recipe && (
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
                              <span>
                                B: {recipe.protein}g | W: {recipe.carbs}g | T: {recipe.fats}g
                              </span>
                              <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1">
                                <Icon name="clock" className="w-3 h-3" />
                                <span>{recipe.prepTime}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{t.macrosTotal}:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    B:{totals.protein}g | W:{totals.carbs}g | T:{totals.fats}g
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  window.MacroChef.components.MealPlanner = MealPlanner;
})();

