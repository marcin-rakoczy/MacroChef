// Admin Users Management - Full CRUD + Bulk Operations
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { useState, useEffect } = React;

  function AdminUsers({ repository, session }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [filterRole, setFilterRole] = useState('');
    const [bulkAction, setBulkAction] = useState('');
    const [bulkNewRole, setBulkNewRole] = useState('');
    const t = window.MacroChef.TRANSLATIONS[localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl'];

    const roles = ['Admin', 'Tester', 'UserWithAdvertisement'];

    // Load all users
    useEffect(() => {
      async function loadUsers() {
        setLoading(true);
        setError('');
        try {
          if (!window.MacroChef.supabaseClient) throw new Error('Supabase not available');
          const { data, error: err } = await window.MacroChef.supabaseClient
            .from('user_profiles')
            .select('user_id, email, role, created_at')
            .order('created_at', { ascending: false });
          
          if (err) throw err;
          setUsers(data || []);
        } catch (err) {
          setError(err.message || 'Failed to load users');
          console.error('Load users error:', err);
        } finally {
          setLoading(false);
        }
      }
      loadUsers();
    }, []);

    // Update user role
    const updateUserRole = async (userId, newRole) => {
      try {
        const { error: err } = await window.MacroChef.supabaseClient
          .from('user_profiles')
          .update({ role: newRole })
          .eq('user_id', userId);
        
        if (err) throw err;
        setUsers(users.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      } catch (err) {
        setError(err.message);
      }
    };

    // Delete user
    const deleteUser = async (userId) => {
      if (!window.confirm(t.confirmDelete || 'Are you sure?')) return;
      try {
        const { error: err } = await window.MacroChef.supabaseClient
          .from('user_profiles')
          .delete()
          .eq('user_id', userId);
        
        if (err) throw err;
        setUsers(users.filter(u => u.user_id !== userId));
        setSelected(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } catch (err) {
        setError(err.message);
      }
    };

    // Bulk operations
    const executeBulkAction = async () => {
      if (selected.size === 0) {
        setError(t.selectItems || 'Select users first');
        return;
      }

      try {
        const userIds = Array.from(selected);
        
        if (bulkAction === 'changeRole' && bulkNewRole) {
          for (const userId of userIds) {
            await updateUserRole(userId, bulkNewRole);
          }
        } else if (bulkAction === 'delete') {
          if (!window.confirm(`Delete ${userIds.length} users?`)) return;
          for (const userId of userIds) {
            await deleteUser(userId);
          }
          setSelected(new Set());
          return;
        }

        setSelected(new Set());
        setBulkAction('');
        setBulkNewRole('');
      } catch (err) {
        setError(err.message);
      }
    };

    const filteredUsers = filterRole
      ? users.filter(u => u.role === filterRole)
      : users;

    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="">{t.allRoles || 'All Roles'}</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          {/* Bulk Actions */}
          {selected.size > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {selected.size} {t.selected || 'selected'}
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">{t.action || 'Action...'}</option>
                <option value="changeRole">{t.changeRole || 'Change Role'}</option>
                <option value="delete">{t.deleteUsers || 'Delete Users'}</option>
              </select>

              {bulkAction === 'changeRole' && (
                <select
                  value={bulkNewRole}
                  onChange={(e) => setBulkNewRole(e.target.value)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">{t.selectRole || 'Select role...'}</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              )}

              <button
                onClick={executeBulkAction}
                disabled={!bulkAction || (bulkAction === 'changeRole' && !bulkNewRole)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition"
              >
                {t.apply || 'Apply'}
              </button>

              <button
                onClick={() => {
                  setSelected(new Set());
                  setBulkAction('');
                  setBulkNewRole('');
                }}
                className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg font-medium transition"
              >
                {t.cancel || 'Cancel'}
              </button>
            </div>
          )}
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            {t.loading || 'Loading...'}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            {t.noUsers || 'No users found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-300 dark:border-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(filteredUsers.map(u => u.user_id)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-300 font-semibold">{t.email || 'Email'}</th>
                  <th className="px-4 py-3 text-left text-slate-700 dark:text-slate-300 font-semibold">{t.role || 'Role'}</th>
                  <th className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{t.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.user_id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(user.user_id)}
                        onChange={(e) => {
                          const newSet = new Set(selected);
                          if (e.target.checked) {
                            newSet.add(user.user_id);
                          } else {
                            newSet.delete(user.user_id);
                          }
                          setSelected(newSet);
                        }}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                        className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                      >
                        {roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={() => deleteUser(user.user_id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition"
                      >
                        {t.delete || 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          {t.totalUsers || 'Total Users'}: <span className="font-semibold text-slate-900 dark:text-white">{filteredUsers.length}</span>
        </div>
      </div>
    );
  }

  window.MacroChef.components.AdminUsers = AdminUsers;
})();
