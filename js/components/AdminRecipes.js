// Admin Recipes Management - Import + Bulk Operations
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { useState, useEffect } = React;

  function AdminRecipes({ repository, session }) {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const RECIPES_PER_PAGE = 25;
    const importInputRef = React.useRef(null);
    const t = window.MacroChef.TRANSLATIONS[localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl'];

    // Load all recipes
    useEffect(() => {
      async function loadRecipes() {
        setLoading(true);
        setError('');
        try {
          if (!repository) {
            throw new Error('Repository not available');
          }
          if (typeof repository.getAllRecipes !== 'function') {
            throw new Error('getAllRecipes method not available on repository');
          }
          const all = await repository.getAllRecipes();
          console.log('Loaded recipes:', all);
          setRecipes(all || []);
        } catch (err) {
          const errorMsg = err.message || 'Failed to load recipes';
          setError(errorMsg);
          console.error('Load recipes error:', err);
        } finally {
          setLoading(false);
        }
      }
      loadRecipes();
    }, [repository]);

    // Reset page when search changes
    useEffect(() => {
      setPage(0);
    }, [searchQuery]);

    // Filter recipes based on search query
    const filteredRecipes = recipes.filter(recipe => {
      const query = searchQuery.toLowerCase();
      const name = window.MacroChef.helpers.getLocalized(recipe.name, localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl').toLowerCase();
      return name.includes(query);
    });

    const totalPages = Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE);
    const startIndex = page * RECIPES_PER_PAGE;
    const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + RECIPES_PER_PAGE);

    // Delete recipe
    const deleteRecipe = async (recipeId) => {
      if (!window.confirm(t.confirmDelete || 'Are you sure?')) return;
      try {
        await repository.deleteRecipe(recipeId);
        setRecipes(recipes.filter(r => r.id !== recipeId));
        setSelected(prev => {
          const newSet = new Set(prev);
          newSet.delete(recipeId);
          return newSet;
        });
        setSuccess((t.deleted || 'Deleted') + ' 1 ' + (t.recipe || 'recipe'));
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    };

    // Bulk delete recipes
    const bulkDelete = async () => {
      if (selected.size === 0) {
        setError(t.selectItems || 'Select recipes first');
        return;
      }
      if (!window.confirm(`Delete ${selected.size} recipes?`)) return;

      try {
        for (const recipeId of selected) {
          await repository.deleteRecipe(recipeId);
        }
        setRecipes(recipes.filter(r => !selected.has(r.id)));
        setSelected(new Set());
        setSuccess(`${selected.size} ${t.recipesDeleted || 'recipes deleted'}`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    };

    // Import recipes from CSV
    const handleImportCSV = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const text = await file.text();
        const lines = text.trim().split('\n');
        
        if (lines.length < 2) {
          throw new Error('CSV must have header and at least one recipe');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIdx = headers.indexOf('name');
        const caloriesIdx = headers.indexOf('calories');
        const proteinIdx = headers.indexOf('protein');
        const carbsIdx = headers.indexOf('carbs');
        const fatIdx = headers.indexOf('fat');
        const ingredientsIdx = headers.indexOf('ingredients');

        if (nameIdx === -1) throw new Error('CSV must have "name" column');

        const newRecipes = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map(c => c.trim());
          if (!cells[nameIdx]) continue;

          const recipe = {
            id: window.crypto.randomUUID(),
            userId: session.userId,
            name: cells[nameIdx],
            calories: parseFloat(cells[caloriesIdx]) || 0,
            protein: parseFloat(cells[proteinIdx]) || 0,
            carbs: parseFloat(cells[carbsIdx]) || 0,
            fat: parseFloat(cells[fatIdx]) || 0,
            ingredients: cells[ingredientsIdx] ? cells[ingredientsIdx].split(';').map(i => i.trim()) : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await repository.createRecipe(recipe);
          newRecipes.push(recipe);
        }

        setRecipes([...recipes, ...newRecipes]);
        setSuccess(`${newRecipes.length} ${t.recipesImported || 'recipes imported'}`);
        setTimeout(() => setSuccess(''), 3000);
        event.target.value = '';
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Download CSV template
    const handleDownloadTemplate = () => {
      const templateContent = `Nazwa,Kategoria,CzasPrzygotowania,Porcje,Kalorie,Białko,Węglowodany,Tłuszcze,Kroki,Składnik1Nazwa,Składnik1Ilość,Składnik1Jednostka
Przykładowy Przepis,Śniadanie,15,1,300,15,50,8,"Krok 1. Przygotuj składniki|Krok 2. Wymieszaj",Jajko,2,szt`;
      const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'macrochef-recipes-template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Import CSV Button - Left Side */}
          <button
            type="button"
            onClick={() => importInputRef.current && importInputRef.current.click()}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-semibold text-xs px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 transition-all"
          >
            <div className="flex flex-col items-center gap-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <div className="w-3 h-0.5 bg-current"></div>
            </div>
            <span>{t.importRecipes || 'Import Recipes'}</span>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCSV}
          />

          {/* Search Box */}
          <input
            type="text"
            placeholder={t.search || 'Search recipes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white flex-1"
          />

          {/* Bulk Delete */}
          {selected.size > 0 && (
            <button
              onClick={bulkDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
            >
              {t.deleteSelected || `Delete ${selected.size} Recipes`}
            </button>
          )}

          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg font-medium transition"
            >
              {t.cancel || 'Cancel'}
            </button>
          )}
        </div>

        {/* Import Help Section */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300 underline underline-offset-2"
          >
            {t.downloadRecipeCsvTemplate || 'Download CSV template'}
          </button>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {t.recipeImportHint || 'One recipe per row; separate steps with |. For each ingredient add 5 columns, e.g. ingredient3Name–ingredient3PackageUnit.'}
          </p>
        </div>

        {/* Recipes Table */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            {t.loading || 'Loading...'}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            {searchQuery ? (t.noRecipes || 'No recipes found') : (t.noRecipes || 'No recipes found')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-300 dark:border-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={paginatedRecipes.length > 0 && paginatedRecipes.every(r => selected.has(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSet = new Set(selected);
                          paginatedRecipes.forEach(r => newSet.add(r.id));
                          setSelected(newSet);
                        } else {
                          const newSet = new Set(selected);
                          paginatedRecipes.forEach(r => newSet.delete(r.id));
                          setSelected(newSet);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-300 font-semibold">{t.name || 'Name'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.calories || 'Calories'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.protein || 'Protein'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.carbs || 'Carbs'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.fat || 'Fat'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecipes.map(recipe => (
                  <tr key={recipe.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(recipe.id)}
                        onChange={(e) => {
                          const newSet = new Set(selected);
                          if (e.target.checked) {
                            newSet.add(recipe.id);
                          } else {
                            newSet.delete(recipe.id);
                          }
                          setSelected(newSet);
                        }}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                      {window.MacroChef.helpers.getLocalized(recipe.name, localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl')}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{Math.round(recipe.calories || 0)}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{Math.round(recipe.protein || 0)}g</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{Math.round(recipe.carbs || 0)}g</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{Math.round(recipe.fats || 0)}g</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteRecipe(recipe.id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition"
                      >
                        {t.delete || 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredRecipes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {t.showing || 'Showing'}: {startIndex + 1} - {Math.min(startIndex + RECIPES_PER_PAGE, filteredRecipes.length)} {t.of || 'of'} {filteredRecipes.length} {t.recipes || 'recipes'} | {t.page || 'Page'} {page + 1} {t.of || 'of'} {totalPages}
              {searchQuery && <span className="ml-2 text-slate-700 dark:text-slate-300">({t.found || 'Found'}: {filteredRecipes.length})</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-lg font-medium transition"
              >
                ← {t.previous || 'Previous'}
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-lg font-medium transition"
              >
                {t.next || 'Next'} →
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          {t.totalRecipes || 'Total Recipes'}: <span className="font-semibold text-slate-900 dark:text-white">{recipes.length}</span>
        </div>
      </div>
    );
  }

  window.MacroChef.components.AdminRecipes = AdminRecipes;
})();
