// Macro & Goals Tracker Tab Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;
  const { calculateDistribution } = window.MacroChef.macroCalculations;

  function MacroTracker({ t, goals, onSaveGoals }) {
    const dist = calculateDistribution(goals);

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            <Icon name="pie-chart" className="w-5 h-5 text-emerald-500" />
            <span>{t.macroGoalsTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            {t.macroGoalsSub}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.dailyCalorieTarget}
              </label>
              <input
                type="number"
                min="500"
                max="10000"
                value={goals.calories}
                onChange={(e) =>
                  onSaveGoals({ ...goals, calories: Number(e.target.value) || 0 })
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.proteinGoal}
                </label>
                <input
                  type="number"
                  min="0"
                  value={goals.protein}
                  onChange={(e) =>
                    onSaveGoals({ ...goals, protein: Number(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.carbsGoal}
                </label>
                <input
                  type="number"
                  min="0"
                  value={goals.carbs}
                  onChange={(e) =>
                    onSaveGoals({ ...goals, carbs: Number(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.fatsGoal}
                </label>
                <input
                  type="number"
                  min="0"
                  value={goals.fats}
                  onChange={(e) =>
                    onSaveGoals({ ...goals, fats: Number(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              {t.macroDist}
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  {t.protein}
                </span>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {dist.proteinKcal} kcal
                </div>
                <span className="text-[11px] text-slate-400">
                  {dist.proteinPercent}% {t.ofDailyTotal}
                </span>
              </div>

              <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase">
                  {t.carbs}
                </span>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {dist.carbsKcal} kcal
                </div>
                <span className="text-[11px] text-slate-400">
                  {dist.carbsPercent}% {t.ofDailyTotal}
                </span>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                  {t.fats}
                </span>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {dist.fatsKcal} kcal
                </div>
                <span className="text-[11px] text-slate-400">
                  {dist.fatsPercent}% {t.ofDailyTotal}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.MacroChef.components.MacroTracker = MacroTracker;
})();

