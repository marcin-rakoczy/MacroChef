// Weekly Meal Planner Tab Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon, RecipePickerModal } = window.MacroChef.components;
  const { getLocalized } = window.MacroChef.helpers;
  const { getDailyTotals } = window.MacroChef.macroCalculations;

  function MealPlanner({
    daysKeys,
    plan,
    recipes,
    goals,
    onAssignMeal,
    onClearWeek,
    onCreateRecipe
  }) {
    const { t, lang, daysList } = window.MacroChef.useI18n();
    // Active slot being picked: { dayKey, dayName, slotKey, slotLabel, currentId }
    const [pickerSlot, setPickerSlot] = React.useState(null);

    const mealSlots = [
      { key: 'Breakfast', label: t.breakfast },
      { key: 'Lunch', label: t.lunch },
      { key: 'Dinner', label: t.dinner },
      { key: 'Snack', label: t.snack }
    ];

    const handleOpenPicker = (dayKey, dayName, slotKey, slotLabel, currentId) => {
      setPickerSlot({
        dayKey,
        dayName,
        slotKey,
        slotLabel,
        currentId: currentId || ''
      });
    };

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
                          className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80"
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                            <span>{slot.label}</span>
                            {recipe && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {recipe.calories} kcal
                              </span>
                            )}
                          </div>

                          {!recipe ? (
                            /* Empty Slot: Clickable button to open Recipe Library */
                            <button
                              type="button"
                              onClick={() => handleOpenPicker(dayKey, dayNameDisplay, slot.key, slot.label, '')}
                              className="w-full group py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white/70 dark:bg-slate-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer shadow-none hover:shadow-sm"
                            >
                              <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Icon name="plus" className="w-3.5 h-3.5" />
                              </div>
                              <span className="truncate">{t.selectFromLibrary || 'Wybierz z biblioteki'}</span>
                            </button>
                          ) : (
                            /* Filled Slot: Card displaying recipe with change & remove options */
                            <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors">
                              <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPicker(dayKey, dayNameDisplay, slot.key, slot.label, assignedId)}
                                  className="text-left font-bold text-xs text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-1 transition-colors"
                                  title={getLocalized(recipe.name, lang)}
                                >
                                  {getLocalized(recipe.name, lang)}
                                </button>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPicker(dayKey, dayNameDisplay, slot.key, slot.label, assignedId)}
                                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title={t.changeRecipe || 'Zmień'}
                                  >
                                    <Icon name="book-open" className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onAssignMeal(dayKey, slot.key, '')}
                                    className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    title={t.removeMeal || 'Usuń'}
                                  >
                                    <Icon name="trash-2" className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                  B: {recipe.protein}g | W: {recipe.carbs}g | T: {recipe.fats}g
                                </span>
                                <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 shrink-0">
                                  <Icon name="clock" className="w-3 h-3" />
                                  <span>{recipe.prepTime}</span>
                                </span>
                              </div>
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

        {/* Recipe Picker Modal from Recipe Library */}
        {pickerSlot && (
          <RecipePickerModal
            slotInfo={pickerSlot}
            recipes={recipes}
            onSelectRecipe={(recipeId) => {
              onAssignMeal(pickerSlot.dayKey, pickerSlot.slotKey, recipeId);
              setPickerSlot(null);
            }}
            onClearSlot={() => {
              onAssignMeal(pickerSlot.dayKey, pickerSlot.slotKey, '');
              setPickerSlot(null);
            }}
            onClose={() => setPickerSlot(null)}
            onCreateRecipe={onCreateRecipe}
          />
        )}
      </div>
    );
  }

  window.MacroChef.components.MealPlanner = MealPlanner;
})();
