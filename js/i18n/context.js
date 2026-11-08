window.MacroChef = window.MacroChef || {};

(function () {
  const { createContext, createElement, useContext, useEffect, useMemo, useState } = React;
  const I18nContext = createContext(null);

  function I18nProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem('macrochef_lang') || 'pl');
    const value = useMemo(() => ({
      lang,
      setLang,
      t: window.MacroChef.TRANSLATIONS[lang] || window.MacroChef.TRANSLATIONS.en,
      daysList: window.MacroChef.DAYS_TRANSLATED[lang] || window.MacroChef.DAYS_TRANSLATED.en
    }), [lang]);

    useEffect(() => {
      localStorage.setItem('macrochef_lang', lang);
    }, [lang]);

    return createElement(I18nContext.Provider, { value }, children);
  }

  function useI18n() {
    const value = useContext(I18nContext);
    if (!value) throw new Error('useI18n must be used within I18nProvider');
    return value;
  }

  window.MacroChef.I18nProvider = I18nProvider;
  window.MacroChef.useI18n = useI18n;
})();
