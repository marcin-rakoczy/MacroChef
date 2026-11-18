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
    session,
    onSignOut,
    syncStatus
  }) {
    const { t, lang, setLang } = window.MacroChef.useI18n();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [signingOut, setSigningOut] = React.useState(false);
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
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [isMenuOpen]);

    const handleSignOut = async () => {
      if (!onSignOut || signingOut) return;
      setSigningOut(true);
      try {
        await onSignOut();
        setIsMenuOpen(false);
      } finally {
        setSigningOut(false);
      }
    };

    return (
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2.5 rounded-2xl text-white shadow-md shadow-emerald-500/20">
              <Icon name="chef-hat" className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  {t.appTitle}
                </h1>
                {window.MacroChef.ENV !== 'PROD' && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    window.MacroChef.ENV === 'TEST'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                  }`}>
                    {window.MacroChef.ENV}
                  </span>
                )}
                {window.MacroChef.ENV !== 'PROD' && (
                  <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    v{window.MacroChef.APP_VERSION || '0.0.0'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  {t.appSubtitle}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Icon name="database" className="w-3 h-3 text-emerald-500" />
                  <span>{t.dbStatus}</span>
                </span>
                {syncStatus && <span role="status" title={syncStatus.message || ''} aria-label={[t[`sync_${syncStatus.state}`], syncStatus.message].filter(Boolean).join(': ')} className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {t[`sync_${syncStatus.state}`]}
                </span>}
              </div>
            </div>
          </div>

          {/* HAMBURGER SETTINGS MENU IN TOP RIGHT CORNER */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`w-11 h-11 rounded-xl border transition-all flex items-center justify-center ${
                isMenuOpen
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              aria-label={t.settingsMenu || 'Settings menu'}
              aria-expanded={isMenuOpen}
              aria-controls="macrochef-settings-drawer"
              title={t.settingsMenu || 'Menu'}
            >
              <Icon name={isMenuOpen ? 'x' : 'menu'} className="w-5 h-5" />
            </button>

            {/* DROPDOWN MENU */}
            {isMenuOpen && (
              <>
                <button
                  type="button"
                  className="macrochef-drawer-backdrop fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] cursor-default"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label={t.authClose}
                  tabIndex={-1}
                />
                <aside
                  id="macrochef-settings-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t.settingsMenu || 'Settings menu'}
                  className="macrochef-drawer fixed inset-y-0 right-0 z-50 w-[min(320px,calc(100vw-2rem))] md:w-80 overflow-y-auto bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-2xl p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.settingsMenu || 'Menu'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-11 h-11 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
                      aria-label={t.authClose}
                    >
                      <Icon name="x" className="w-5 h-5" />
                    </button>
                  </div>

                  <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Icon name="user" className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.authTitle}</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={session?.email || ''}>
                          {session?.email || '—'}
                        </p>
                        <span className="inline-flex mt-2 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                          {session ? (t[`authRole${session.role}`] || session.role) : '—'}
                        </span>
                      </div>
                    </div>
                    {session?.offline && (
                      <p role="status" className="mt-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                        {t.authOfflineSession}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={signingOut}
                      onClick={handleSignOut}
                      className="mt-3 min-h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 transition-colors"
                    >
                      <Icon name="log-out" className="w-4 h-4" />
                      <span>{t.authSignOut}</span>
                    </button>
                  </section>

                  <div className="h-px bg-slate-200/80 dark:bg-slate-700/80" />
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
                      className={`w-full min-h-11 flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition-all ${
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
                      className={`w-full min-h-11 flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition-all ${
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
                      className={`w-full min-h-11 flex items-center justify-between p-2 rounded-xl text-xs font-semibold border transition-all ${
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
                      className={`min-h-11 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
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
                      className={`min-h-11 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
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
                      className={`min-h-11 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
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
                      className={`min-h-11 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
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

                {window.MacroChef.ENV === 'PROD' && (
                  <>
                    <div className="h-px bg-slate-200/80 dark:bg-slate-700/80" />
                    <div className="md:hidden pb-2 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      MacroChef • {t.version || 'Version'} {window.MacroChef.APP_VERSION || '0.0.0'}
                    </div>
                  </>
                )}
                </aside>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  window.MacroChef.components.Header = Header;
})();
