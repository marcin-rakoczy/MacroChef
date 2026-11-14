// Admin Panel - Multi-tab management interface (Admin role only)
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { useState, useEffect } = React;

  function AdminPanel({ repository, session }) {
    const [activeTab, setActiveTab] = useState('users');
    const t = window.MacroChef.TRANSLATIONS[localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl'];

    // Only show Admin Panel for Admin role
    if (session?.role !== 'Admin') {
      return null;
    }

    const tabs = [
      { id: 'users', label: t.adminUsers || 'Users' },
      { id: 'recipes', label: t.adminRecipes || 'Recipes' },
      { id: 'products', label: t.adminProducts || 'Products' }
    ];

    // Assign components to variables for JSX rendering
    const AdminUsers = window.MacroChef.components.AdminUsers;
    const AdminRecipes = window.MacroChef.components.AdminRecipes;
    const AdminProducts = window.MacroChef.components.AdminProducts;

    return (
      <div className="admin-panel bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-700 flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 font-medium text-center transition ${
                activeTab === tab.id
                  ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'users' && AdminUsers && (
            <AdminUsers 
              repository={repository}
              session={session}
            />
          )}
          {activeTab === 'recipes' && AdminRecipes && (
            <AdminRecipes 
              repository={repository}
              session={session}
            />
          )}
          {activeTab === 'products' && AdminProducts && (
            <AdminProducts 
              repository={repository}
              session={session}
            />
          )}
        </div>
      </div>
    );
  }

  window.MacroChef.components.AdminPanel = AdminPanel;
})();
