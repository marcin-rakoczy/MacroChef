// Recipe Form Modal Component for Creating/Editing Recipes with Lidl Products Catalog
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
            amount: ing.amount !== undefined ? ing.amount : '',
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
        ingredients: [],
        steps: [
          lang === 'pl'
            ? 'Przygotuj składniki i ugotuj według zaleceń.'
            : 'Prepare ingredients and cook according to instructions.'
        ]
      };
    });

    // Lidl Products Catalog State
    const productQuery = window.MacroChef.useRepositoryQuery(
      () => window.MacroChef.repositories.watchProducts(),
      [window.MacroChef.repositories],
      null
    );
    const products = productQuery.data || [];
    const [productSearch, setProductSearch] = React.useState('');
    const [selectedProductCategory, setSelectedProductCategory] = React.useState('all');
    const [isCatalogOpen, setIsCatalogOpen] = React.useState(false);

    // New Product to DB Sub-Modal State
    const [showNewProductModal, setShowNewProductModal] = React.useState(false);
    const [newProductForm, setNewProductForm] = React.useState({
      name: '',
      unit: 'g',
      packageSize: 500,
      category: 'meat'
    });

    // Reference to scroll to newly added ingredient
    const ingredientsEndRef = React.useRef(null);

    React.useEffect(() => {
      if (productQuery.error) {
        console.error('Product repository subscription error:', productQuery.error);
      }
    }, [productQuery.error]);

    // Filter products based on search & category
    const filteredProducts = React.useMemo(() => {
      let list = products || [];
      if (selectedProductCategory !== 'all') {
        list = list.filter((p) => p.category === selectedProductCategory);
      }
      if (productSearch.trim()) {
        const query = productSearch.toLowerCase().trim();
        list = list.filter((p) => {
          const namePl = (typeof p.name === 'object' ? p.name.pl : p.name) || '';
          const nameEn = (typeof p.name === 'object' ? p.name.en : p.name) || '';
          return namePl.toLowerCase().includes(query) || nameEn.toLowerCase().includes(query);
        });
      }
      return list;
    }, [products, selectedProductCategory, productSearch]);

    // Handle selecting a product from the Lidl catalog
    const handleSelectProduct = (product) => {
      const prodName = getLocalized(product.name, lang);
      const newIng = {
        name: prodName,
        amount: '', // Left empty so user fills required amount manually!
        unit: product.unit || 'g',
        packageSize: Number(product.packageSize) || 100,
        packageUnit: product.unit || 'g'
      };

      setFormData((prev) => ({
        ...prev,
        ingredients: [...prev.ingredients, newIng]
      }));

      // Close search dropdown / keep search query clean
      setProductSearch('');
      setIsCatalogOpen(false);

      // Focus last input after render
      setTimeout(() => {
        if (ingredientsEndRef.current) {
          ingredientsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          const inputs = document.querySelectorAll('.recipe-amount-input');
          if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
          }
        }
      }, 50);
    };

    // Handle adding an empty custom ingredient row
    const handleAddCustomIngredient = () => {
      setFormData((prev) => ({
        ...prev,
        ingredients: [
          ...prev.ingredients,
          { name: '', amount: '', unit: 'g', packageSize: 500, packageUnit: 'g' }
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

    // Save a new product to the persistent Lidl catalog
    const handleSaveNewProductToDb = async (andAddToRecipe = true) => {
      if (!newProductForm.name.trim()) return;

      const newProductObj = {
        name: {
          [lang]: newProductForm.name.trim(),
          [lang === 'pl' ? 'en' : 'pl']: newProductForm.name.trim()
        },
        category: newProductForm.category || 'other',
        unit: newProductForm.unit || 'g',
        packageSize: Number(newProductForm.packageSize) || 100
      };

      try {
        let saved = newProductObj;
        saved = await window.MacroChef.repositories.saveProduct(newProductObj);
        if (andAddToRecipe) {
          handleSelectProduct(saved);
        }

        setShowNewProductModal(false);
        setNewProductForm({ name: '', unit: 'g', packageSize: 500, category: 'meat' });
      } catch (err) {
        console.error('Error saving new product:', err);
      }
    };

    // Steps Management
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

    // Submit Recipe
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
        ingredients: formData.ingredients
          .filter((ing) => ing.name && ing.name.trim().length > 0)
          .map((ing) => ({
            name: {
              [lang]: ing.name,
              [altLang]: ing.name
            },
            amount: Number(ing.amount) || 0,
            unit: ing.unit || 'g',
            packageSize: Number(ing.packageSize) || Number(ing.amount) || 1,
            packageUnit: ing.packageUnit || ing.unit || 'g'
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

    const productCategories = [
      { key: 'all', label: lang === 'pl' ? 'Wszystkie' : 'All' },
      { key: 'meat', label: lang === 'pl' ? 'Mięso i Ryby' : 'Meat & Fish' },
      { key: 'dairy', label: lang === 'pl' ? 'Nabiał i Jaja' : 'Dairy & Eggs' },
      { key: 'grains', label: lang === 'pl' ? 'Zbożowe i Kasze' : 'Grains & Pasta' },
      { key: 'veggies', label: lang === 'pl' ? 'Warzywa i Owoce' : 'Vegetables & Fruits' },
      { key: 'fats', label: lang === 'pl' ? 'Tłuszcze i Dodatki' : 'Fats & Extras' }
    ];

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-700 my-6 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/80 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Icon name="utensils" className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {editingRecipe ? t.editRecipe : t.addNewMealRecipe}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'pl'
                    ? 'Wprowadź dane przepisu, makroskładniki oraz składniki z bazy Lidla'
                    : 'Enter recipe details, macros and ingredients based on Lidl packages'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={t.cancel}
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.recipeName}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={lang === 'pl' ? 'np. Kurczak curry z warzywami i ryżem' : 'e.g. Teriyaki Chicken & Basmati Rice'}
                className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.category}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
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
                  placeholder="np. 20 min"
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.batchServings} ({t.servings})
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: Number(e.target.value) || 1 })}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Macros per portion */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2.5">
                {t.macrosPerPortion}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Kalorie (kcal)</label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">{t.protein} (g)</label>
                  <input
                    type="number"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">{t.carbs} (g)</label>
                  <input
                    type="number"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">{t.fats} (g)</label>
                  <input
                    type="number"
                    value={formData.fats}
                    onChange={(e) => setFormData({ ...formData, fats: Number(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* Ingredients & Lidl Whole Package Sizing Section          */}
            {/* ======================================================== */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>{t.ingredientsPkgSizing || 'Składniki i Wielkość Opakowań'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'pl'
                      ? 'Wyszukaj i dodaj produkty z Lidla, a wymaganą ilość uzupełnij ręcznie.'
                      : 'Search Lidl products and specify required portion amounts manually.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewProductModal(true)}
                    className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    <span>{t.addNewProductToDb || '+ Dodaj Nowy Składnik'}</span>
                  </button>
                </div>
              </div>

              {/* Lidl Search and Filter Bar */}
              <div className="bg-slate-100/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Icon name="search" className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={productSearch}
                    onFocus={() => setIsCatalogOpen(true)}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsCatalogOpen(true);
                    }}
                    placeholder={t.searchLidlProduct || 'Szukaj produktu z Lidla (np. kurczak, twaróg, płatki, jaja)...'}
                    className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <Icon name="x" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                  {productCategories.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        setSelectedProductCategory(cat.key);
                        setIsCatalogOpen(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                        selectedProductCategory === cat.key
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                    className="ml-auto text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                  >
                    {isCatalogOpen ? (lang === 'pl' ? 'Ukryj listę' : 'Hide catalog') : (lang === 'pl' ? 'Przeglądaj bazę Lidla' : 'Browse Lidl catalog')}
                  </button>
                </div>

                {/* Search Results Dropdown / Picker List */}
                {isCatalogOpen && (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 shadow-lg">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          {t.noProductsFound || 'Nie znaleziono produktu w bazie.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProductForm((prev) => ({ ...prev, name: productSearch }));
                            setShowNewProductModal(true);
                          }}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          + Dodaj "{productSearch}" do bazy produktów Lidla
                        </button>
                      </div>
                    ) : (
                      filteredProducts.map((prod) => {
                        const pName = getLocalized(prod.name, lang);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectProduct(prod)}
                            className="p-2.5 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate block">
                                {pName}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                <span className="bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.2 rounded font-medium text-slate-600 dark:text-slate-300">
                                  {lang === 'pl' ? 'Opakowanie:' : 'Pkg:'} {prod.packageSize} {prod.unit}
                                </span>
                                {prod.category && (
                                  <span className="text-slate-400 uppercase tracking-wide">
                                    {prod.category}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectProduct(prod);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0"
                            >
                              <Icon name="plus" className="w-3 h-3" />
                              <span>{lang === 'pl' ? 'Wybierz' : 'Select'}</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Added Ingredients List in this Recipe */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                  <span>{t.addedIngredients || 'Składniki w przepisie'} ({formData.ingredients.length})</span>
                  <button
                    type="button"
                    onClick={handleAddCustomIngredient}
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                  >
                    <Icon name="plus" className="w-3 h-3" />
                    <span>{lang === 'pl' ? '+ Własny składnik ręcznie' : '+ Custom row'}</span>
                  </button>
                </div>

                {formData.ingredients.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
                    <Icon name="book-open" className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {t.noIngredientsYet || 'Brak dodanych składników. Użyj wyszukiwarki powyżej, aby dodać produkt z bazy Lidla!'}
                    </p>
                  </div>
                ) : (
                  formData.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-400 transition-colors"
                    >
                      {/* Ingredient Name & Lidl Package Badge */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                          placeholder={lang === 'pl' ? 'Nazwa składnika' : 'Ingredient name'}
                          className="w-full font-bold text-xs sm:text-sm bg-transparent border-0 p-0 text-slate-900 dark:text-slate-100 focus:ring-0 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md font-medium text-slate-600 dark:text-slate-300">
                            <span>{lang === 'pl' ? 'Opakowanie:' : 'Package:'}</span>
                            <input
                              type="number"
                              value={ing.packageSize}
                              onChange={(e) => handleIngredientChange(idx, 'packageSize', Number(e.target.value) || 0)}
                              className="w-12 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 text-center font-bold text-[11px]"
                            />
                            <span>{ing.packageUnit || ing.unit}</span>
                          </span>
                        </div>
                      </div>

                      {/* Required Amount Input (Uzupelniane recznie) */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {lang === 'pl' ? 'Wymagana ilość:' : 'Amount:'}
                          </span>
                          <input
                            type="number"
                            step="any"
                            placeholder="0"
                            value={ing.amount}
                            onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                            className="recipe-amount-input w-20 bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-500 rounded-lg py-1 px-2 text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            autoFocus={idx === formData.ingredients.length - 1 && ing.amount === ''}
                          />
                          <select
                            value={ing.unit}
                            onChange={(e) => {
                              handleIngredientChange(idx, 'unit', e.target.value);
                              handleIngredientChange(idx, 'packageUnit', e.target.value);
                            }}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 border-0 focus:ring-0 p-0 cursor-pointer"
                          >
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="pcs">{lang === 'pl' ? 'szt' : 'pcs'}</option>
                            <option value="porcja">{lang === 'pl' ? 'porcja' : 'portion'}</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Usuń składnik"
                        >
                          <Icon name="trash-2" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <div ref={ingredientsEndRef} />
              </div>
            </div>

            {/* Cooking Steps Section */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
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
                      placeholder={lang === 'pl' ? 'Opis kroku...' : 'Step description...'}
                      className="flex-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
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

            {/* Footer Buttons */}
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
                className="px-6 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all"
              >
                {t.saveRecipe}
              </button>
            </div>
          </form>

          {/* ======================================================== */}
          {/* Sub-Modal: Add New Ingredient / Product to Catalog (Lidl) */}
          {/* ======================================================== */}
          {showNewProductModal && (
            <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
                  <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Icon name="plus" className="w-4 h-4 text-emerald-500" />
                    <span>{t.newProductModalTitle || 'Dodaj Nowy Składnik do Bazy (Lidl)'}</span>
                  </h4>
                  <button
                    onClick={() => setShowNewProductModal(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.productName || 'Nazwa Składnika / Produktu'}
                    </label>
                    <input
                      type="text"
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                      placeholder="np. Twaróg chudy Pilos (Lidl)"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  {/* Unit & Package Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t.unit || 'Jednostka'}
                      </label>
                      <select
                        value={newProductForm.unit}
                        onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="g">gramy (g)</option>
                        <option value="ml">mililitry (ml)</option>
                        <option value="pcs">{lang === 'pl' ? 'sztuki (szt)' : 'pieces (pcs)'}</option>
                        <option value="porcja">{lang === 'pl' ? 'porcja' : 'portion'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t.packageSizeInUnit || 'Wielkość opakowania'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newProductForm.packageSize}
                        onChange={(e) => setNewProductForm({ ...newProductForm, packageSize: Number(e.target.value) || 1 })}
                        placeholder="np. 250"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.category || 'Kategoria'}
                    </label>
                    <select
                      value={newProductForm.category}
                      onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="meat">{lang === 'pl' ? 'Mięso i Ryby' : 'Meat & Fish'}</option>
                      <option value="dairy">{lang === 'pl' ? 'Nabiał i Jaja' : 'Dairy & Eggs'}</option>
                      <option value="grains">{lang === 'pl' ? 'Produkty Zbożowe i Kasze' : 'Grains & Pasta'}</option>
                      <option value="veggies">{lang === 'pl' ? 'Warzywa i Owoce' : 'Vegetables & Fruits'}</option>
                      <option value="fats">{lang === 'pl' ? 'Tłuszcze i Dodatki' : 'Fats & Extras'}</option>
                    </select>
                  </div>

                  <p className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    💡 {lang === 'pl'
                      ? 'Wielkość opakowania służy inteligentnej liście zakupów do przeliczania całych paczek z Lidla i eliminowania marnowania żywności (zero-waste).'
                      : 'Package size is used by the smart shopping list to compute whole Lidl packages and calculate surplus.'}
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveNewProductToDb(true)}
                      className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                    >
                      {t.saveAndAddToRecipe || 'Zapisz i Dodaj do Przepisu'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveNewProductToDb(false)}
                      className="py-2.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
                    >
                      {t.saveProductToDb || 'Zapisz w Bazie'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.MacroChef.components.RecipeModal = RecipeModal;
})();
