window.MacroChef = window.MacroChef || {};

(function () {
  const client = window.MacroChef.supabaseClient;
  const cacheKey = 'macrochef-verified-session';
  const sessionKey = 'macrochef-supabase-session';
  const logoutKey = 'macrochef-local-signout';
  const roles = ['Admin', 'Tester', 'UserWithAdvertisement'];
  const listeners = new Set();
  let generation = 0;
  let autoRefreshStopped = false;

  async function stopRefresh() {
    autoRefreshStopped = true;
    await client.auth.stopAutoRefresh();
  }

  async function resumeRefresh() {
    if (!autoRefreshStopped) return;
    await client.auth.startAutoRefresh();
    autoRefreshStopped = false;
  }

  function reportRefreshError(error) {
    console.error('Supabase session refresh configuration failed:', error);
  }

  function notify(event = 'refresh') {
    listeners.forEach((listener) => listener(event));
  }

  function readCache() {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error('Invalid cached account data', { cause: error });
    }
    if (!value || typeof value.userId !== 'string' || typeof value.email !== 'string' ||
        value.issuer !== client.supabaseUrl || value.tenantId !== client.supabaseUrl ||
        !roles.includes(value.role)) {
      throw new Error('Invalid cached account data');
    }
    return value;
  }

  async function getSessionAndRole() {
    if (!client) return null;
    if (localStorage.getItem(logoutKey)) return null;
    if (navigator.onLine === false) {
      const cached = readCache();
      return cached ? { ...cached, offline: true } : null;
    }
    const started = generation;
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (started !== generation) throw new Error('Session changed during verification');
    if (!sessionData.session) {
      if (started === generation) localStorage.removeItem(cacheKey);
      return null;
    }
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) {
      if (started === generation && (userError.status === 401 || userError.status === 403)) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      throw userError;
    }
    if (!userData.user || !userData.user.id || !userData.user.email) {
      throw new Error('Verified user is missing an ID or email');
    }
    const { data: profile, error: profileError } = await client.from('user_profiles')
      .select('role').eq('user_id', userData.user.id).single();
    if (profileError) throw profileError;
    if (!profile || !roles.includes(profile.role)) throw new Error('Invalid account role');
    if (started !== generation) throw new Error('Session changed during verification');
    const result = {
      userId: userData.user.id,
      email: userData.user.email,
      role: profile.role,
      issuer: client.supabaseUrl,
      tenantId: client.supabaseUrl
    };
    localStorage.setItem(cacheKey, JSON.stringify(result));
    return { ...result, offline: false };
  }

  function requireClient() {
    if (!client) throw new Error('Online accounts are unavailable');
    if (navigator.onLine === false) throw new Error('Internet connection required');
  }

  async function signUp(email, password) {
    requireClient();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) {
      localStorage.removeItem(logoutKey);
      await resumeRefresh();
      await getSessionAndRole();
      notify();
    }
    return data;
  }

  async function signIn(email, password) {
    requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    localStorage.removeItem(logoutKey);
    await resumeRefresh();
    await getSessionAndRole();
    notify();
    return data;
  }

  async function signOut() {
    if (!client) return;
    if (navigator.onLine === false) {
      await stopRefresh();
      localStorage.removeItem(sessionKey);
      localStorage.removeItem(`${sessionKey}-code-verifier`);
    } else {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    }
    generation++;
    localStorage.setItem(logoutKey, '1');
    localStorage.removeItem(cacheKey);
    notify('changing');
    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  if (client) {
    if (localStorage.getItem(logoutKey)) stopRefresh().catch(reportRefreshError);
    client.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT' && navigator.onLine === false) return;
      if (event === 'TOKEN_REFRESHED') return;
      generation++;
      if (event === 'SIGNED_OUT') {
        localStorage.setItem(logoutKey, '1');
        localStorage.removeItem(cacheKey);
        stopRefresh().catch(reportRefreshError);
      }
      notify('changing');
      window.setTimeout(notify, 0);
    });
    window.addEventListener('online', () => {
      if (!localStorage.getItem(logoutKey)) resumeRefresh().catch(reportRefreshError);
      notify();
    });
    window.addEventListener('storage', (event) => {
      if (event.key === cacheKey || event.key === sessionKey || event.key === logoutKey) {
        generation++;
        if ((event.key === sessionKey && event.newValue === null) ||
            (event.key === logoutKey && event.newValue)) {
          stopRefresh().catch(reportRefreshError);
          localStorage.removeItem(cacheKey);
        }
        if (event.key === logoutKey && event.newValue === null && navigator.onLine !== false) {
          resumeRefresh().catch(reportRefreshError);
        }
        notify('changing');
        notify();
      }
    });
  }

  window.MacroChef.auth = { signUp, signIn, signOut, getSessionAndRole, subscribe };
})();
