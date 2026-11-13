window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  function AdBanner({ role }) {
    const { t } = window.MacroChef.useI18n();
    const [online, setOnline] = React.useState(navigator.onLine !== false);

    React.useEffect(() => {
      const update = () => setOnline(navigator.onLine !== false);
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }, []);

    if (!window.MacroChef.permissions.showAds(role)) return null;

    return (
      <aside aria-label={t.advertisement} className="max-w-7xl mx-auto px-4 pt-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold">{online ? t.advertisement : t.appTitle}</span>
          <span className="ml-2">{online ? t.adSlot : t.adOffline}</span>
        </div>
      </aside>
    );
  }

  window.MacroChef.components.AdBanner = AdBanner;
})();
