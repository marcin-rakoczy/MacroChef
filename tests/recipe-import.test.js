(function () {
  const { assert, equal, test, run } = window.MacroChefTests;
  const recipeCsv = window.MacroChef.recipeCsv;
  const recipeFields = [
    'name', 'category', 'prepTime', 'servings', 'calories', 'protein', 'carbs', 'fats',
    'ingredients', 'steps'
  ];
  const ingredientFields = ['name', 'amount', 'unit', 'packageSize', 'packageUnit'];

  const assertTemplateMatchesRecipeForm = (lang, expectedHeaders) => {
    const template = recipeCsv.createTemplate(lang);
    const headers = template.replace(/^\uFEFF/, '').split(/\r?\n/)[0]
      .split(';').map((header) => header.replace(/^"|"$/g, ''));
    expectedHeaders.forEach((header) => assert(headers.includes(header), `Template is missing ${header}`));

    const [recipe] = recipeCsv.parse(template, lang);
    recipeFields.forEach((field) => assert(Object.prototype.hasOwnProperty.call(recipe, field),
      `Imported recipe is missing form field ${field}`));
    ingredientFields.forEach((field) => assert(
      Object.prototype.hasOwnProperty.call(recipe.ingredients[0], field),
      `Imported ingredient is missing form field ${field}`
    ));
    assert(recipe.ingredients.length >= 1, 'Template must provide at least one ingredient');
    assert(recipe.steps.en.length >= 1 && recipe.steps.pl.length >= 1, 'Template must provide cooking steps');
  };

  test('English template contains every recipe-form field and imports completely', () => {
    assertTemplateMatchesRecipeForm('en', [
      'name', 'category', 'prepTime', 'servings', 'caloriesPerServing', 'proteinPerServing',
      'carbsPerServing', 'fatsPerServing',
      'ingredient1Name', 'ingredient1Amount', 'ingredient1Unit', 'ingredient1PackageSize',
      'ingredient1PackageUnit', 'steps'
    ]);
  });

  test('Polish template contains every recipe-form field and imports completely', () => {
    assertTemplateMatchesRecipeForm('pl', [
      'nazwa', 'kategoria', 'czasPrzygotowania', 'porcje', 'kalorieNaPorcje', 'bialkoNaPorcje',
      'weglowodanyNaPorcje', 'tluszczeNaPorcje',
      'skladnik1Nazwa', 'skladnik1Ilosc', 'skladnik1Jednostka', 'skladnik1RozmiarOpakowania',
      'skladnik1JednostkaOpakowania', 'kroki'
    ]);
    const [recipe] = recipeCsv.parse(recipeCsv.createTemplate('pl'), 'pl');
    equal(recipe.category.en, 'Lunch', 'Polish category maps to the recipe form value');
    equal(recipe.category.pl, 'Obiad', 'Polish category is localized');
  });

  test('Import supports additional ingredients and maps Polish piece units', () => {
    const template = recipeCsv.createTemplate('pl').split(/\r?\n/);
    template[0] += ';skladnik3Nazwa;skladnik3Ilosc;skladnik3Jednostka;skladnik3RozmiarOpakowania;skladnik3JednostkaOpakowania';
    template[1] += ';Jajko;2;szt;10;szt';
    const [recipe] = recipeCsv.parse(template.join('\r\n'), 'pl');
    equal(recipe.ingredients.length, 3, 'Ingredient count');
    equal(recipe.ingredients[2].unit, 'pcs', 'Unit matches recipe form option');
    equal(recipe.ingredients[2].packageUnit, 'pcs', 'Package unit matches recipe form option');
  });

  test('Import preserves quoted delimiters and splits all cooking steps', () => {
    const template = recipeCsv.createTemplate('en')
      .replace('"Example recipe"', '"Chicken; rice"')
      .replace('"Cook rice|Cook chicken and serve"', '"Cook rice|Rest for 5 minutes|Serve"');
    const [recipe] = recipeCsv.parse(template, 'en');
    equal(recipe.name.en, 'Chicken; rice', 'Quoted semicolon in recipe name');
    equal(recipe.steps.en.length, 3, 'Cooking step count');
    equal(recipe.steps.en[1], 'Rest for 5 minutes', 'Second cooking step');
  });

  test('Import rejects missing cooking steps', () => {
    const csv = recipeCsv.createTemplate('en').replace('"Cook rice|Cook chicken and serve"', '""');
    let rejected = false;
    try { recipeCsv.parse(csv, 'en'); } catch (error) { rejected = /cooking step/.test(error.message); }
    assert(rejected, 'A recipe without cooking steps was accepted');
  });

  test('Import rejects categories outside the recipe form options', () => {
    const csv = recipeCsv.createTemplate('en').replace('"Lunch"', '"Dessert"');
    let rejected = false;
    try { recipeCsv.parse(csv, 'en'); } catch (error) { rejected = /category/.test(error.message); }
    assert(rejected, 'An unsupported recipe category was accepted');
  });

  test('Import rejects incomplete ingredient package data', () => {
    const csv = recipeCsv.createTemplate('en').replace('"500"', '""');
    let rejected = false;
    try { recipeCsv.parse(csv, 'en'); } catch (error) { rejected = /package size/.test(error.message); }
    assert(rejected, 'An ingredient without package size was accepted');
  });

  run();
})();
