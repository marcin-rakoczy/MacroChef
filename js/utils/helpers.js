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

  toPascalCase(str) {
    if (!str) return '';
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
};

