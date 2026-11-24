// Full CSV parser test - matching the actual parser
const fs = require('fs');

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
    const value = idx !== undefined ? cells[idx] : '';
    console.log(`  get('${key}') -> cleanKey='${cleanKey}' -> idx=${idx} -> value='${value}'`);
    return value;
  };

  const recipe = {
    id: 'test-id',
    name: get('nazwa') || get('name'),
    category: get('kategoria') || get('category'),
    prepTime: get('czasPrzygotowania') || get('prepTime'),
    servings: parseInt(get('porcje') || get('servings')) || 1,
    caloriesPerServing: parseFloat(get('kalorieNaPorcje') || get('caloriesPerServing')) || 0,
    proteinPerServing: parseFloat(get('bialkoNaPorcje') || get('proteinPerServing')) || 0,
    carbsPerServing: parseFloat(get('weglowodanyNaPorcje') || get('carbsPerServing')) || 0,
    fatPerServing: parseFloat(get('tluszczeNaPorcje') || get('fatPerServing')) || 0,
  };

  return recipe;
};

// Test
const csv = fs.readFileSync(require('path').join(__dirname, 'macrochef-breakfast-recipes.csv'), 'utf-8');
const recipes = parseCSV(csv);

console.log('\n=== FIRST RECIPE ===');
console.log(recipes[0]);
