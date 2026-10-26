// Recipe Library Tab Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;
  const { getLocalized } = window.MacroChef.helpers;

  function RecipeLibrary({
    t,
    lang,
    recipes,
    onCreateRecipe,
    onEditRecipe,
    onDeleteRecipe,
    onStartBatchCooking
  }) {
    const handleDelete = (recipe) => {
      const name = getLocalized(recipe.name, lang);
      if (window.confirm(`${t.confirmDelete} (${name})`)) {
        onDeleteRecipe(recipe.id);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="book-open" className="w-5 h-5 text-emerald-500" />
              <span>{t.recipes}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.recipeSub}
            </p>
          </div>

          <button
            onClick={onCreateRecipe}
            className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>{t.createRecipe}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {getLocalized(rec.category, lang)}
                  </span>
                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                    <Icon name="clock" className="w-3.5 h-3.5" />
                    <span>{rec.prepTime}</span>
                  </div>
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">
                  {getLocalized(rec.name, lang)}
                </h3>

                <div className="flex items-center gap-3 my-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
                    <Icon name="flame" className="w-4 h-4" />
                    <span>{rec.calories} kcal</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {t.makes}{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {rec.servings} {t.servings}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                  <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
                    <span className="block text-[10px] text-slate-400 uppercase">{t.protein}</span>
                    <strong className="text-slate-800 dark:text-slate-200">{rec.protein}g</strong>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
                    <span className="block text-[10px] text-slate-400 uppercase">{t.carbs}</span>
                    <strong className="text-slate-800 dark:text-slate-200">{rec.carbs}g</strong>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
                    <span className="block text-[10px] text-slate-400 uppercase">{t.fats}</span>
                    <strong className="text-slate-800 dark:text-slate-200">{rec.fats}g</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => onStartBatchCooking(rec)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 py-2 rounded-xl transition-colors"
                >
                  <Icon name="utensils" className="w-3.5 h-3.5" />
                  <span>{t.cookBatch}</span>
                </button>

                <button
                  onClick={() => onEditRecipe(rec)}
                  className="p-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                  title={t.editRecipe}
                >
                  {t.editRecipe}
                </button>

                <button
                  onClick={() => handleDelete(rec)}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl"
                  title={t.deleteRecipe}
                >
                  <Icon name="trash-2" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  window.MacroChef.components.RecipeLibrary = RecipeLibrary;
})();

