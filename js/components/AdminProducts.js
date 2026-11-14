// Admin Products Management - Import + Bulk Operations
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { useState, useEffect } = React;

  function AdminProducts({ repository, session }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    
    // Get translations with fallbacks
    const lang = localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl';
    const defaultTranslations = {
      importProducts: 'Import Products',
      loading: 'Loading...',
      noProducts: 'No products',
      name: 'Name',
      shop: 'Shop',
      price: 'Price',
      calories: 'Calories',
      protein: 'Protein',
      carbs: 'Carbs',
      fat: 'Fat',
      actions: 'Actions',
      delete: 'Delete',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      selectItems: 'Select items',
      confirmDelete: 'Are you sure?',
      editSelected: 'Edit Selected',
      deleteSelected: 'Delete Selected',
      editProducts: 'Edit Products',
      productsUpdated: 'Products updated',
      productsDeleted: 'Products deleted',
      productsImported: 'Products imported',
      importProductsHelp: 'CSV format: name, price, calories, protein, carbs, fat, shop',
      totalProducts: 'Total Products'
    };
    
    const langTranslations = window.MacroChef?.TRANSLATIONS?.[lang];
    const t = langTranslations || defaultTranslations;

    // Load all products
    useEffect(() => {
      async function loadProducts() {
        setLoading(true);
        setError('');
        try {
          if (!repository) {
            throw new Error('Repository not available');
          }
          if (typeof repository.getAllProducts !== 'function') {
            throw new Error('getAllProducts method not available on repository');
          }
          const all = await repository.getAllProducts();
          console.log('Loaded products:', all);
          setProducts(all || []);
        } catch (err) {
          const errorMsg = err.message || 'Failed to load products';
          setError(errorMsg);
          console.error('Load products error:', err);
        } finally {
          setLoading(false);
        }
      }
      loadProducts();
    }, [repository]);

    // Delete product
    const deleteProduct = async (productId) => {
      if (!window.confirm(t.confirmDelete || 'Are you sure?')) return;
      try {
        await repository.deleteProduct(productId);
        setProducts(products.filter(p => p.id !== productId));
        setSelected(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } catch (err) {
        setError(err.message);
      }
    };

    // Bulk delete products
    const bulkDelete = async () => {
      if (selected.size === 0) {
        setError(t.selectItems || 'Select products first');
        return;
      }
      if (!window.confirm(`Delete ${selected.size} products?`)) return;

      try {
        for (const productId of selected) {
          await repository.deleteProduct(productId);
        }
        setProducts(products.filter(p => !selected.has(p.id)));
        setSelected(new Set());
        setSuccess(`${selected.size} ${t.productsDeleted || 'products deleted'}`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    };

    // Bulk edit - update values
    const bulkEdit = async () => {
      if (selected.size === 0) {
        setError(t.selectItems || 'Select products first');
        return;
      }

      try {
        for (const productId of selected) {
          const product = products.find(p => p.id === productId);
          if (!product) continue;

          const updated = { ...product };
          if (editValues.price !== undefined) updated.price = parseFloat(editValues.price);
          if (editValues.calories !== undefined) updated.calories = parseFloat(editValues.calories);
          if (editValues.protein !== undefined) updated.protein = parseFloat(editValues.protein);
          if (editValues.carbs !== undefined) updated.carbs = parseFloat(editValues.carbs);
          if (editValues.fat !== undefined) updated.fat = parseFloat(editValues.fat);

          await repository.saveProduct(updated);
        }

        // Reload products
        const all = await repository.getAllProducts();
        setProducts(all || []);
        setSelected(new Set());
        setEditingId(null);
        setEditValues({});
        setSuccess(`${selected.size} ${t.productsUpdated || 'products updated'}`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    };

    // Import products from CSV
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
          throw new Error('CSV must have header and at least one product');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIdx = headers.indexOf('name');
        const priceIdx = headers.indexOf('price');
        const caloriesIdx = headers.indexOf('calories');
        const proteinIdx = headers.indexOf('protein');
        const carbsIdx = headers.indexOf('carbs');
        const fatIdx = headers.indexOf('fat');
        const shopIdx = headers.indexOf('shop');

        if (nameIdx === -1) throw new Error('CSV must have "name" column');

        const newProducts = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map(c => c.trim());
          if (!cells[nameIdx]) continue;

          const product = {
            id: window.crypto.randomUUID(),
            userId: session.userId,
            name: cells[nameIdx],
            price: parseFloat(cells[priceIdx]) || 0,
            calories: parseFloat(cells[caloriesIdx]) || 0,
            protein: parseFloat(cells[proteinIdx]) || 0,
            carbs: parseFloat(cells[carbsIdx]) || 0,
            fat: parseFloat(cells[fatIdx]) || 0,
            shop: cells[shopIdx] || 'Unknown',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await repository.saveProduct(product);
          newProducts.push(product);
        }

        setProducts([...products, ...newProducts]);
        setSuccess(`${newProducts.length} ${t.productsImported || 'products imported'}`);
        setTimeout(() => setSuccess(''), 3000);
        event.target.value = '';
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-4" role="region" aria-label="Products Management">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4" role="alert">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4" role="status">
            <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Import CSV */}
          <label className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium cursor-pointer transition" title={t.importProducts || 'Import Products'}>
            {t.importProducts || 'Import Products'}
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              disabled={loading}
            />
          </label>

          {/* Bulk Edit */}
          {selected.size > 0 && !editingId && (
            <button
              onClick={() => setEditingId('bulk')}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition"
            >
              {t.editSelected || `Edit ${selected.size} Products`}
            </button>
          )}

          {/* Bulk Delete */}
          {selected.size > 0 && !editingId && (
            <button
              onClick={bulkDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
            >
              {t.deleteSelected || `Delete ${selected.size} Products`}
            </button>
          )}

          {/* Cancel Selection/Edit */}
          {(selected.size > 0 || editingId) && (
            <button
              onClick={() => {
                setSelected(new Set());
                setEditingId(null);
                setEditValues({});
              }}
              className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg font-medium transition"
            >
              {t.cancel || 'Cancel'}
            </button>
          )}
        </div>

        {/* Bulk Edit Panel */}
        {editingId === 'bulk' && selected.size > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t.editProducts || 'Edit Products'} ({selected.size})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <input
                type="number"
                step="0.01"
                placeholder={t.price || 'Price'}
                value={editValues.price ?? ''}
                onChange={(e) => setEditValues({ ...editValues, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                step="0.1"
                placeholder={t.calories || 'Calories'}
                value={editValues.calories ?? ''}
                onChange={(e) => setEditValues({ ...editValues, calories: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                step="0.1"
                placeholder={t.protein || 'Protein'}
                value={editValues.protein ?? ''}
                onChange={(e) => setEditValues({ ...editValues, protein: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                step="0.1"
                placeholder={t.carbs || 'Carbs'}
                value={editValues.carbs ?? ''}
                onChange={(e) => setEditValues({ ...editValues, carbs: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                step="0.1"
                placeholder={t.fat || 'Fat'}
                value={editValues.fat ?? ''}
                onChange={(e) => setEditValues({ ...editValues, fat: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={bulkEdit}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
            >
              {t.save || 'Save Changes'}
            </button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-slate-600 dark:text-slate-400 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          {t.importProductsHelp || 'CSV format: name, price, calories, protein, carbs, fat, shop'}
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            {t.loading || 'Loading...'}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            {t.noProducts || 'No products found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-300 dark:border-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === products.length && products.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(products.map(p => p.id)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-300 font-semibold">{t.name || 'Name'}</th>
                  <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-300 font-semibold">{t.shop || 'Shop'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.price || 'Price'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.calories || 'Kcal'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.protein || 'P'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.carbs || 'C'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.fat || 'F'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={(e) => {
                          const newSet = new Set(selected);
                          if (e.target.checked) {
                            newSet.add(product.id);
                          } else {
                            newSet.delete(product.id);
                          }
                          setSelected(newSet);
                        }}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">{product.shop}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{product.price?.toFixed(2)} zł</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{Math.round(product.calories)}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{product.protein?.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{product.carbs?.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{product.fat?.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteProduct(product.id)}
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

        {/* Summary */}
        <div className="text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          {t.totalProducts || 'Total Products'}: <span className="font-semibold text-slate-900 dark:text-white">{products.length}</span>
        </div>
      </div>
    );
  }

  window.MacroChef.components.AdminProducts = AdminProducts;
})();
