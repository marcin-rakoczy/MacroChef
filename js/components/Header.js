// Header Component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;

  function Header({ t, lang, setLang, darkMode, setDarkMode }) {
    return (
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2.5 rounded-2xl text-white shadow-md shadow-emerald-500/20">
              <Icon name="chef-hat" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                {t.appTitle}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  {t.appSubtitle}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Icon name="database" className="w-3 h-3 text-emerald-500" />
                  <span>{t.dbStatus}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* LANGUAGE SWITCHER */}
            <button
              onClick={() => setLang(lang === 'en' ? 'pl' : 'en')}
              className="flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Switch language"
            >
              <Icon name="globe" className="w-4 h-4 text-emerald-500" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* DARK MODE TOGGLE */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:opacity-80 transition-opacity"
              title="Toggle theme"
            >
              <Icon name={darkMode ? 'sun' : 'moon'} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  window.MacroChef.components.Header = Header;
})();

