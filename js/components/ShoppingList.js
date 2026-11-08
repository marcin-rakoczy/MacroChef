// Smart Zero-Waste Shopping List Tab Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;

  function ShoppingList({
    shoppingList,
    checkedShopping,
    onToggleCheck,
    onUncheckAll
  }) {
    const { t } = window.MacroChef.useI18n();
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="shopping-bag" className="w-5 h-5 text-emerald-500" />
              <span>{t.shoppingTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.shoppingSub}
            </p>
          </div>

          <button
            onClick={onUncheckAll}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
          >
            {t.uncheckAll}
          </button>
        </div>

        {shoppingList.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of items */}
            <div className="lg:col-span-2 space-y-3">
              {shoppingList.map((item, idx) => {
                const isChecked = !!checkedShopping[item.name];

                return (
                  <div
                    key={idx}
                    onClick={() => onToggleCheck(item.name)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-between select-none ${
                      isChecked
                        ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        className="text-emerald-500 focus:outline-none"
                      >
                        <Icon
                          name={isChecked ? 'check-circle-2' : 'circle'}
                          className="w-5 h-5"
                        />
                      </button>

                      <div>
                        <span
                          className={`font-semibold text-sm block ${
                            isChecked
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {t.usedIn}: {item.recipesUsedIn.join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {t.buy} {item.packagesNeeded} {t.pkg} ({item.packagesNeeded * item.packageSize} {item.packageUnit})
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t.recipeNeeds}: {Math.round(item.totalRequired)} {item.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zero Waste Metric Sidebar */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg h-fit space-y-4">
              <div className="flex items-center space-x-2">
                <Icon name="sparkles" className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">{t.zeroWasteInsights}</h3>
              </div>

              <p className="text-xs text-teal-100 leading-relaxed">
                {t.zeroWasteDesc}
              </p>

              <div className="space-y-2 pt-2">
                {shoppingList
                  .filter((i) => i.leftoverAmount > 0)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white/15 backdrop-blur-md p-2.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-white">{item.name}</span>
                      <span className="font-bold text-amber-200">
                        +{Math.round(item.leftoverAmount)} {item.unit} {t.surplus}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="pt-3 text-[11px] text-teal-100 border-t border-white/20 flex items-center justify-between">
                <span>{t.totalUniqueItems}:</span>
                <strong className="text-white text-xs">{shoppingList.length}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Icon name="shopping-bag" className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {t.shoppingEmpty}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t.shoppingEmptySub}
            </p>
          </div>
        )}
      </div>
    );
  }

  window.MacroChef.components.ShoppingList = ShoppingList;
})();
