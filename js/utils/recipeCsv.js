/**
 * Enhanced Recipe CSV Parser
 * Supports unlimited ingredients and Polish/English formats
 * Handles semicolon-delimited CSV with proper quote handling
 */
window.MacroChef = window.MacroChef || {};

(function () {
  const normalizeImageUrl = (value) => window.MacroChef.recipeImages
    ? window.MacroChef.recipeImages.normalizeUrl(value)
    : (typeof value === 'string' && value.trim()
      ? value.trim()
      : 'images/no-recipe-image.svg');

  const parseRows = (input, explicitDelimiter) => {
    let text = input.replace(/^\uFEFF/, '');
    const separator = text.match(/^sep=(,|;|\t)\r?\n/i);
    let delimiter = explicitDelimiter;
    if (separator) {
      delimiter = separator[1];
      text = text.slice(separator[0].length);
    } else if (!delimiter) {
      const counts = { ',': 0, ';': 0, '\t': 0 };
      let quoted = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && quoted && text[i + 1] === '"') i++;
        else if (char === '"') quoted = !quoted;
        else if (!quoted && (char === '\r' || char === '\n')) break;
        else if (!quoted && Object.prototype.hasOwnProperty.call(counts, char)) counts[char]++;
      }
      delimiter = [',', ';', '\t'].reduce((best, candidate) =>
        counts[candidate] > counts[best] ? candidate : best, ',');
    }

    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let afterQuote = false;
    const endRow = () => {
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = '';
      afterQuote = false;
    };
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
          afterQuote = true;
        } else {
          field += char;
        }
      } else if (char === delimiter) {
        row.push(field);
        field = '';
        afterQuote = false;
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        endRow();
      } else if (char === '"' && !afterQuote && field.length === 0) {
        inQuotes = true;
      } else if (afterQuote && (char === ' ' || char === '\t') && char !== delimiter) {
        continue;
      } else if (char === '"' || afterQuote) {
        throw new Error('The CSV file contains an invalid quoted field.');
      } else {
        field += char;
      }
    }
    if (inQuotes) throw new Error('The CSV file contains an unclosed quoted field.');
    endRow();
    return rows;
  };

  const parseCSV = (text, lang = 'pl') => {
    const rows = parseRows(text);
    if (rows.length < 1) {
      throw new Error('CSV is empty');
    }

    // Parse header
    const headers = rows[0];
    
    const expectedHeaders = ['name', 'category', 'prepTime', 'servings', 'caloriesPerServing',
      'proteinPerServing', 'carbsPerServing', 'fatsPerServing'];
    const legacyHeaders = {
      name: 'nazwa', category: 'kategoria', prepTime: 'czasprzygotowania',
      servings: 'porcje', caloriesPerServing: 'kalorienaporcje',
      proteinPerServing: 'bialkonaporcje', carbsPerServing: 'weglowodanynaporcje',
      fatsPerServing: 'tluszczenaporcje', imageUrl: 'urlzdjecia', steps: 'kroki'
    };

    // Validate essential headers
    const headerMap = {};
    headers.forEach((h, i) => {
      headerMap[h.toLowerCase().replace(/\s+/g, '')] = i;
    });
    Object.entries(legacyHeaders).forEach(([english, legacy]) => {
      const key = english.toLowerCase();
      if (headerMap[key] === undefined && headerMap[legacy] !== undefined) headerMap[key] = headerMap[legacy];
    });

    for (const required of expectedHeaders) {
      const cleanRequired = required.toLowerCase().replace(/\s+/g, '');
      if (!(cleanRequired in headerMap)) {
        throw new Error(`Missing required column: ${required}`);
      }
    }

    // Parse recipes
    const recipes = [];
    for (let lineIdx = 1; lineIdx < rows.length; lineIdx++) {
      try {
        const cells = rows[lineIdx].map((cell) => cell.trim());
        const nameIdx = headerMap.name;
        
        if (cells.length === 0 || nameIdx === undefined || !cells[nameIdx]) {
          continue; // Skip empty rows
        }

        const recipe = parseRecipeRow(cells, headerMap, lang);
        recipes.push(recipe);
      } catch (err) {
        console.warn(`⚠️ Skipping line ${lineIdx + 1}: ${err.message}`);
      }
    }

    return recipes;
  };

  const parseCSVLine = (line) => {
    const rows = parseRows(line, ';');
    if (rows.length > 1) throw new Error('Expected a single CSV row.');
    return rows.length ? rows[0].map((cell) => cell.trim()) : [''];
  };

  const parseRecipeRow = (cells, headerMap, lang) => {
    const get = (key) => {
      const cleanKey = key.toLowerCase().replace(/\s+/g, '');
      const idx = headerMap[cleanKey];
      return idx !== undefined ? cells[idx] : '';
    };

    const ingredients = parseIngredients(cells, headerMap);

    // Map category names
    const categoryMap = new Map([
      ['breakfast', { en: 'Breakfast', pl: 'Śniadanie' }],
      ['sniadanie', { en: 'Breakfast', pl: 'Śniadanie' }],
      ['lunch', { en: 'Lunch', pl: 'Obiad' }],
      ['obiad', { en: 'Lunch', pl: 'Obiad' }],
      ['dinner', { en: 'Dinner', pl: 'Kolacja' }],
      ['kolacja', { en: 'Dinner', pl: 'Kolacja' }],
      ['snack', { en: 'Snack', pl: 'Przekąska' }],
      ['przekaska', { en: 'Snack', pl: 'Przekąska' }]
    ]);
    
    const categoryInput = (get('kategoria') || get('category')).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/\s+/g, '');
    const categoryObj = categoryMap.get(categoryInput) || { en: 'Lunch', pl: 'Obiad' };

    const calories = parseFloat(get('kalorieNaPorcje') || get('caloriesPerServing')) || 0;
    const protein = parseFloat(get('bialkoNaPorcje') || get('proteinPerServing')) || 0;
    const carbs = parseFloat(get('weglowodanyNaPorcje') || get('carbsPerServing')) || 0;
    const fats = parseFloat(get('tluszczeNaPorcje') || get('fatsPerServing') || get('fatPerServing')) || 0;

    const recipe = {
      id: window.crypto.randomUUID(),
      name: { en: (get('nazwa') || get('name')), pl: (get('nazwa') || get('name')) },
      category: categoryObj,
      prepTime: get('czasPrzygotowania') || get('prepTime'),
      servings: parseInt(get('porcje') || get('servings')) || 1,
      calories,
      protein,
      carbs,
      fats,
      imageUrl: normalizeImageUrl(
        get('imageUrl') || get('image') || get('zdjecie') || get('urlZdjecia')
      ),
      ingredients: ingredients,
      steps: { en: parseSteps(get('kroki') || get('steps')), pl: parseSteps(get('kroki') || get('steps')) },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return recipe;
  };

  const parseIngredients = (cells, headerMap) => {
    const ingredients = [];
    
    for (let i = 1; i <= 20; i++) {
      const namePl = `skladnik${i}nazwa`.toLowerCase().replace(/\s+/g, '');
      const nameEn = `ingredient${i}name`.toLowerCase().replace(/\s+/g, '');
      const legacyAmount = `skladnik${i}ilosc`.toLowerCase().replace(/\s+/g, '');
      const amount = `ingredient${i}amount`.toLowerCase().replace(/\s+/g, '');
      const legacyUnit = `skladnik${i}jednostka`.toLowerCase().replace(/\s+/g, '');
      const unit = `ingredient${i}unit`.toLowerCase().replace(/\s+/g, '');
      const legacyPackageSize = `skladnik${i}rozmiaropakowania`.toLowerCase().replace(/\s+/g, '');
      const packageSize = `ingredient${i}packagesize`.toLowerCase().replace(/\s+/g, '');
      const legacyPackageUnit = `skladnik${i}jednostkaopakowania`.toLowerCase().replace(/\s+/g, '');
      const packageUnit = `ingredient${i}packageunit`.toLowerCase().replace(/\s+/g, '');

      const nameIdx = headerMap[namePl] !== undefined ? headerMap[namePl] : headerMap[nameEn];
      if (nameIdx === undefined || !cells[nameIdx]) continue;

      const ingredientName = cells[nameIdx];
      const ingredient = {
        name: { en: ingredientName, pl: ingredientName },
        amount: parseFloat(cells[headerMap[legacyAmount] !== undefined ? headerMap[legacyAmount] : headerMap[amount]] || 0),
        unit: cells[headerMap[legacyUnit] !== undefined ? headerMap[legacyUnit] : headerMap[unit]] || '',
        packageSize: parseFloat(cells[headerMap[legacyPackageSize] !== undefined ? headerMap[legacyPackageSize] : headerMap[packageSize]] || 0),
        packageUnit: cells[headerMap[legacyPackageUnit] !== undefined ? headerMap[legacyPackageUnit] : headerMap[packageUnit]] || ''
      };

      ingredients.push(ingredient);
    }

    return ingredients;
  };

  const parseSteps = (stepsText) => {
    if (!stepsText) return [];
    return stepsText.split('|').map(s => s.trim()).filter(s => s);
  };

  const createTemplate = (lang = 'pl') => {
    const headers = ['name', 'category', 'prepTime', 'servings', 'caloriesPerServing',
         'proteinPerServing', 'carbsPerServing', 'fatsPerServing', 'imageUrl',
        'ingredient1Name', 'ingredient1Amount', 'ingredient1Unit', 'ingredient1PackageSize', 'ingredient1PackageUnit',
        'ingredient2Name', 'ingredient2Amount', 'ingredient2Unit', 'ingredient2PackageSize', 'ingredient2PackageUnit',
        'ingredient3Name', 'ingredient3Amount', 'ingredient3Unit', 'ingredient3PackageSize', 'ingredient3PackageUnit',
        'steps'];
    
    const values = lang === 'pl'
      ? ['Przykładowy przepis', 'Obiad', '20 min', '2', '450', '35', '40', '12', '',
        'Pierś z kurczaka', '200', 'g', '500', 'g',
        'Ryż', '100', 'g', '1000', 'g',
        'Sól', '5', 'g', '100', 'g', 
        'Ugotuj ryż|Usmaż kurczaka|Podawaj na talerzu']
      : ['Example recipe', 'Lunch', '20 min', '2', '450', '35', '40', '12', '',
        'Chicken breast', '200', 'g', '500', 'g',
        'Rice', '100', 'g', '1000', 'g',
        'Salt', '5', 'g', '100', 'g',
        'Cook rice|Cook chicken|Serve on plate'];

    const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;
    return `\uFEFF${[headers, values].map((row) => row.map(quote).join(';')).join('\r\n')}`;
  };

  // Import dedupe key: first 50 chars of name + category + per-serving macros.
  const recipeImportKey = (recipe) => {
    const text = (value, lang) => (value && typeof value === 'object' ? (value[lang] || value.pl || value.en || '') : (value || ''));
    const fold = (s) => String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/\s+/g, '');
    const categoryAliases = new Map([['sniadanie', 'breakfast'], ['obiad', 'lunch'], ['kolacja', 'dinner'], ['przekaska', 'snack']]);
    const rawCategory = fold(text(recipe.category, 'en'));
    const num = (...values) => {
      const v = values.find((x) => x !== undefined && x !== null && x !== '');
      return Math.round((parseFloat(v) || 0) * 10) / 10;
    };
    return [
      String(text(recipe.name, 'pl')).trim().toLowerCase().slice(0, 50),
      categoryAliases.get(rawCategory) || rawCategory,
      num(recipe.calories, recipe.caloriesPerServing),
      num(recipe.protein, recipe.proteinPerServing),
      num(recipe.carbs, recipe.carbsPerServing),
      num(recipe.fats, recipe.fatPerServing, recipe.fatsPerServing)
    ].join('|');
  };

  // Matching rows overwrite the existing record (same id); others are added.
  const planRecipeImport = (parsedRecipes, existingRecipes = []) => {
    const byKey = new Map();
    existingRecipes.forEach((recipe) => {
      const key = recipeImportKey(recipe);
      if (!byKey.has(key)) byKey.set(key, recipe);
    });
    let added = 0;
    let updated = 0;
    const recipes = parsedRecipes.map((parsed) => {
      const key = recipeImportKey(parsed);
      const match = byKey.get(key);
      const recipe = match
        ? {
            ...parsed,
            imageUrl: normalizeImageUrl(parsed.imageUrl),
            id: match.id,
            createdAt: match.createdAt || parsed.createdAt
          }
        : {
            ...parsed,
            imageUrl: normalizeImageUrl(parsed.imageUrl),
            id: parsed.id || window.crypto.randomUUID()
          };
      if (match) updated++; else added++;
      byKey.set(key, recipe);
      return recipe;
    });
    return { recipes, total: parsedRecipes.length, added, updated };
  };

  window.MacroChef.recipeCsv = { 
    parseCSV, 
    parseRows,
    parseCSVLine, 
    parseRecipeRow, 
    parseIngredients, 
    parseSteps,
    recipeImportKey,
    planRecipeImport,
    createTemplate 
  };
})();
