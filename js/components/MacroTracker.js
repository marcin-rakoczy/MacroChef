// Macro & Goals Tracker Tab Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;
  const activities = [
    { pal: '1.25', label: 'activitySedentary', description: 'activitySedentaryDesc' },
    { pal: '1.45', label: 'activityLow', description: 'activityLowDesc' },
    { pal: '1.65', label: 'activityModerate', description: 'activityModerateDesc' },
    { pal: '1.85', label: 'activityHigh', description: 'activityHighDesc' },
    { pal: '2.2', label: 'activityVeryHigh', description: 'activityVeryHighDesc' }
  ];
  const { calculateMaintenanceCalories, calculateRecommendedCalories, calculateDistribution } =
    window.MacroChef.macroCalculations;

  function MacroTracker({ goals, onSaveGoals }) {
    const { t, lang } = window.MacroChef.useI18n();
    const selectedActivity = activities.find(
      (activity) => activity.pal === String(goals.activityPal)
    );
    const cpm = calculateMaintenanceCalories(goals);
    const userGoal = goals.userGoal || '';
    const recommendedCalories = calculateRecommendedCalories(cpm, userGoal);
    const goalDescription = {
      weightLoss: 'weightLossDesc',
      muscleGain: 'muscleGainDesc',
      maintenance: 'maintenanceDesc',
      healthyHabits: 'healthyHabitsDesc'
    }[userGoal];

    const dist = calculateDistribution(goals, cpm);

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
            <section className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.userGoal}
              </label>
              <select
                value={userGoal}
                onChange={(e) => onSaveGoals({ ...goals, userGoal: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">{t.selectUserGoal}</option>
                <option value="weightLoss">{t.weightLoss}</option>
                <option value="muscleGain">{t.muscleGain}</option>
                <option value="maintenance">{t.maintenance}</option>
                <option value="healthyHabits">{t.healthyHabits}</option>
              </select>
              {goalDescription && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t[goalDescription]}
                </p>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t.userProfile}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.age}
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={goals.age}
                    onChange={(e) => onSaveGoals({ ...goals, age: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.weight}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="0.1"
                    value={goals.weight}
                    onChange={(e) => onSaveGoals({ ...goals, weight: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.height}
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="300"
                    value={goals.height}
                    onChange={(e) => onSaveGoals({ ...goals, height: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.sex}
                  </label>
                  <select
                    value={goals.sex}
                    onChange={(e) => onSaveGoals({ ...goals, sex: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t.selectSex}</option>
                    <option value="female">{t.female}</option>
                    <option value="male">{t.male}</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.activityLevel}
                  </label>
                  <select
                    value={goals.activityPal}
                    onChange={(e) =>
                      onSaveGoals({ ...goals, activityPal: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t.selectActivity}</option>
                    {activities.map((activity) => (
                      <option key={activity.pal} value={activity.pal}>
                        {t[activity.label]}
                      </option>
                    ))}
                  </select>
                  {selectedActivity && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {t[selectedActivity.description]}
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {t.cpmEstimate}
                    </p>
                    {cpm !== null ? (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t.maintenanceCalories}:{' '}
                          {cpm.toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-US')} kcal
                        </p>
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                          {t.recommendedCalories}:{' '}
                          {recommendedCalories.toLocaleString(
                            lang === 'pl' ? 'pl-PL' : 'en-US'
                          )}{' '}
                          kcal
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t.completeProfile}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t.cpmMethod}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={recommendedCalories === null}
                    onClick={() =>
                      onSaveGoals({ ...goals, calories: recommendedCalories })
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.useRecommendedCalories}
                  </button>
                </div>
              </div>
            </section>

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
                  value={userGoal && userGoal !== 'healthyHabits' ? dist.protein : goals.protein}
                  onChange={(e) =>
                    onSaveGoals({ ...goals, protein: Number(e.target.value) || 0 })
                  }
                  disabled={userGoal && userGoal !== 'healthyHabits'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {userGoal && userGoal !== 'healthyHabits' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t.autoCalculatedFromGoal}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.carbsGoal}
                </label>
                <input
                  type="number"
                  min="0"
                  value={userGoal && userGoal !== 'healthyHabits' ? dist.carbs : goals.carbs}
                  onChange={(e) =>
                    onSaveGoals({ ...goals, carbs: Number(e.target.value) || 0 })
                  }
                  disabled={userGoal && userGoal !== 'healthyHabits'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {userGoal && userGoal !== 'healthyHabits' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t.autoCalculatedFromGoal}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.fatsGoal}
                </label>
                <input
                  type="number"
                  min="0"
                  value={userGoal && userGoal !== 'healthyHabits' ? dist.fats : goals.fats}
                  onChange={(e) =>
                    onSaveGoals({ ...goals, fats: Number(e.target.value) || 0 })
                  }
                  disabled={userGoal && userGoal !== 'healthyHabits'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {userGoal && userGoal !== 'healthyHabits' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t.autoCalculatedFromGoal}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              {t.macroDist}
            </h3>

            <div className="mb-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                {t.totalCalories}
              </span>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {dist.totalKcal} / {Number(goals.calories) || 2000} kcal
              </div>
              {Math.abs(dist.totalKcal - (Number(goals.calories) || 2000)) > 5 && (
                <span className="text-[11px] text-red-500 dark:text-red-400">
                  ⚠ {t.caloriesMismatch}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  {t.protein}
                </span>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {dist.protein} g
                </div>
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
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {dist.carbs} g
                </div>
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
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {dist.fats} g
                </div>
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
