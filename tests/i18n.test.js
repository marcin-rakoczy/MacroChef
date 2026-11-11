(async function () {
  const result = document.getElementById('result');
  const initialLanguage = localStorage.getItem('macrochef_lang');
  const root = ReactDOM.createRoot(document.getElementById('test-root'));
  const name = `MacroChef-i18n-test-${crypto.randomUUID()}`;
  const repository = new window.MacroChef.DexieCalorieRepository(name, { seedDefaults: false });
  const { I18nProvider, useI18n, TRANSLATIONS, DAYS_TRANSLATED } = window.MacroChef;
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const wait = () => new Promise((resolve) => setTimeout(resolve, 50));
  let renders = 0;
  let lastValue;
  let updateParent;
  const Consumer = React.memo(function () {
    lastValue = useI18n();
    renders++;
    return React.createElement('span', null, lastValue.t.planner);
  });
  function Parent() {
    const [, setCount] = React.useState(0);
    updateParent = () => setCount((count) => count + 1);
    return React.createElement(I18nProvider, { repository }, React.createElement(Consumer));
  }
  try {
    localStorage.setItem('macrochef_lang', 'pl');
    root.render(React.createElement(Parent));
    await wait();
    assert(lastValue.lang === 'pl' && lastValue.t === TRANSLATIONS.pl &&
      lastValue.daysList === DAYS_TRANSLATED.pl, 'Initial language injection failed');
    const previous = lastValue;
    const count = renders;
    updateParent();
    await wait();
    assert(lastValue === previous && renders === count, 'Unrelated render changed context');
    lastValue.setLang('en');
    await wait();
    assert(lastValue.lang === 'en' && lastValue.t === TRANSLATIONS.en &&
      lastValue.daysList === DAYS_TRANSLATED.en, 'Language switch failed');
    const stored = await repository.db.settings.toCollection().first();
    assert(stored.lang === 'en', 'Language was not persisted to IndexedDB');
    lastValue.setDarkMode(true);
    lastValue.setColorTheme('violet');
    lastValue.setLang('pl');
    await wait();
    const updated = await repository.db.settings.toCollection().first();
    assert(updated.darkMode === true && updated.colorTheme === 'violet' && updated.lang === 'pl',
      'Rapid settings changes were not preserved');
    const save = repository.saveSettings.bind(repository);
    let fail = true;
    repository.saveSettings = (settings) => {
      if (fail) {
        fail = false;
        return Promise.reject(new Error('Simulated settings save failure'));
      }
      return save(settings);
    };
    lastValue.setColorTheme('mono');
    await wait();
    assert(document.querySelector('[role="alert"]'), 'Save failure was not displayed');
    document.querySelector('[role="alert"] button').click();
    await wait();
    assert(!document.querySelector('[role="alert"]') &&
      (await repository.db.settings.toCollection().first()).colorTheme === 'mono',
      'Settings retry failed');
    lastValue.setLang('unsupported');
    await wait();
    assert(lastValue.t === TRANSLATIONS.en && lastValue.daysList === DAYS_TRANSLATED.en, 'Fallback failed');
    result.textContent = 'PASS: injection, memoization, language switch, persistence, fallback';
  } catch (error) {
    console.error(error);
    result.textContent = `FAIL: ${error.stack || error}`;
  } finally {
    root.unmount();
    repository.db.close();
    await Dexie.delete(name);
    if (initialLanguage === null) localStorage.removeItem('macrochef_lang');
    else localStorage.setItem('macrochef_lang', initialLanguage);
  }
})();
