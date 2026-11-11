window.MacroChef = window.MacroChef || {};

(function () {
  const { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } = React;
  const I18nContext = createContext(null);

  function I18nProvider({ children, repository = window.MacroChef.repositories }) {
    const [settings, setSettings] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const settingsRef = useRef(null);
    const queueRef = useRef(Promise.resolve());
    const versionRef = useRef(0);
    const pendingRef = useRef(false);

    useEffect(() => {
      let active = true;
      let subscription;
      async function load() {
        try {
          const defaults = {
            lang: localStorage.getItem('macrochef_lang') || 'pl',
            darkMode: localStorage.getItem('macrochef_dark') === 'true',
            colorTheme: localStorage.getItem('macrochef_color_theme') || 'emerald'
          };
          const initial = await repository.initializeSettings(defaults);
          if (!active) return;
          settingsRef.current = initial;
          setSettings(initial);
          setLoadError(false);
          subscription = repository.watchSettings().subscribe({
            next(value) {
              if (!active || pendingRef.current) return;
              if (!value) {
                console.error('Settings record is missing');
                setLoadError(true);
                return;
              }
              settingsRef.current = value;
              setSettings(value);
            },
            error(error) {
              console.error('Settings subscription error:', error);
              if (active) setLoadError(true);
            }
          });
        } catch (error) {
          console.error('Settings initialization error:', error);
          if (active) setLoadError(true);
        }
      }
      load();
      return () => {
        active = false;
        if (subscription) subscription.unsubscribe();
      };
    }, [repository, attempt]);

    const saveChanges = useCallback((changes) => {
      const next = { ...settingsRef.current, ...changes };
      settingsRef.current = next;
      setSettings(next);
      setSaveError(false);
      setSaving(true);
      pendingRef.current = true;
      const version = ++versionRef.current;
      queueRef.current = queueRef.current.then(async () => {
        try {
          const saved = await repository.saveSettings(next);
          if (version === versionRef.current) {
            settingsRef.current = saved;
            pendingRef.current = false;
            setSettings(saved);
            setSaving(false);
          }
        } catch (error) {
          console.error('Settings save error:', error);
          if (version === versionRef.current) {
            setSaveError(true);
            setSaving(false);
          }
        }
      });
    }, [repository]);
    const setLang = useCallback((lang) => saveChanges({ lang }), [saveChanges]);
    const setDarkMode = useCallback((darkMode) => saveChanges({ darkMode }), [saveChanges]);
    const setColorTheme = useCallback((colorTheme) => saveChanges({ colorTheme }), [saveChanges]);
    const lang = settings ? settings.lang : 'pl';
    const value = useMemo(() => ({
      lang,
      setLang,
      darkMode: settings && settings.darkMode,
      setDarkMode,
      colorTheme: settings && settings.colorTheme,
      setColorTheme,
      t: window.MacroChef.TRANSLATIONS[lang] || window.MacroChef.TRANSLATIONS.en,
      daysList: window.MacroChef.DAYS_TRANSLATED[lang] || window.MacroChef.DAYS_TRANSLATED.en
    }), [lang, setLang, settings && settings.darkMode, setDarkMode,
      settings && settings.colorTheme, setColorTheme]);

    if (loadError) {
      return createElement('div', { role: 'alert' },
        'Nie udało się wczytać ustawień / Could not load settings. ',
        createElement('button', { type: 'button', onClick: () => setAttempt((n) => n + 1) },
          'Spróbuj ponownie / Retry'));
    }
    if (!settings) return createElement('div', { role: 'status' }, 'Wczytywanie ustawień / Loading settings...');
    return createElement(I18nContext.Provider, { value },
      saving && createElement('div', { role: 'status', className: 'p-3 text-slate-500' },
        value.t.settingsSaving),
      saveError && createElement('div', {
        role: 'alert',
        className: 'p-3 text-red-600 dark:text-red-400'
      }, value.t.settingsSaveError, ' ',
      createElement('button', { type: 'button', className: 'underline', onClick: () => saveChanges({}) },
        value.t.retry)),
      children);
  }

  function useI18n() {
    const value = useContext(I18nContext);
    if (!value) throw new Error('useI18n must be used within I18nProvider');
    return value;
  }

  window.MacroChef.I18nProvider = I18nProvider;
  window.MacroChef.useI18n = useI18n;
})();
