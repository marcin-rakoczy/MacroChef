// Navigation Component (Desktop Tabs & Mobile Bottom Bar)
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { Icon } = window.MacroChef.components;

  function Navigation({ activeTab, setActiveTab, isMobile = false }) {
    const { t } = window.MacroChef.useI18n();
    const tabs = [
      { id: 'planner', label: t.planner, icon: 'calendar' },
      { id: 'recipes', label: t.recipes, icon: 'book-open' },
      { id: 'batch', label: t.batch, icon: 'utensils' },
      { id: 'shopping', label: t.shopping, icon: 'shopping-bag' },
      { id: 'tracker', label: t.tracker, icon: 'pie-chart' }
    ];

    if (isMobile) {
      return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center space-y-1 py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-emerald-500 font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Icon name={tab.icon} className="w-5 h-5" />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      );
    }

    return (
      <div className="hidden md:flex space-x-2 border-b border-slate-200 dark:border-slate-800 mb-6 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon name={tab.icon} className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  window.MacroChef.components.Navigation = Navigation;
})();
