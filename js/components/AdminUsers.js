// Admin Users Management - Full CRUD + Bulk Operations
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { useState, useEffect } = React;

  function AdminUsers({ repository, session }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
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

    const currentUserId = session && session.userId;
    const isSelf = (user) => user.user_id === currentUserId;
    const deleteBlockedReason = (user) => {
      if (isSelf(user)) return t.cannotDeleteSelf || 'You cannot delete your own account';
      if (user.role === 'Admin') return t.demoteAdminBeforeDelete || 'Change the Admin role before deleting this account';
      return '';
    };

    const rpc = async (fn, params) => {
      if (!window.MacroChef.supabaseClient) throw new Error('Supabase not available');
      const { error: err } = await window.MacroChef.supabaseClient.rpc(fn, params);
      if (err) throw err;
    };

    const applyRole = async (userId, newRole) => {
      await rpc('admin_set_user_role', { target_user: userId, new_role: newRole });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    };

    const removeUser = async (userId) => {
      await rpc('admin_delete_user', { target_user: userId });
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      setSelected(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    const updateUserRole = async (userId, newRole) => {
      setError('');
      setNotice('');
      try {
        await applyRole(userId, newRole);
        setNotice(t.userRoleUpdated || 'Role updated');
      } catch (err) {
        setError(err.message);
      }
    };

    const deleteUser = async (user) => {
      setError('');
      setNotice('');
      const blocked = deleteBlockedReason(user);
      if (blocked) {
        setError(blocked);
        return;
      }
      if (!window.confirm(`${t.confirmDeleteUser || 'Delete this account permanently?'}\n${user.email}`)) return;
      try {
        await removeUser(user.user_id);
        setNotice(t.userDeleted || 'Account deleted');
      } catch (err) {
        setError(err.message);
      }
    };

    // Bulk operations
    const executeBulkAction = async () => {
      setError('');
      setNotice('');
      if (selected.size === 0) {
        setError(t.selectItems || 'Select users first');
        return;
      }

      const targets = users.filter(u => selected.has(u.user_id));
      const failures = [];
      let done = 0;

      if (bulkAction === 'changeRole' && bulkNewRole) {
        for (const user of targets) {
          try {
            await applyRole(user.user_id, bulkNewRole);
            done++;
          } catch (err) {
            failures.push(`${user.email}: ${err.message}`);
          }
        }
      } else if (bulkAction === 'delete') {
        const deletable = targets.filter(u => !deleteBlockedReason(u));
        targets.filter(u => deleteBlockedReason(u)).forEach(u => failures.push(`${u.email}: ${deleteBlockedReason(u)}`));
        if (deletable.length === 0) {
          setError(failures.join('\n'));
          return;
        }
        const message = `${t.confirmDeleteUser || 'Delete this account permanently?'} (${deletable.length})\n${deletable.map(u => u.email).join('\n')}`;
        if (!window.confirm(message)) return;
        for (const user of deletable) {
          try {
            await removeUser(user.user_id);
            done++;
          } catch (err) {
            failures.push(`${user.email}: ${err.message}`);
          }
        }
      } else {
        return;
      }

      if (done > 0) setNotice(`${bulkAction === 'delete' ? (t.userDeleted || 'Account deleted') : (t.userRoleUpdated || 'Role updated')}: ${done}`);
      if (failures.length) setError(failures.join('\n'));
      setSelected(new Set());
      setBulkAction('');
      setBulkNewRole('');
    };

    const filteredUsers = filterRole
      ? users.filter(u => u.role === filterRole)
      : users;

    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 text-sm whitespace-pre-line">{error}</p>
          </div>
        )}
        {notice && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <p className="text-emerald-700 dark:text-emerald-300 text-sm">{notice}</p>
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
                        disabled={isSelf(user)}
                        title={isSelf(user) ? (t.cannotChangeOwnRole || 'You cannot change your own role') : ''}
                        onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                        className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={() => deleteUser(user)}
                        disabled={!!deleteBlockedReason(user)}
                        title={deleteBlockedReason(user)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition"
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
