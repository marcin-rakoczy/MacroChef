// Batch Cooking Assistant Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;
  const { getLocalized } = window.MacroChef.helpers;

  function BatchCooking({
    t,
    lang,
    recipes,
    selectedRecipe,
    onSelectRecipe,
    batchStep,
    setBatchStep
  }) {
    const stepsList = selectedRecipe
      ? getLocalized(selectedRecipe.steps, lang) || []
      : [];
    const totalSteps = stepsList.length || 1;
    const progressPercent = Math.min(
      100,
      Math.round(((batchStep + 1) / totalSteps) * 100)
    );

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Header & Recipe Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Icon name="utensils" className="w-5 h-5 text-emerald-500" />
                <span>{t.batchTitle}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.batchSub}
              </p>
            </div>

            <select
              value={selectedRecipe?.id || ''}
              onChange={(e) => {
                const found = recipes.find((r) => r.id === e.target.value);
                onSelectRecipe(found || null);
                setBatchStep(0);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
            >
              <option value="">{t.selectRecipe}</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {getLocalized(r.name, lang)} ({r.servings} {t.servings})
                </option>
              ))}
            </select>
          </div>

          {selectedRecipe ? (
            <div className="space-y-6">
              {/* Recipe Meta Banner */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    {getLocalized(selectedRecipe.name, lang)}
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {t.yields} {selectedRecipe.servings} {t.readyMeals} ({selectedRecipe.calories} kcal)
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Icon name="clock" className="w-4 h-4 text-emerald-500" />
                  <span>{selectedRecipe.prepTime}</span>
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>
                  {t.step} {batchStep + 1} {t.of} {totalSteps}
                </span>
                <span>{progressPercent}% {t.complete}</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Current Step Instruction Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl min-h-[160px] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    {t.step} {batchStep + 1}
                  </span>
                  <p className="text-base sm:text-lg text-slate-800 dark:text-slate-100 font-medium mt-2 leading-relaxed">
                    {stepsList[batchStep]}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                  <button
                    disabled={batchStep === 0}
                    onClick={() => setBatchStep((s) => Math.max(0, s - 1))}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-100 transition-colors"
                  >
                    {t.prevStep}
                  </button>

                  {batchStep < totalSteps - 1 ? (
                    <button
                      onClick={() => setBatchStep((s) => s + 1)}
                      className="px-5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>{t.nextStep}</span>
                      <Icon name="chevron-right" className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-3 py-2 rounded-xl">
                      <Icon name="check-circle-2" className="w-4 h-4" />
                      <span>{t.completeMsg}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Batch Ingredients Breakdown */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {t.neededForBatch} ({selectedRecipe.servings} {t.servings}):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedRecipe.ingredients || []).map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/70 p-2.5 rounded-xl text-xs"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {getLocalized(ing.name, lang)}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {ing.amount} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Icon name="chef-hat" className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
              <p className="text-sm font-medium">{t.selectRecipePrompt}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.MacroChef.components.BatchCooking = BatchCooking;
})();

