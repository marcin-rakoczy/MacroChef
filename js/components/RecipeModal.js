// Recipe Form Modal Component for Creating/Editing Recipes
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;
  const { getLocalized } = window.MacroChef.helpers;

  function RecipeModal({ lang, t, editingRecipe, onClose, onSave }) {
    const [formData, setFormData] = React.useState(() => {
      if (editingRecipe) {
        return {
          id: editingRecipe.id,
          name: getLocalized(editingRecipe.name, lang),
          category: getLocalized(editingRecipe.category, lang),
          prepTime: editingRecipe.prepTime || '20 min',
          servings: editingRecipe.servings || 2,
          calories: editingRecipe.calories || 450,
          protein: editingRecipe.protein || 35,
          carbs: editingRecipe.carbs || 40,
          fats: editingRecipe.fats || 12,
          ingredients: (editingRecipe.ingredients || []).map((ing) => ({
            name: getLocalized(ing.name, lang),
            amount: ing.amount || 100,
            unit: ing.unit || 'g',
            packageSize: ing.packageSize || 200,
            packageUnit: ing.packageUnit || ing.unit || 'g'
          })),
          steps: getLocalized(editingRecipe.steps, lang) || []
        };
      }
      return {
        name: '',
        category: 'Lunch',
        prepTime: '20 min',
        servings: 2,
        calories: 450,
        protein: 35,
        carbs: 40,
        fats: 12,
        ingredients: [
          {
            name: lang === 'pl' ? 'Pierś z Kurczaka' : 'Chicken Breast',
            amount: 300,
            unit: 'g',
            packageSize: 500,
            packageUnit: 'g'
          }
        ],
        steps: [
          lang === 'pl'
            ? 'Przygotuj składniki i ugotuj według zaleceń.'
            : 'Prepare ingredients and cook according to instructions.'
        ]
      };
    });

    const handleAddIngredient = () => {
      setFormData((prev) => ({
        ...prev,
        ingredients: [
          ...prev.ingredients,
          { name: '', amount: 100, unit: 'g', packageSize: 200, packageUnit: 'g' }
        ]
      }));
    };

    const handleRemoveIngredient = (index) => {
      setFormData((prev) => ({
        ...prev,
        ingredients: prev.ingredients.filter((_, i) => i !== index)
      }));
    };

    const handleIngredientChange = (index, field, value) => {
      setFormData((prev) => {
        const updated = [...prev.ingredients];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, ingredients: updated };
      });
    };

    const handleAddStep = () => {
      setFormData((prev) => ({
        ...prev,
        steps: [...prev.steps, '']
      }));
    };

    const handleStepChange = (index, value) => {
      setFormData((prev) => {
        const updated = [...prev.steps];
        updated[index] = value;
        return { ...prev, steps: updated };
      });
    };

    const handleRemoveStep = (index) => {
      setFormData((prev) => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index)
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.name.trim()) return;

      const altLang = lang === 'en' ? 'pl' : 'en';

      const formattedRecipe = {
        id: formData.id,
        name: {
          [lang]: formData.name,
          [altLang]: editingRecipe ? getLocalized(editingRecipe.name, altLang) : formData.name
        },
        category: {
          [lang]: formData.category,
          [altLang]: editingRecipe ? getLocalized(editingRecipe.category, altLang) : formData.category
        },
        prepTime: formData.prepTime,
        servings: Number(formData.servings) || 1,
        calories: Number(formData.calories) || 0,
        protein: Number(formData.protein) || 0,
        carbs: Number(formData.carbs) || 0,
        fats: Number(formData.fats) || 0,
        ingredients: formData.ingredients.map((ing) => ({
          name: {
            [lang]: ing.name,
            [altLang]: ing.name
          },
          amount: Number(ing.amount) || 0,
          unit: ing.unit,
          packageSize: Number(ing.packageSize) || Number(ing.amount) || 1,
          packageUnit: ing.packageUnit || ing.unit
        })),
        steps: {
          [lang]: formData.steps.filter((s) => s.trim().length > 0),
          [altLang]: editingRecipe
            ? getLocalized(editingRecipe.steps, altLang)
            : formData.steps.filter((s) => s.trim().length > 0)
        }
      };

      onSave(formattedRecipe);
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {editingRecipe ? t.editRecipe : t.addNewMealRecipe}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.recipeName}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={lang === 'pl' ? 'np. Łosoś z Ryżem' : 'e.g. Teriyaki Salmon Bowl'}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.category}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Breakfast">{t.breakfast}</option>
                  <option value="Lunch">{t.lunch}</option>
                  <option value="Dinner">{t.dinner}</option>
                  <option value="Snack">{t.snack}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.prepTime}
                </label>
                <input
                  type="text"
                  value={formData.prepTime}
                  onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.batchServings}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: Number(e.target.value) || 1 })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                {t.macrosPerPortion}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500">Calories (kcal)</label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500">{t.protein} (g)</label>
                  <input
                    type="number"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500">{t.carbs} (g)</label>
                  <input
                    type="number"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500">{t.fats} (g)</label>
                  <input
                    type="number"
                    value={formData.fats}
                    onChange={(e) => setFormData({ ...formData, fats: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t.ingredientsPkgSizing}
                </span>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {t.addIngredient}
                </button>
              </div>

              <div className="space-y-2">
                {formData.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <input
                      type="text"
                      placeholder={lang === 'pl' ? 'Nazwa (np. Ryż)' : 'Name (e.g. Rice)'}
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      placeholder="Amt"
                      title="Ingredient amount required"
                      value={ing.amount}
                      onChange={(e) => handleIngredientChange(idx, 'amount', Number(e.target.value) || 0)}
                      className="w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      title="Unit (g, ml, pcs)"
                      value={ing.unit}
                      onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      className="w-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      placeholder="Pkg Size"
                      title="Store Package Size"
                      value={ing.packageSize}
                      onChange={(e) => handleIngredientChange(idx, 'packageSize', Number(e.target.value) || 0)}
                      className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Icon name="trash-2" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cooking Steps Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t.cookingSteps}
                </span>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {t.addStep}
                </button>
              </div>

              <div className="space-y-2">
                {formData.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(idx, e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-slate-100"
                    />
                    {formData.steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Icon name="trash-2" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md transition-colors"
              >
                {t.saveRecipe}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  window.MacroChef.components.RecipeModal = RecipeModal;
})();

