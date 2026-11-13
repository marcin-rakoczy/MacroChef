window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { useEffect, useRef, useState } = React;

  function SessionApp() {
    const [active, setActive] = useState(null);
    const [target, setTarget] = useState(null);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const activeRef = useRef(null);
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
          if (activeRef.current && activeRef.current.syncManager) activeRef.current.syncManager.stop();
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
    }, [attempt]);

    useEffect(() => {
      if (!target) return;
      let cancelled = false;
      let next;
      const stale = () => cancelled || wantedRef.current !== target.key;
      async function open() {
        try {
          if (activeRef.current) {
            const previous = activeRef.current;
            activeRef.current = null;
            if (previous.syncManager) await previous.syncManager.stop();
            previous.repository.close();
          }
          if (target.suspended) return;
          next = target.session
            ? await window.MacroChef.createScopedRepository(target.session)
            : { repository: new window.MacroChef.DexieCalorieRepository(), shoppingStorageKey: 'macrochef_checked' };
          if (stale()) {
            next.repository.close();
            return;
          }
          await next.repository.initialize();
          if (stale()) {
            next.repository.close();
            return;
          }
          if (target.session) await next.repository.seedProducts();
          if (stale()) {
            next.repository.close();
            return;
          }
          if (target.session && !await next.repository.hasGuestMigrationDecision()) {
            if (stale()) {
              next.repository.close();
              return;
            }
            let data = { recipes: [], plans: [] };
            if (await window.MacroChef.guestDatabaseExists()) {
              const guest = new window.MacroChef.DexieCalorieRepository('MacroChefDB', { seedDefaults: false });
              try {
                await guest.initialize();
                data = await guest.getGuestMigrationData();
              } finally {
                guest.close();
              }
            }
            if (stale()) {
              next.repository.close();
              return;
            }
            const hasData = data.recipes.length > 0 || data.plans.some((plan) =>
              ['Breakfast', 'Lunch', 'Dinner', 'Snack'].some((slot) => plan[slot]));
            const lang = (data.lang || localStorage.getItem('macrochef_lang')) === 'en' ? 'en' : 'pl';
            const accepted = hasData && window.confirm(window.MacroChef.TRANSLATIONS[lang].authMigrationPrompt);
            await next.repository.finishGuestMigration(data, accepted);
          }
          if (stale()) {
            next.repository.close();
            return;
          }
          if (target.session) {
            next.syncManager = new window.MacroChef.AppSyncManager();
            next.syncManager.start({
              repository: next.repository,
              userId: target.session.userId,
              client: window.MacroChef.supabaseClient
            });
          }
          activeRef.current = next;
          setActive({ ...next, key: target.key, session: latestSession.current });
        } catch (err) {
          if (next) next.repository.close();
          if (!stale()) {
            console.error('Account repository initialization failed:', err);
            wantedRef.current = null;
            setError(err.message === 'Guest plan references a missing recipe'
              ? 'authGuestDataError'
              : 'authDataError');
          }
        }
      }
      open();
      return () => {
        cancelled = true;
        if (next && activeRef.current !== next) {
          if (next.syncManager) next.syncManager.stop().then(() => next.repository.close());
          else next.repository.close();
        }
      };
    }, [target]);

    useEffect(() => () => {
      if (activeRef.current) {
        const previous = activeRef.current;
        if (previous.syncManager) previous.syncManager.stop().then(() => previous.repository.close());
        else previous.repository.close();
      }
    }, []);

    if (!active) {
      const t = window.MacroChef.TRANSLATIONS[localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl'];
      return error
        ? <p role="alert">
            {t[error]} <button type="button" onClick={() => setAttempt((n) => n + 1)}>{t.retry}</button>
            {window.MacroChef.supabaseClient && <button type="button" onClick={async () => {
              try {
                await window.MacroChef.auth.signOut();
              } catch (err) {
                console.error('Sign-out failed:', err);
                setError('authSignOutError');
              }
            }}>{t.authSignOut}</button>}
          </p>
        : <p role="status">{t.authLoading}</p>;
    }

    return (
      <window.MacroChef.I18nProvider key={active.key} repository={active.repository}>
        {error && <p role="alert">Nie udało się zweryfikować sesji / Could not verify the session. <button type="button" onClick={() => setAttempt((n) => n + 1)}>Retry / Spróbuj ponownie</button></p>}
        <window.MacroChef.App repositories={active.repository} shoppingStorageKey={active.shoppingStorageKey} session={active.session} syncManager={active.syncManager} />
      </window.MacroChef.I18nProvider>
    );
  }

  window.MacroChef.components.SessionApp = SessionApp;
})();
