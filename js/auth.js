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
  let signOutInProgress = false;
  let verificationsInProgress = 0;

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

  function isNetworkError(error) {
    return navigator.onLine === false || Boolean(error && (
      error.name === 'AuthRetryableFetchError' || error.name === 'TimeoutError' ||
      /failed to fetch|fetch failed|network error|network request failed|timed? ?out|timeout/i.test(error.message || '')
    ));
  }

  function isRefreshRejection(error) {
    return navigator.onLine !== false && error && !isNetworkError(error) &&
      (((!error.name || error.name === 'AuthApiError') && (error.status === 400 || error.status === 401)) ||
        error.code === 'invalid_grant' ||
        error.code === 'refresh_token_not_found' || error.code === 'refresh_token_already_used');
  }

  function clearSession() {
    generation++;
    localStorage.setItem(logoutKey, '1');
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(`${sessionKey}-code-verifier`);
    localStorage.removeItem(cacheKey);
    stopRefresh().catch(reportRefreshError);
  }

  function cachedSession(error, observedUserId) {
    const cached = readCache();
    if (!cached) {
      if (error) throw error;
      return null;
    }
    if (observedUserId && cached.userId !== observedUserId) {
      throw new Error('Account changed during verification');
    }
    if (error) console.warn('Using cached account while session verification is unavailable:', error);
    return { ...cached, offline: true };
  }

  async function getSessionAndRole() {
    if (!client) return null;
    if (localStorage.getItem(logoutKey)) return null;
    if (navigator.onLine === false) return cachedSession();
    const started = generation;
    let observedUserId;
    verificationsInProgress++;
    try {
      let sessionData;
      let sessionError;
      try {
        ({ data: sessionData, error: sessionError } = await client.auth.getSession());
      } catch (error) {
        sessionError = error;
      }
      if (started !== generation) throw new Error('Session changed during verification');
      if (sessionError) {
        if (isRefreshRejection(sessionError)) {
          clearSession();
          return null;
        }
        if (sessionError.name === 'AuthSessionMissingError') return cachedSession(sessionError);
        throw sessionError;
      }
      if (!sessionData || !('session' in sessionData)) {
        throw new Error('Invalid Supabase session response');
      }
      if (!sessionData.session) {
        const cached = cachedSession();
        if (cached) console.warn('Supabase session unavailable; retaining the verified local account.');
        return cached;
      }
      observedUserId = sessionData.session.user && sessionData.session.user.id;
      let { data: userData, error: userError } = await client.auth.getUser();
      if (userError && userError.status === 401 && navigator.onLine !== false) {
        let refreshError;
        try {
          ({ error: refreshError } = await client.auth.refreshSession());
        } catch (error) {
          refreshError = error;
        }
        if (started !== generation) throw new Error('Session changed during verification');
        if (refreshError) {
          if (isRefreshRejection(refreshError)) {
            clearSession();
            return null;
          }
          if (refreshError.name === 'AuthSessionMissingError') return cachedSession(refreshError, observedUserId);
          throw refreshError;
        }
        ({ data: userData, error: userError } = await client.auth.getUser());
      }
      if (userError) throw userError;
      if (!userData || !userData.user || !userData.user.id || !userData.user.email) {
        throw new Error('Verified user is missing an ID or email');
      }
      if (observedUserId && observedUserId !== userData.user.id) {
        throw new Error('Account changed during verification');
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
    } catch (error) {
      if (started !== generation || localStorage.getItem(logoutKey)) throw error;
      if (isNetworkError(error)) return cachedSession(error, observedUserId);
      throw error;
    } finally {
      verificationsInProgress--;
    }
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
    signOutInProgress = true;
    try {
      if (navigator.onLine === false) {
        await stopRefresh();
      } else {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw error;
      }
      generation++;
      localStorage.setItem(logoutKey, '1');
      localStorage.removeItem(sessionKey);
      localStorage.removeItem(`${sessionKey}-code-verifier`);
      localStorage.removeItem(cacheKey);
      notify('changing');
      notify();
    } finally {
      signOutInProgress = false;
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  if (client) {
    if (localStorage.getItem(logoutKey) || navigator.onLine === false) stopRefresh().catch(reportRefreshError);
    client.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT') {
        if (!signOutInProgress && !verificationsInProgress && navigator.onLine !== false) window.setTimeout(notify, 0);
        return;
      }
      if (event === 'TOKEN_REFRESHED') return;
      generation++;
      notify('changing');
      window.setTimeout(notify, 0);
    });
    window.addEventListener('offline', () => {
      stopRefresh().catch(reportRefreshError);
      notify();
    });
    window.addEventListener('online', () => {
      if (!localStorage.getItem(logoutKey)) resumeRefresh().catch(reportRefreshError);
      notify();
    });
    window.addEventListener('storage', (event) => {
      if (event.key === cacheKey || event.key === sessionKey || event.key === logoutKey) {
        if (event.key === sessionKey && event.newValue === null && !localStorage.getItem(logoutKey)) {
          notify();
          return;
        }
        generation++;
        if (event.key === logoutKey && event.newValue) {
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
