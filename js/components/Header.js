// Header Component with Dropdown Hamburger Menu & Color Tone Selector
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;

  function Header({
    darkMode,
    setDarkMode,
    colorTheme,
    setColorTheme,
    onOpenAuth
  }) {
    const { t, lang, setLang } = window.MacroChef.useI18n();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuRef = React.useRef(null);

    // Close menu when clicking outside or pressing Escape
    React.useEffect(() => {
      function handleClickOutside(event) {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setIsMenuOpen(false);
        }
      }

      function handleKeyDown(event) {
        if (event.key === 'Escape') {
          setIsMenuOpen(false);
        }
      }

      if (isMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isMenuOpen]);

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

          {/* HAMBURGER SETTINGS MENU IN TOP RIGHT CORNER */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onOpenAuth} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700" aria-label={t.authTitle} title={t.authTitle}>
              <Icon name="user" className="w-5 h-5" />
            </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                isMenuOpen
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              aria-label={t.settingsMenu || 'Settings menu'}
              title={t.settingsMenu || 'Menu'}
            >
              <Icon name={isMenuOpen ? 'x' : 'menu'} className="w-5 h-5" />
            </button>

            {/* DROPDOWN MENU */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-3.5 space-y-3.5 animate-in fade-in zoom-in-95">
                {/* 1. COLOR TONE / PALETTE SELECTION */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                    <Icon name="palette" className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.colorPalette}</span>
                  </div>
                  <div className="space-y-1.5">
                    {/* Palette 1: Emerald & Teal (Default / Current) */}
                    <button
                      type="button"
                      onClick={() => setColorTheme('emerald')}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition-all ${
                        colorTheme === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 rounded-full overflow-hidden border border-white/20 shadow-sm shrink-0">
                          <span className="w-1/2 h-full bg-[#10b981]"></span>
                          <span className="w-1/2 h-full bg-[#14b8a6]"></span>
                        </span>
                        <span>{t.themeEmerald}</span>
                      </div>
                      {colorTheme === 'emerald' && (
                        <Icon name="check" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </button>

                    {/* Palette 2: Monochrome / Grayscale */}
                    <button
                      type="button"
                      onClick={() => setColorTheme('mono')}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition-all ${
                        colorTheme === 'mono'
                          ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-500 text-zinc-900 dark:text-zinc-100 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 rounded-full overflow-hidden border border-white/20 shadow-sm shrink-0">
                          <span className="w-1/2 h-full bg-[#27272a]"></span>
                          <span className="w-1/2 h-full bg-[#71717a]"></span>
                        </span>
                        <span>{t.themeMono}</span>
                      </div>
                      {colorTheme === 'mono' && (
                        <Icon name="check" className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      )}
                    </button>

                    {/* Palette 3: Modern Violet & Indigo */}
                    <button
                      type="button"
                      onClick={() => setColorTheme('violet')}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition-all ${
                        colorTheme === 'violet'
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 rounded-full overflow-hidden border border-white/20 shadow-sm shrink-0">
                          <span className="w-1/2 h-full bg-[#6366f1]"></span>
                          <span className="w-1/2 h-full bg-[#8b5cf6]"></span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span>{t.themeViolet}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {t.trendingBadge}
                          </span>
                        </div>
                      </div>
                      {colorTheme === 'violet' && (
                        <Icon name="check" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-200/80 dark:bg-slate-700/80" />

                {/* 2. THEME MODE (LIGHT / DARK) */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                    <Icon name={darkMode ? 'moon' : 'sun'} className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.theme}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDarkMode(false)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                        !darkMode
                          ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon name="sun" className="w-3.5 h-3.5" />
                      <span>{t.themeLight}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDarkMode(true)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                        darkMode
                          ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon name="moon" className="w-3.5 h-3.5" />
                      <span>{t.themeDark}</span>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-200/80 dark:bg-slate-700/80" />

                {/* 3. LANGUAGE SECTION */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                    <Icon name="globe" className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.language}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setLang('pl')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                        lang === 'pl'
                          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>🇵🇱</span>
                      <span>{t.polish}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                        lang === 'en'
                          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>🇬🇧</span>
                      <span>{t.english}</span>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-200/80 dark:bg-slate-700/80" />
                <div className="text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  MacroChef v{window.MacroChef.APP_VERSION || '0.0.0'}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </header>
    );
  }

  window.MacroChef.components.Header = Header;
})();
