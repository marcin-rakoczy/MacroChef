// Utility helpers for localization & strings
window.MacroChef = window.MacroChef || {};

window.MacroChef.helpers = {
  getLocalized(val, lang = 'en') {
    if (!val) return '';
    if (typeof val === 'object' && val !== null) {
      return val[lang] || val.en || Object.values(val)[0] || '';
    }
    return String(val);
  },

  // Meal order: breakfast, lunch, dinner, snack; unknown categories follow alphabetically
  compareMealCategories(a, b, lang = 'pl') {
    const mealRank = new Map([
      ['śniadanie', 0], ['breakfast', 0],
      ['obiad', 1], ['lunch', 1],
      ['kolacja', 2], ['dinner', 2],
      ['przekąska', 3], ['snack', 3]
    ]);
    const rank = (cat) => {
      const r = mealRank.get(String(cat).trim().toLowerCase());
      return r === undefined ? 99 : r;
    };
    return rank(a) - rank(b) || String(a).localeCompare(String(b), lang);
  },

  toPascalCase(str) {
    if (!str) return '';
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
};

