(async function () {
  const result = document.getElementById('result');
  const initialLanguage = localStorage.getItem('macrochef_lang');
  const root = ReactDOM.createRoot(document.getElementById('test-root'));
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
    return React.createElement(I18nProvider, null, React.createElement(Consumer));
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
    assert(localStorage.getItem('macrochef_lang') === 'en', 'Language was not persisted');
    lastValue.setLang('unsupported');
    await wait();
    assert(lastValue.t === TRANSLATIONS.en && lastValue.daysList === DAYS_TRANSLATED.en, 'Fallback failed');
    result.textContent = 'PASS: injection, memoization, language switch, persistence, fallback';
  } catch (error) {
    console.error(error);
    result.textContent = `FAIL: ${error.stack || error}`;
  } finally {
    root.unmount();
    if (initialLanguage === null) localStorage.removeItem('macrochef_lang');
    else localStorage.setItem('macrochef_lang', initialLanguage);
  }
})();
