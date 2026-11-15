/**
 * Enhanced Recipe CSV Parser
 * Supports unlimited ingredients and Polish/English formats
 * Handles semicolon-delimited CSV with proper quote handling
 */
window.MacroChef = window.MacroChef || {};

(function () {
  const parseCSV = (text, lang = 'pl') => {
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    
    // Split into lines first (handle both \r\n and \n)
    let lines = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentLine += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \r\n
        }
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length < 1) {
      throw new Error('CSV is empty');
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    const expectedHeaders = lang === 'pl'
      ? ['nazwa', 'kategoria', 'czasPrzygotowania', 'porcje', 'kalorieNaPorcje', 
         'bialkoNaPorcje', 'weglowodanyNaPorcje', 'tluszczeNaPorcje']
      : ['name', 'category', 'prepTime', 'servings', 'caloriesPerServing',
         'proteinPerServing', 'carbsPerServing', 'fatsPerServing'];

    // Validate essential headers
    const headerMap = {};
    headers.forEach((h, i) => {
      headerMap[h.toLowerCase().replace(/\s+/g, '')] = i;
    });

    for (const required of expectedHeaders) {
      const cleanRequired = required.toLowerCase().replace(/\s+/g, '');
      if (!(cleanRequired in headerMap)) {
        throw new Error(`Missing required column: ${required}`);
      }
    }

    // Parse recipes
    const recipes = [];
    for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
      try {
        const cells = parseCSVLine(lines[lineIdx]);
        const nameKey = 'nazwa';
        const nameIdx = headerMap[nameKey];
        
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
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ';' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());

    return cells;
  };

  const parseRecipeRow = (cells, headerMap, lang) => {
    const get = (key) => {
      const cleanKey = key.toLowerCase().replace(/\s+/g, '');
      const idx = headerMap[cleanKey];
      return idx !== undefined ? cells[idx] : '';
    };

    const ingredients = parseIngredients(cells, headerMap);

    const recipe = {
      id: window.crypto.randomUUID(),
      name: get('nazwa') || get('name'),
      category: get('kategoria') || get('category'),
      prepTime: get('czasPrzygotowania') || get('prepTime'),
      servings: parseInt(get('porcje') || get('servings')) || 1,
      caloriesPerServing: parseFloat(get('kalorieNaPorcje') || get('caloriesPerServing')) || 0,
      proteinPerServing: parseFloat(get('bialkoNaPorcje') || get('proteinPerServing')) || 0,
      carbsPerServing: parseFloat(get('weglowodanyNaPorcje') || get('carbsPerServing')) || 0,
      fatPerServing: parseFloat(get('tluszczeNaPorcje') || get('fatPerServing')) || 0,
      ingredients: ingredients,
      steps: parseSteps(get('kroki') || get('steps')),
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
      const ilosc = `skladnik${i}ilosc`.toLowerCase().replace(/\s+/g, '');
      const amount = `ingredient${i}amount`.toLowerCase().replace(/\s+/g, '');
      const jednostka = `skladnik${i}jednostka`.toLowerCase().replace(/\s+/g, '');
      const unit = `ingredient${i}unit`.toLowerCase().replace(/\s+/g, '');
      const rozmiar = `skladnik${i}rozmiaropakowania`.toLowerCase().replace(/\s+/g, '');
      const packageSize = `ingredient${i}packagesize`.toLowerCase().replace(/\s+/g, '');
      const jednostkaOpak = `skladnik${i}jednostkaopakowania`.toLowerCase().replace(/\s+/g, '');
      const packageUnit = `ingredient${i}packageunit`.toLowerCase().replace(/\s+/g, '');

      const nameIdx = headerMap[namePl] !== undefined ? headerMap[namePl] : headerMap[nameEn];
      if (nameIdx === undefined || !cells[nameIdx]) continue;

      const ingredient = {
        name: cells[nameIdx],
        amount: parseFloat(cells[headerMap[ilosc] || headerMap[amount]] || 0),
        unit: cells[headerMap[jednostka] || headerMap[unit]] || '',
        packageSize: parseFloat(cells[headerMap[rozmiar] || headerMap[packageSize]] || 0),
        packageUnit: cells[headerMap[jednostkaOpak] || headerMap[packageUnit]] || ''
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
    const headers = lang === 'pl'
      ? ['nazwa', 'kategoria', 'czasPrzygotowania', 'porcje', 'kalorieNaPorcje', 
         'bialkoNaPorcje', 'weglowodanyNaPorcje', 'tluszczeNaPorcje',
        'skladnik1Nazwa', 'skladnik1Ilosc', 'skladnik1Jednostka', 'skladnik1RozmiarOpakowania', 'skladnik1JednostkaOpakowania',
        'skladnik2Nazwa', 'skladnik2Ilosc', 'skladnik2Jednostka', 'skladnik2RozmiarOpakowania', 'skladnik2JednostkaOpakowania',
        'skladnik3Nazwa', 'skladnik3Ilosc', 'skladnik3Jednostka', 'skladnik3RozmiarOpakowania', 'skladnik3JednostkaOpakowania',
        'kroki']
      : ['name', 'category', 'prepTime', 'servings', 'caloriesPerServing', 
         'proteinPerServing', 'carbsPerServing', 'fatsPerServing',
        'ingredient1Name', 'ingredient1Amount', 'ingredient1Unit', 'ingredient1PackageSize', 'ingredient1PackageUnit',
        'ingredient2Name', 'ingredient2Amount', 'ingredient2Unit', 'ingredient2PackageSize', 'ingredient2PackageUnit',
        'ingredient3Name', 'ingredient3Amount', 'ingredient3Unit', 'ingredient3PackageSize', 'ingredient3PackageUnit',
        'steps'];
    
    const values = lang === 'pl'
      ? ['Przykładowy przepis', 'Obiad', '20 min', '2', '450', '35', '40', '12',
        'Pierś z kurczaka', '200', 'g', '500', 'g',
        'Ryż', '100', 'g', '1000', 'g',
        'Sól', '5', 'g', '100', 'g', 
        'Ugotuj ryż|Usmaż kurczaka|Podawaj na talerzu']
      : ['Example recipe', 'Lunch', '20 min', '2', '450', '35', '40', '12',
        'Chicken breast', '200', 'g', '500', 'g',
        'Rice', '100', 'g', '1000', 'g',
        'Salt', '5', 'g', '100', 'g',
        'Cook rice|Cook chicken|Serve on plate'];

    const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;
    return `\uFEFF${[headers, values].map((row) => row.map(quote).join(';')).join('\r\n')}`;
  };

  window.MacroChef.recipeCsv = { 
    parseCSV, 
    parseCSVLine, 
    parseRecipeRow, 
    parseIngredients, 
    parseSteps,
    createTemplate 
  };
})();
