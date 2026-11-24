(function () {
  const { assert, equal, test, run } = window.MacroChefTests;
  const rootElement = document.getElementById('test-root');
  let session;
  let listener;
  let failSession;
  let failRepository;
  let resolveSession;

  window.MacroChef.auth = {
    async getSessionAndRole() {
      if (resolveSession) await new Promise((resolve) => { resolveSession = resolve; });
      if (failSession) throw new Error('Session failed');
      return session;
    },
    subscribe(callback) { listener = callback; return () => { listener = null; }; },
    async signOut() { session = null; listener('refresh'); }
  };
  function repository() {
    return {
      async initialize() { if (failRepository) throw new Error('Repository failed'); },
      async seedProducts() {},
      async hasGuestMigrationDecision() { return true; },
      close() {}
    };
  }
  window.MacroChef.DexieCalorieRepository = function () { return repository(); };
  window.MacroChef.createScopedRepository = async () => ({ repository: repository(), shoppingStorageKey: 'account' });
  window.MacroChef.AppSyncManager = class { start() {} async stop() {} };
  window.MacroChef.I18nProvider = ({ children }) => children;
  window.MacroChef.App = ({ session: current, onSignOut }) =>
    <div><span data-testid="session">{current ? current.userId : 'guest'}</span>
      {current && <button onClick={onSignOut}>Sign out</button>}</div>;

  async function waitFor(check) {
    for (let i = 0; i < 150; i++) {
      if (check()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Timed out waiting for session UI');
  }
  function reset() {
    session = null;
    failSession = false;
    failRepository = false;
    resolveSession = null;
  }

  test('SessionApp renders guest after session check completes', async () => {
    reset();
    resolveSession = true;
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<window.MacroChef.components.SessionApp />);
      await waitFor(() => typeof resolveSession === 'function');
      assert(!rootElement.querySelector('[data-testid="session"]'), 'App rendered before session check');
      resolveSession();
      resolveSession = null;
      await waitFor(() => rootElement.querySelector('[data-testid="session"]'));
      equal(rootElement.querySelector('[data-testid="session"]').textContent, 'guest', 'Guest app');
    } finally { root.unmount(); }
  });

  test('SessionApp switches from guest to account and back on sign out', async () => {
    reset();
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<window.MacroChef.components.SessionApp />);
      await waitFor(() => rootElement.querySelector('[data-testid="session"]')?.textContent === 'guest');
      listener('changing');
      session = { issuer: 'issuer', tenantId: 'tenant', userId: 'account', role: 'Admin' };
      listener('refresh');
      await waitFor(() => rootElement.querySelector('[data-testid="session"]')?.textContent === 'account');
      rootElement.querySelector('button').click();
      await waitFor(() => rootElement.querySelector('[data-testid="session"]')?.textContent === 'guest');
    } finally { root.unmount(); }
  });

  test('SessionApp shows session errors and retries', async () => {
    reset();
    failSession = true;
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<window.MacroChef.components.SessionApp />);
      await waitFor(() => rootElement.querySelector('[role="alert"]'));
      failSession = false;
      rootElement.querySelector('button').click();
      await waitFor(() => rootElement.querySelector('[data-testid="session"]')?.textContent === 'guest');
    } finally { root.unmount(); }
  });

  test('SessionApp shows repository initialization errors and retries', async () => {
    reset();
    failRepository = true;
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<window.MacroChef.components.SessionApp />);
      await waitFor(() => rootElement.querySelector('[role="alert"]'));
      failRepository = false;
      rootElement.querySelector('button').click();
      await waitFor(() => rootElement.querySelector('[data-testid="session"]')?.textContent === 'guest');
    } finally { root.unmount(); }
  });

  run();
})();
