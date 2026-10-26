// Recipe Picker Modal Component for selecting recipes from the library into the meal schedule
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;
  const { getLocalized } = window.MacroChef.helpers;

  function matchesCategory(recipeCat, targetCatKey) {
    if (!targetCatKey || targetCatKey === 'all') return true;
    if (!recipeCat) return false;
    const enVal = (typeof recipeCat === 'object' ? recipeCat.en : recipeCat) || '';
    const plVal = (typeof recipeCat === 'object' ? recipeCat.pl : recipeCat) || '';
    const targetLower = targetCatKey.toLowerCase();
    return (
      enVal.toLowerCase() === targetLower ||
      plVal.toLowerCase() === targetLower ||
      (targetLower === 'breakfast' && (enVal.toLowerCase().includes('breakfast') || plVal.toLowerCase().includes('śniadanie') || plVal.toLowerCase().includes('sniadanie'))) ||
      (targetLower === 'lunch' && (enVal.toLowerCase().includes('lunch') || plVal.toLowerCase().includes('obiad'))) ||
      (targetLower === 'dinner' && (enVal.toLowerCase().includes('dinner') || plVal.toLowerCase().includes('kolacja'))) ||
      (targetLower === 'snack' && (enVal.toLowerCase().includes('snack') || plVal.toLowerCase().includes('przekąska') || plVal.toLowerCase().includes('przekaska')))
    );
  }

  function RecipePickerModal({
    lang,
    t,
    slotInfo,
    recipes,
    onSelectRecipe,
    onClearSlot,
    onClose,
    onCreateRecipe
  }) {
    // Categories list for tabs
    const categoryOptions = [
      { key: 'all', label: t.allCategories || 'Wszystkie' },
      { key: 'Breakfast', label: t.breakfast || 'Śniadanie' },
      { key: 'Lunch', label: t.lunch || 'Obiad' },
      { key: 'Dinner', label: t.dinner || 'Kolacja' },
      { key: 'Snack', label: t.snack || 'Przekąska' }
    ];

    // Determine initial category based on slot
    const [selectedCategory, setSelectedCategory] = React.useState(() => {
      if (slotInfo && slotInfo.slotKey) {
        const hasMatching = recipes.some((r) => matchesCategory(r.category, slotInfo.slotKey));
        if (hasMatching) {
          return slotInfo.slotKey;
        }
      }
      return 'all';
    });

    const [searchQuery, setSearchQuery] = React.useState('');

    // Close on Escape key
    React.useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Filter recipes
    const filteredRecipes = React.useMemo(() => {
      return (recipes || []).filter((rec) => {
        // Category check
        if (!matchesCategory(rec.category, selectedCategory)) {
          return false;
        }

        // Search check
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const nameEn = (typeof rec.name === 'object' ? rec.name.en : rec.name) || '';
          const namePl = (typeof rec.name === 'object' ? rec.name.pl : rec.name) || '';
          const categoryName = getLocalized(rec.category, lang).toLowerCase();

          const matchesName = nameEn.toLowerCase().includes(query) || namePl.toLowerCase().includes(query) || categoryName.includes(query);
          
          const matchesIngredients = (rec.ingredients || []).some((ing) => {
            const ingEn = (typeof ing.name === 'object' ? ing.name.en : ing.name) || '';
            const ingPl = (typeof ing.name === 'object' ? ing.name.pl : ing.name) || '';
            return ingEn.toLowerCase().includes(query) || ingPl.toLowerCase().includes(query);
          });

          return matchesName || matchesIngredients;
        }

        return true;
      });
    }, [recipes, selectedCategory, searchQuery, lang]);

    // Count per category
    const categoryCounts = React.useMemo(() => {
      const counts = { all: (recipes || []).length };
      categoryOptions.forEach((cat) => {
        if (cat.key !== 'all') {
          counts[cat.key] = (recipes || []).filter((r) => matchesCategory(r.category, cat.key)).length;
        }
      });
      return counts;
    }, [recipes]);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/80 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="book-open" className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  <span>{t.selectRecipeFor || 'Wybierz przepis dla:'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {slotInfo.dayName} – {slotInfo.slotLabel}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t.selectRecipeSub || 'Przeglądaj bibliotekę przepisów i wybierz posiłek dla tego slotu.'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
              title={t.cancel || 'Zamknij'}
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Categories Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 space-y-3 bg-white dark:bg-slate-800">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Icon name="search" className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchRecipesPlaceholder || 'Szukaj po nazwie lub składnikach...'}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-slate-100 placeholder-slate-400"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {onCreateRecipe && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateRecipe();
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold transition-colors shrink-0"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" />
                  <span>{t.createRecipe || '+ Nowy przepis'}</span>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {categoryOptions.map((cat) => {
                const isActive = selectedCategory === cat.key;
                const count = categoryCounts[cat.key] || 0;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-emerald-600 text-emerald-100'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipe List / Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/20">
            {filteredRecipes.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Icon name="utensils" className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {t.noRecipesFound || 'Nie znaleziono przepisów spełniających kryteria.'}
                </h3>
                <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                  Spróbuj zmienić kategorię lub wyczyścić filtr wyszukiwania.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  {t.allCategories || 'Pokaż wszystkie przepisy'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecipes.map((rec) => {
                  const isCurrent = slotInfo.currentId === rec.id;
                  const localizedName = getLocalized(rec.name, lang);
                  const localizedCat = getLocalized(rec.category, lang);

                  return (
                    <div
                      key={rec.id}
                      onClick={() => onSelectRecipe(rec.id)}
                      className={`group cursor-pointer rounded-2xl p-4 transition-all flex flex-col justify-between border ${
                        isCurrent
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg'
                      }`}
                    >
                      <div>
                        {/* Top Meta */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            {localizedCat}
                          </span>
                          <div className="flex items-center gap-2">
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-600 text-white flex items-center gap-1">
                                <Icon name="check" className="w-3 h-3" />
                                <span>{t.currentlySelected || 'Wybrany'}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Icon name="clock" className="w-3 h-3" />
                              <span>{rec.prepTime}</span>
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2">
                          {localizedName}
                        </h3>

                        {/* Calories & Servings */}
                        <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 mb-3 text-xs">
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            <Icon name="flame" className="w-3.5 h-3.5" />
                            <span>{rec.calories} kcal</span>
                          </div>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <div className="text-slate-500 dark:text-slate-400">
                            {t.makes || 'Porcje'}: <strong className="text-slate-700 dark:text-slate-200">{rec.servings}</strong>
                          </div>
                        </div>

                        {/* Macros Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                          <div className="bg-slate-100 dark:bg-slate-700/40 p-1.5 rounded-lg">
                            <span className="block text-[9px] text-slate-400 uppercase font-semibold">{t.protein}</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-xs">{rec.protein}g</strong>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-700/40 p-1.5 rounded-lg">
                            <span className="block text-[9px] text-slate-400 uppercase font-semibold">{t.carbs}</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-xs">{rec.carbs}g</strong>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-700/40 p-1.5 rounded-lg">
                            <span className="block text-[9px] text-slate-400 uppercase font-semibold">{t.fats}</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-xs">{rec.fats}g</strong>
                          </div>
                        </div>

                        {/* Ingredients preview */}
                        {rec.ingredients && rec.ingredients.length > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{t.ingredients || 'Składniki'}: </span>
                            {rec.ingredients.map((ing) => `${getLocalized(ing.name, lang)} (${ing.amount}${ing.unit})`).join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Select Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecipe(rec.id);
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white group-hover:shadow-md group-hover:shadow-emerald-500/20'
                        }`}
                      >
                        <Icon name="check" className="w-3.5 h-3.5" />
                        <span>{isCurrent ? (t.currentlySelected || 'Aktualnie wybrany') : (t.selectThisRecipe || 'Wybierz ten przepis')}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/80 bg-white dark:bg-slate-800 flex items-center justify-between gap-3">
            <div>
              {slotInfo.currentId && (
                <button
                  type="button"
                  onClick={onClearSlot}
                  className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors font-medium"
                >
                  <Icon name="trash-2" className="w-3.5 h-3.5" />
                  <span>{t.clearSlot || 'Wyczyść posiłek z tego slotu'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              {t.cancel || 'Zamknij'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.MacroChef.components.RecipePickerModal = RecipePickerModal;
})();
