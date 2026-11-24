window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { useEffect, useRef, useState } = React;

  function SessionApp() {
    const [active, setActive] = useState(null);
    const [target, setTarget] = useState(null);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const lifecycleRef = useRef(null);
    if (!lifecycleRef.current) lifecycleRef.current = new window.MacroChef.RepositoryScopeLifecycle();
    const lifecycle = lifecycleRef.current;
    const wantedRef = useRef(null);
    const latestSession = useRef(null);
    const sequence = useRef(0);

    useEffect(() => {
      let disposed = false;
      async function refresh() {
        const request = ++sequence.current;
        try {
          const session = await window.MacroChef.auth.getSessionAndRole();
          if (disposed || request !== sequence.current) return;
          latestSession.current = session;
          setError(null);
          const key = session ? JSON.stringify([session.issuer, session.tenantId, session.userId]) : 'guest';
          if (wantedRef.current === key) {
            setActive((previous) => previous ? { ...previous, session } : previous);
            return;
          }
          wantedRef.current = key;
          lifecycle.stopCurrent();
          setActive(null);
          setTarget({ key, session });
        } catch (err) {
          if (disposed || request !== sequence.current) return;
          console.error('Account verification failed:', err);
          setError('authLoadError');
        }
      }
      const unsubscribe = window.MacroChef.auth.subscribe((event) => {
        if (event === 'changing') {
          sequence.current++;
          wantedRef.current = null;
          lifecycle.switchTo(null).catch((err) => {
            console.error('Account teardown failed:', err);
            if (!disposed) setError('authDataError');
          });
          setActive(null);
          setTarget({ suspended: true });
        } else {
          refresh();
        }
      });
      refresh();
      return () => {
        disposed = true;
        sequence.current++;
        unsubscribe();
      };
    }, [attempt, lifecycle]);

    useEffect(() => {
      if (!target) return;
      let cancelled = false;
      const create = target.suspended ? null : async (isStale) => {
        let next;
        const stale = () => cancelled || isStale() || wantedRef.current !== target.key;
        try {
          next = target.session
            ? await window.MacroChef.createScopedRepository(target.session)
            : { repository: window.MacroChef.createGuestRepository(), shoppingStorageKey: 'macrochef_checked' };
          if (stale()) return next;
          await next.repository.initialize();
          if (stale()) return next;
          if (target.session) await next.repository.seedProducts();
          if (stale()) return next;
          if (target.session && !await next.repository.hasGuestMigrationDecision()) {
            if (stale()) return next;
            let data = { recipes: [], plans: [] };
            if (await window.MacroChef.guestDatabaseExists()) {
              const guest = window.MacroChef.createGuestRepository({ seedDefaults: false });
              try {
                await guest.initialize();
                data = await guest.getGuestMigrationData();
              } finally {
                await guest.close();
              }
            }
            if (stale()) return next;
            const hasData = data.recipes.length > 0 || data.plans.some((plan) =>
              ['Breakfast', 'Lunch', 'Dinner', 'Snack'].some((slot) => plan[slot]));
            const lang = (data.lang || localStorage.getItem('macrochef_lang')) === 'en' ? 'en' : 'pl';
            const accepted = hasData && window.confirm(window.MacroChef.TRANSLATIONS[lang].authMigrationPrompt);
            await next.repository.finishGuestMigration(data, accepted);
          }
          if (stale()) return next;
          if (target.session) {
            next.syncManager = new window.MacroChef.AppSyncManager();
            next.syncManager.start({
              repository: next.repository,
              userId: target.session.userId,
              client: window.MacroChef.supabaseClient
            });
          }
          return next;
        } catch (err) {
          if (next) await lifecycle.dispose(next);
          throw err;
        }
      };
      lifecycle.switchTo(create).then((next) => {
        if (next && !cancelled) setActive({ ...next, key: target.key, session: latestSession.current });
      }).catch((err) => {
        if (!cancelled) {
          console.error('Account repository initialization failed:', err);
          wantedRef.current = null;
          setError(err.message === 'Guest plan references a missing recipe'
            ? 'authGuestDataError'
            : 'authDataError');
        }
      });
      return () => {
        cancelled = true;
      };
    }, [target, lifecycle]);

    useEffect(() => () => {
      lifecycle.switchTo(null).catch((err) => console.error('Account teardown failed:', err));
    }, [lifecycle]);

    const handleSignOut = async () => {
      try {
        await window.MacroChef.auth.signOut();
      } catch (err) {
        console.error('Sign-out failed:', err);
        setError('authSignOutError');
      }
    };

    if (error && !active) {
      const lang = localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl';
      return <div role="alert">
        {window.MacroChef.TRANSLATIONS[lang][error]}
        <button type="button" onClick={() => setAttempt((n) => n + 1)}>Retry / Spróbuj ponownie</button>
      </div>;
    }

    // Loading state - show nothing until we determine auth status
    if (!target) {
      return <div style={{ display: 'none' }}></div>;
    }

    // Get AuthGate component
    const { AuthGate } = window.MacroChef.components;

    if (active && active.key === target.key) {
      const appContent = (
        <window.MacroChef.I18nProvider key={active.key} repository={active.repository}>
          {error && <p role="alert">Nie udało się zweryfikować sesji / Could not verify the session. <button type="button" onClick={() => setAttempt((n) => n + 1)}>Retry / Spróbuj ponownie</button></p>}
          <window.MacroChef.App repositories={active.repository} shoppingStorageKey={active.shoppingStorageKey} session={active.session} syncManager={active.syncManager} onSignOut={handleSignOut} />
        </window.MacroChef.I18nProvider>
      );

      if (AuthGate && target.session) {
        return (
          <AuthGate
            isAuthenticated={true}
            session={active.session}
            onSignOut={handleSignOut}
            authenticatedContent={appContent}
          />
        );
      }
      return appContent;
    }

    // Loading state while setting up repository
    return <div style={{ display: 'none' }}></div>;
  }

  window.MacroChef.components.SessionApp = SessionApp;
})();
