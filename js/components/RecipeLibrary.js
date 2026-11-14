// Recipe Library Tab Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;
  const { getLocalized } = window.MacroChef.helpers;

  const normalizeHeader = (value) => value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  const parseCsvRows = (text) => {
    let delimiter;
    const separatorLine = text.match(/^sep=(,|;|\t)\r?\n/i);
    if (separatorLine) {
      delimiter = separatorLine[1];
      text = text.slice(separatorLine[0].length);
    } else {
      const firstLine = text.split(/\r?\n/, 1)[0] || '';
      delimiter = [',', ';', '\t'].reduce((selected, candidate) => {
        const count = (firstLine.match(new RegExp(candidate === '\t' ? '\\t' : `\\${candidate}`, 'g')) || []).length;
        const selectedCount = (firstLine.match(new RegExp(selected === '\t' ? '\\t' : `\\${selected}`, 'g')) || []).length;
        return count > selectedCount ? candidate : selected;
      }, ',');
    }

    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const character = text[i];
      if (inQuotes) {
        if (character === '"' && text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else if (character === '"') {
          inQuotes = false;
        } else {
          field += character;
        }
      } else if (character === '"' && field.length === 0) {
        inQuotes = true;
      } else if (character === delimiter) {
        row.push(field);
        field = '';
      } else if (character === '\n' || character === '\r') {
        if (character === '\r' && text[i + 1] === '\n') i += 1;
        row.push(field);
        if (row.some((cell) => cell.trim())) rows.push(row);
        row = [];
        field = '';
      } else {
        field += character;
      }
    }
    if (inQuotes) throw new Error('The CSV file contains an unclosed quoted field.');
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
    return rows;
  };

  const parseRecipeCsv = (text) => {
    const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
    if (rows.length < 2) throw new Error('The CSV file must contain a header and at least one recipe.');

    const fields = {
      name: ['name', 'nazwa'],
      category: ['category', 'kategoria'],
      prepTime: ['preptime', 'preparationtime', 'czasprzygotowania'],
      servings: ['servings', 'portions', 'porcje', 'liczbaporcji'],
      calories: ['calories', 'kcal', 'kalorie', 'caloriesperserving', 'kalorienaporcje'],
      protein: ['protein', 'bialko', 'proteinperserving', 'bialkonaporcje'],
      carbs: ['carbs', 'carbohydrates', 'weglowodany', 'carbsperserving', 'weglowodanynaporcje'],
      fats: ['fats', 'fat', 'tluszcze', 'fatsperserving', 'tluszczenaporcje'],
      steps: ['steps', 'instructions', 'kroki']
    };
    const headerIndexes = new Map();
    const ingredientColumns = new Map();
    rows[0].forEach((header, index) => {
      const normalized = normalizeHeader(header);
      let field = Object.keys(fields).find((key) => fields[key].includes(normalized));
      const englishIngredient = normalized.match(/^ingredient(\d+)(name|amount|unit|packagesize|packageunit)$/);
      const polishIngredient = normalized.match(/^skladnik(\d+)(nazwa|ilosc|jednostka|rozmiaropakowania|jednostkaopakowania)$/);
      const match = englishIngredient || polishIngredient;
      if (match) {
        const ingredientField = englishIngredient
          ? { name: 'name', amount: 'amount', unit: 'unit', packagesize: 'packageSize', packageunit: 'packageUnit' }[match[2]]
          : { nazwa: 'name', ilosc: 'amount', jednostka: 'unit', rozmiaropakowania: 'packageSize', jednostkaopakowania: 'packageUnit' }[match[2]];
        const key = `${match[1]}-${ingredientField}`;
        if (ingredientColumns.has(key)) throw new Error(`Duplicate CSV column: ${header}`);
        ingredientColumns.set(key, index);
      } else if (field) {
        if (headerIndexes.has(field)) throw new Error(`Duplicate CSV column: ${header}`);
        headerIndexes.set(field, index);
      }
    });

    const requiredFields = ['name', 'category', 'prepTime', 'servings', 'calories', 'protein', 'carbs', 'fats', 'steps'];
    const missingFields = requiredFields.filter((field) => !headerIndexes.has(field));
    if (missingFields.length) {
      throw new Error(`Missing required CSV columns: ${missingFields.join(', ')}.`);
    }
    if (![...ingredientColumns.keys()].some((key) => key.endsWith('-name'))) {
      throw new Error('Add ingredient columns such as ingredient1Name, ingredient1Amount, and ingredient1Unit.');
    }

    const cell = (row, key) => {
      const index = headerIndexes.get(key);
      return index === undefined ? '' : (row[index] || '').trim();
    };
    const numberCell = (value, label, rowNumber, minimum = 0) => {
      const normalized = value.includes(',') && !value.includes('.')
        ? value.replace(',', '.')
        : value;
      const number = Number(normalized);
      if (!value || !Number.isFinite(number) || number < minimum) {
        throw new Error(`Row ${rowNumber}: "${label}" must be a number${minimum ? ` greater than or equal to ${minimum}` : ''}.`);
      }
      return number;
    };
    const categories = {
      breakfast: { en: 'Breakfast', pl: 'Śniadanie' },
      sniadanie: { en: 'Breakfast', pl: 'Śniadanie' },
      lunch: { en: 'Lunch', pl: 'Obiad' },
      obiad: { en: 'Lunch', pl: 'Obiad' },
      dinner: { en: 'Dinner', pl: 'Kolacja' },
      kolacja: { en: 'Dinner', pl: 'Kolacja' },
      snack: { en: 'Snack', pl: 'Przekąska' },
      przekaska: { en: 'Snack', pl: 'Przekąska' }
    };
    const unitValue = (value, label, rowNumber) => {
      const normalized = normalizeHeader(value);
      const unit = { g: 'g', ml: 'ml', pcs: 'pcs', szt: 'pcs', porcja: 'porcja', portion: 'porcja' }[normalized];
      if (!unit) throw new Error(`Row ${rowNumber}: "${label}" must be g, ml, pcs, or porcja.`);
      return unit;
    };

    return rows.slice(1).map((row, rowIndex) => {
      const rowNumber = rowIndex + 2;
      if (row.length > rows[0].length && row.slice(rows[0].length).some((value) => value.trim())) {
        throw new Error(`Row ${rowNumber}: there are more values than CSV headers.`);
      }
      if (row.length < rows[0].length) row.length = rows[0].length;

      const name = cell(row, 'name');
      if (!name) throw new Error(`Row ${rowNumber}: recipe name is required.`);
      const categoryKey = normalizeHeader(cell(row, 'category'));
      const category = categories[categoryKey];
      if (!category) {
        throw new Error(`Row ${rowNumber}: category must be Breakfast, Lunch, Dinner, or Snack.`);
      }
      const ingredients = [];
      const ingredientNumbers = [...new Set(
        [...ingredientColumns.keys()].map((key) => key.split('-')[0])
      )].sort((a, b) => Number(a) - Number(b));
      ingredientNumbers.forEach((ingredientNumber) => {
        const getIngredientCell = (field) => {
          const index = ingredientColumns.get(`${ingredientNumber}-${field}`);
          return index === undefined ? '' : (row[index] || '').trim();
        };
        const ingredientName = getIngredientCell('name');
        const ingredientAmount = getIngredientCell('amount');
        const ingredientUnitValue = getIngredientCell('unit');
        const packageSize = getIngredientCell('packageSize');
        const packageUnitValue = getIngredientCell('packageUnit');
        if (!ingredientName) {
          if ([ingredientAmount, ingredientUnitValue, packageSize, packageUnitValue].some(Boolean)) {
            throw new Error(`Row ${rowNumber}: ingredient ${ingredientNumber} needs a name.`);
          }
          return;
        }
        if (!ingredientUnitValue || !packageUnitValue) {
          throw new Error(`Row ${rowNumber}: ingredient ${ingredientNumber} needs both unit and package unit.`);
        }
        const ingredientUnit = unitValue(ingredientUnitValue, `ingredient ${ingredientNumber} unit`, rowNumber);
        const packageUnit = unitValue(packageUnitValue, `ingredient ${ingredientNumber} package unit`, rowNumber);
        if (packageUnit !== ingredientUnit) {
          throw new Error(`Row ${rowNumber}: ingredient ${ingredientNumber} package unit must match its unit.`);
        }
        const amount = numberCell(ingredientAmount, `ingredient ${ingredientNumber} amount`, rowNumber);
        ingredients.push({
          name: { en: ingredientName, pl: ingredientName },
          amount,
          unit: ingredientUnit,
          packageSize: numberCell(packageSize, `ingredient ${ingredientNumber} package size`, rowNumber),
          packageUnit: ingredientUnit
        });
      });
      if (ingredients.length === 0) {
        throw new Error(`Row ${rowNumber}: add at least one ingredient.`);
      }

      const stepsText = cell(row, 'steps');
      const steps = stepsText
        ? stepsText.split(/\|[\s]*|\r?\n/).map((step) => step.trim()).filter(Boolean)
        : [];
      if (steps.length === 0) throw new Error(`Row ${rowNumber}: add at least one cooking step.`);
      return {
        name: { en: name, pl: name },
        category,
        prepTime: cell(row, 'prepTime'),
        servings: numberCell(cell(row, 'servings'), 'servings', rowNumber, 1),
        calories: numberCell(cell(row, 'calories'), 'calories', rowNumber),
        protein: numberCell(cell(row, 'protein'), 'protein', rowNumber),
        carbs: numberCell(cell(row, 'carbs'), 'carbs', rowNumber),
        fats: numberCell(cell(row, 'fats'), 'fats', rowNumber),
        ingredients,
        steps: { en: steps, pl: steps }
      };
    });
  };
  window.MacroChef.recipeCsv.parse = parseRecipeCsv;

  function RecipeLibrary({
    recipes,
    onCreateRecipe,
    onEditRecipe,
    onDeleteRecipe,
    onImportRecipes,
    onStartBatchCooking,
    canManageRecipes
  }) {
    const { t, lang } = window.MacroChef.useI18n();

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

          {canManageRecipes ? (
          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <button
              onClick={onCreateRecipe}
              className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>{t.createRecipe}</span>
            </button>
          </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.recipesReadOnly}</p>
          )}
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

                {canManageRecipes && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  window.MacroChef.components.RecipeLibrary = RecipeLibrary;
})();
