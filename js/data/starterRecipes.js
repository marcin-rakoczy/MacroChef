// Bilingual starter recipes for MacroChef
window.MacroChef = window.MacroChef || {};

window.MacroChef.STARTER_RECIPES = [
  {
    id: 'rec-1',
    name: { en: 'Mediterranean Chicken & Quinoa Bowl', pl: 'Śródziemnomorska Miska z Kurczakiem i Komosą' },
    category: { en: 'Lunch', pl: 'Obiad' },
    prepTime: '25 min',
    servings: 3,
    calories: 520,
    protein: 42,
    carbs: 48,
    fats: 16,
    ingredients: [
      { name: { en: 'Chicken Breast', pl: 'Pierś z Kurczaka' }, amount: 500, unit: 'g', packageSize: 500, packageUnit: 'g' },
      { name: { en: 'Quinoa (dry)', pl: 'Komosa Ryżowa (sucha)' }, amount: 180, unit: 'g', packageSize: 250, packageUnit: 'g' },
      { name: { en: 'Cherry Tomatoes', pl: 'Pomidorki Koktajlowe' }, amount: 200, unit: 'g', packageSize: 250, packageUnit: 'g' },
      { name: { en: 'Cucumber', pl: 'Ogórek' }, amount: 1, unit: 'pcs', packageSize: 1, packageUnit: 'pcs' },
      { name: { en: 'Feta Cheese', pl: 'Ser Feta' }, amount: 100, unit: 'g', packageSize: 150, packageUnit: 'g' },
      { name: { en: 'Olive Oil', pl: 'Oliwa z Oliwek' }, amount: 20, unit: 'ml', packageSize: 500, packageUnit: 'ml' }
    ],
    steps: {
      en: [
        'Cook dry quinoa in double the volume of water with a pinch of salt for 15 minutes.',
        'Dice chicken breast, season with oregano, garlic, salt, and pepper.',
        'Pan-fry chicken in olive oil over medium-high heat until golden (8-10 min).',
        'Chop cucumber and halve cherry tomatoes.',
        'Divide quinoa, chicken, fresh veggies, and crumbled feta evenly into 3 meal prep containers.'
      ],
      pl: [
        'Ugotuj komosę ryżową w podwójnej ilości wody ze szczyptą soli przez 15 minut.',
        'Pokrój pierś z kurczaka w kostkę, dopraw oregano, czosnkiem, solą i pieprzem.',
        'Usmaż kurczaka na oliwie z oliwek na średnim ogniu na złoty kolor (8-10 min).',
        'Pokrój ogórka i przekrój pomidorki na pół.',
        'Rozdziel komosę, kurczaka, warzywa i pokruszoną fetę na 3 pojemniki do meal prepu.'
      ]
    }
  },
  {
    id: 'rec-2',
    name: { en: 'Berry Protein Oats Bowl', pl: 'Owsianka Białkowa z Owocami Leśnymi' },
    category: { en: 'Breakfast', pl: 'Śniadanie' },
    prepTime: '10 min',
    servings: 1,
    calories: 410,
    protein: 30,
    carbs: 55,
    fats: 8,
    ingredients: [
      { name: { en: 'Rolled Oats', pl: 'Płatki Owsiane' }, amount: 60, unit: 'g', packageSize: 500, packageUnit: 'g' },
      { name: { en: 'Whey Protein Powder', pl: 'Odżywka Białkowa' }, amount: 30, unit: 'g', packageSize: 1000, packageUnit: 'g' },
      { name: { en: 'Frozen Mixed Berries', pl: 'Mrożone Owoce Leśne' }, amount: 100, unit: 'g', packageSize: 400, packageUnit: 'g' },
      { name: { en: 'Almond Milk', pl: 'Mleko Migdałowe' }, amount: 200, unit: 'ml', packageSize: 1000, packageUnit: 'ml' },
      { name: { en: 'Chia Seeds', pl: 'Nasiona Chia' }, amount: 10, unit: 'g', packageSize: 200, packageUnit: 'g' }
    ],
    steps: {
      en: [
        'Combine oats, chia seeds, and almond milk in a saucepan.',
        'Heat on stove for 3-5 minutes until warm and thick.',
        'Stir in whey protein powder until smooth.',
        'Top with warm frozen berries and serve.'
      ],
      pl: [
        'Połącz płatki owsiane, nasiona chia i mleko migdałowe w rondelku.',
        'Podgrzewaj na małym ogniu przez 3-5 minut, aż zgęstnieje.',
        'Wymieszaj z odżywką białkową do uzyskania gładkiej konsystencji.',
        'Udekoruj ciepłymi owocami leśnymi i podawaj.'
      ]
    }
  },
  {
    id: 'rec-3',
    name: { en: 'Batch Beef & Sweet Potato Curry', pl: 'Curry z Wołowiną i Batatami na Kilka Dni' },
    category: { en: 'Dinner', pl: 'Kolacja' },
    prepTime: '40 min',
    servings: 4,
    calories: 610,
    protein: 45,
    carbs: 52,
    fats: 22,
    ingredients: [
      { name: { en: 'Lean Ground Beef', pl: 'Mielona Wołowina (chuda)' }, amount: 600, unit: 'g', packageSize: 500, packageUnit: 'g' },
      { name: { en: 'Sweet Potatoes', pl: 'Bataty' }, amount: 500, unit: 'g', packageSize: 1000, packageUnit: 'g' },
      { name: { en: 'Light Coconut Milk', pl: 'Mleczko Kokosowe Light' }, amount: 400, unit: 'ml', packageSize: 400, packageUnit: 'ml' },
      { name: { en: 'Red Curry Paste', pl: 'Czerwona Pasta Curry' }, amount: 50, unit: 'g', packageSize: 100, packageUnit: 'g' },
      { name: { en: 'Baby Spinach', pl: 'Świeży Szpinak' }, amount: 150, unit: 'g', packageSize: 200, packageUnit: 'g' }
    ],
    steps: {
      en: [
        'Brown ground beef in a large pot over medium heat.',
        'Add red curry paste and stir for 1 minute until fragrant.',
        'Add peeled diced sweet potatoes, coconut milk, and 100ml water.',
        'Simmer gently covered for 20 minutes.',
        'Fold in spinach until wilted. Divide into 4 meal containers.'
      ],
      pl: [
        'Zarumień mieloną wołowinę w dużym garnku.',
        'Dodaj pastę curry i smaż przez 1 minutę.',
        'Dodaj obrane i pokrojone w kostkę bataty, mleczko kokosowe oraz 100ml wody.',
        'Gotuj pod przykryciem na wolnym ogniu przez 20 minut.',
        'Dodaj szpinak, aż zmniejszy objętość. Podziel na 4 pojemniki.'
      ]
    }
  },
  {
    id: 'rec-4',
    name: { en: 'Greek Yogurt & Almond Snack', pl: 'Jogurt Grecki z Migdałami i Miodem' },
    category: { en: 'Snack', pl: 'Przekąska' },
    prepTime: '3 min',
    servings: 1,
    calories: 260,
    protein: 22,
    carbs: 12,
    fats: 14,
    ingredients: [
      { name: { en: 'Greek Yogurt (0%)', pl: 'Jogurt Grecki (0%)' }, amount: 200, unit: 'g', packageSize: 400, packageUnit: 'g' },
      { name: { en: 'Almonds', pl: 'Migdały' }, amount: 20, unit: 'g', packageSize: 200, packageUnit: 'g' },
      { name: { en: 'Honey', pl: 'Miód' }, amount: 10, unit: 'g', packageSize: 350, packageUnit: 'g' }
    ],
    steps: {
      en: [
        'Spoon Greek yogurt into a bowl.',
        'Top with raw almonds and drizzle with honey.'
      ],
      pl: [
        'Nałóż jogurt grecki do miseczki.',
        'Posyp migdałami i polej miodem.'
      ]
    }
  }
];

