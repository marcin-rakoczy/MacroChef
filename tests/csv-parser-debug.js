// Debug CSV parser
const fs = require('fs');

// Simplified parser copy
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

// Read CSV
const csv = fs.readFileSync('P:\\Github\\MacroChef\\MacroChef\\tests\\macrochef-recipes-sniadania.csv', 'utf-8');

// Remove BOM
const cleanText = csv.replace(/^\uFEFF/, '');

// Get first line
const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
const headerLine = lines[0];
const dataLine = lines[1];

console.log('=== HEADER ===');
const headers = parseCSVLine(headerLine);
console.log('Headers:', headers);

// Build headerMap like the parser does
const headerMap = {};
headers.forEach((h, i) => {
  const cleanKey = h.toLowerCase().replace(/\s+/g, '');
  console.log(`Header ${i}: "${h}" -> "${cleanKey}"`);
  headerMap[cleanKey] = i;
});

console.log('\n=== DATA ===');
const cells = parseCSVLine(dataLine);
console.log(`Cells count: ${cells.length}`);

// Test specific columns
const testKeys = ['nazwa', 'kalorienaporce', 'bialkonaporce', 'weglowodanynaporce', 'tluszc;zenaporce'];
console.log('\n=== TESTING KEYS ===');
testKeys.forEach(key => {
  const cleanKey = key.toLowerCase().replace(/\s+/g, '');
  const idx = headerMap[cleanKey];
  console.log(`Key: "${key}" -> "${cleanKey}" -> index: ${idx} -> value: "${cells[idx] || 'NOT FOUND'}"`);
});

// Manual check
console.log('\n=== MANUAL CHECK ===');
console.log(`Cell 4 (kalorieNaPorcje): "${cells[4]}"`);
console.log(`Cell 5 (bialkoNaPorcje): "${cells[5]}"`);
console.log(`Cell 6 (weglowodanyNaPorcje): "${cells[6]}"`);
console.log(`Cell 7 (tluszczeNaPorcje): "${cells[7]}"`);
