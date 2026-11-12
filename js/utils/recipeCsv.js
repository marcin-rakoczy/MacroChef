window.MacroChef = window.MacroChef || {};

(function () {
  const createTemplate = (lang) => {
    const headers = lang === 'pl'
      ? ['nazwa', 'kategoria', 'czasPrzygotowania', 'porcje', 'kalorieNaPorcje', 'bialkoNaPorcje', 'weglowodanyNaPorcje', 'tluszczeNaPorcje',
        'skladnik1Nazwa', 'skladnik1Ilosc', 'skladnik1Jednostka', 'skladnik1RozmiarOpakowania', 'skladnik1JednostkaOpakowania',
        'skladnik2Nazwa', 'skladnik2Ilosc', 'skladnik2Jednostka', 'skladnik2RozmiarOpakowania', 'skladnik2JednostkaOpakowania', 'kroki']
      : ['name', 'category', 'prepTime', 'servings', 'caloriesPerServing', 'proteinPerServing', 'carbsPerServing', 'fatsPerServing',
        'ingredient1Name', 'ingredient1Amount', 'ingredient1Unit', 'ingredient1PackageSize', 'ingredient1PackageUnit',
        'ingredient2Name', 'ingredient2Amount', 'ingredient2Unit', 'ingredient2PackageSize', 'ingredient2PackageUnit', 'steps'];
    const values = lang === 'pl'
      ? ['Przykładowy przepis', 'Obiad', '20 min', '2', '450', '35', '40', '12',
        'Pierś z kurczaka', '200', 'g', '500', 'g',
        'Ryż', '100', 'g', '1000', 'g', 'Ugotuj ryż|Usmaż kurczaka i podawaj']
      : ['Example recipe', 'Lunch', '20 min', '2', '450', '35', '40', '12',
        'Chicken breast', '200', 'g', '500', 'g',
        'Rice', '100', 'g', '1000', 'g', 'Cook rice|Cook chicken and serve'];
    const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;
    return `\uFEFF${[headers, values].map((row) => row.map(quote).join(';')).join('\r\n')}`;
  };

  window.MacroChef.recipeCsv = { createTemplate };
})();
