(function () {
  const { assert, equal, test, run } = window.MacroChefTests;
  const events = [];
  let session = null;
  let listener;
  let delayed;
  let guestExists = false;
  const decisions = new Set();
  const imports = [];
  const guestName = 'guest';

  function repository(name) {
    return {
      close() { events.push(`close:${name}`); },
      async initialize() { events.push(`open:${name}`); },
      async seedProducts() {},
      async getGuestMigrationData() {
        return { recipes: [{ id: 'guest-recipe', name: 'Guest' }], plans: [], lang: 'en' };
      },
      async hasGuestMigrationDecision() { return decisions.has(name); },
      async finishGuestMigration(data, accepted) {
        decisions.add(name);
        imports.push({ name, data, accepted });
      }
    };
  }

  window.MacroChef.guestDatabaseExists = async () => guestExists;
  window.MacroChef.DexieCalorieRepository = function () { return repository(guestName); };
  window.MacroChef.createScopedRepository = async (scope) => {
    if (scope.userId === 'slow') await new Promise((resolve) => { delayed = resolve; });
    return { repository: repository(scope.userId), shoppingStorageKey: `shopping-${scope.userId}` };
  };
  window.MacroChef.supabaseClient = {};
  window.MacroChef.AppSyncManager = class {
    start(scope) { events.push(`sync-start:${scope.userId}`); }
    async stop() { events.push('sync-stop'); }
  };
  window.MacroChef.auth = {
    async getSessionAndRole() { return session; },
    subscribe(callback) { listener = callback; return () => { listener = null; }; }
  };
  window.MacroChef.I18nProvider = ({ children }) => children;
  window.MacroChef.App = ({ session: current, shoppingStorageKey }) => {
    const name = current ? current.userId : guestName;
    React.useEffect(() => {
      events.push(`mount:${name}`);
      return () => { events.push(`unmount:${name}`); };
    }, [name]);
    return <div data-testid="account">{name}:{shoppingStorageKey}</div>;
  };

  async function waitFor(check) {
    for (let i = 0; i < 100; i++) {
      if (check()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Timed out waiting for account transition');
  }

  function switchAccount(next) {
    listener('changing');
    session = next;
    listener('refresh');
  }

  test('Account changes unmount subscriptions before closing and isolate shopping keys', async () => {
    const root = ReactDOM.createRoot(document.getElementById('test-root'));
    try {
      root.render(<window.MacroChef.components.SessionApp />);
      await waitFor(() => document.querySelector('[data-testid="account"]'));
      equal(document.querySelector('[data-testid="account"]').textContent, 'guest:macrochef_checked', 'Initial guest');
      switchAccount({ issuer: 'issuer', tenantId: 'tenant', userId: 'alice', role: 'Admin' });
      await waitFor(() => document.querySelector('[data-testid="account"]')?.textContent.startsWith('alice:'));
      assert(events.indexOf('unmount:guest') < events.indexOf('close:guest'), 'Guest closed before unmount');
      equal(document.querySelector('[data-testid="account"]').textContent, 'alice:shopping-alice', 'Account shopping scope');
      switchAccount({ issuer: 'issuer', tenantId: 'tenant', userId: 'bob', role: 'Tester' });
      await waitFor(() => document.querySelector('[data-testid="account"]')?.textContent.startsWith('bob:'));
      assert(events.indexOf('unmount:alice') < events.indexOf('close:alice'), 'Alice closed before unmount');
      assert(events.indexOf('sync-stop') < events.indexOf('close:alice'), 'Sync was not stopped before closing Alice');
      switchAccount(null);
      await waitFor(() => document.querySelector('[data-testid="account"]')?.textContent.startsWith('guest:'));
      assert(events.indexOf('unmount:bob') < events.indexOf('close:bob'), 'Bob closed before unmount');

      switchAccount({ issuer: 'issuer', tenantId: 'tenant', userId: 'slow', role: 'Tester' });
      await waitFor(() => typeof delayed === 'function');
      switchAccount({ issuer: 'issuer', tenantId: 'tenant', userId: 'new', role: 'Tester' });
      await waitFor(() => document.querySelector('[data-testid="account"]')?.textContent.startsWith('new:'));
      delayed();
      await new Promise((resolve) => setTimeout(resolve, 50));
      equal(document.querySelector('[data-testid="account"]').textContent, 'new:shopping-new', 'Stale account mounted');
      assert(events.includes('close:slow'), 'Stale repository not closed');
    } finally {
      root.unmount();
    }
  });

  test('Guest import is offered once per account and requires consent', async () => {
    let prompts = 0;
    const originalConfirm = window.confirm;
    window.confirm = (message) => {
      prompts++;
      assert(message.includes('Copy guest recipes'), 'Guest language was not used');
      return true;
    };
    guestExists = true;
    session = null;
    const root = ReactDOM.createRoot(document.getElementById('test-root'));
    try {
      root.render(<window.MacroChef.components.SessionApp />);
      await waitFor(() => document.querySelector('[data-testid="account"]')?.textContent.startsWith('guest:'));
      const account = { issuer: 'issuer', tenantId: 'tenant', userId: 'migration', role: 'Tester' };
      switchAccount(account);
      await waitFor(() => document.querySelector('[data-testid="account"]')?.textContent.startsWith('migration:'));
      equal(prompts, 1, 'Expected one prompt');
      assert(imports.some((entry) => entry.name === 'migration' && entry.accepted &&
        entry.data.recipes[0].id === 'guest-recipe'), 'Consent was not passed to migration');
      switchAccount(null);
      await waitFor(() => document.querySelector('[data-testid="account"]')?.textContent.startsWith('guest:'));
      switchAccount(account);
      await waitFor(() => document.querySelector('[data-testid="account"]')?.textContent.startsWith('migration:'));
      equal(prompts, 1, 'Prompt repeated after decision');
    } finally {
      root.unmount();
      guestExists = false;
      window.confirm = originalConfirm;
    }
  });

  test('Account dialog shows registration feedback and localized role', async () => {
    let lang = 'en';
    let signedOut = false;
    window.MacroChef.useI18n = () => ({ t: window.MacroChef.TRANSLATIONS[lang] });
    window.MacroChef.auth.signUp = async () => ({ session: null });
    window.MacroChef.auth.signOut = async () => { signedOut = true; };
    const root = ReactDOM.createRoot(document.getElementById('test-root'));
    try {
      root.render(<window.MacroChef.components.AuthModal session={null} onClose={() => {}} />);
      await waitFor(() => document.querySelector('[role="dialog"]'));
      equal(document.querySelector('input[type="password"]').minLength, 6, 'Password minimum');
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find((button) => button.textContent.includes('Need an account')).click();
      await waitFor(() => document.querySelector('button[type="submit"]').textContent === 'Sign up');
      document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await waitFor(() => document.querySelector('[role="status"]'));
      assert(document.querySelector('[role="status"]').textContent.includes('confirm your account'),
        'Missing email confirmation message');
      lang = 'pl';
      root.render(<window.MacroChef.components.AuthModal session={{ email: 'alice@example.test', role: 'Admin' }} onClose={() => {}} />);
      await waitFor(() => document.querySelector('[role="dialog"]').textContent.includes('Administrator'));
      assert(document.querySelector('[role="dialog"]').textContent.includes('alice@example.test'), 'Email missing');
      Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Wyloguj się').click();
      await waitFor(() => signedOut);
    } finally {
      root.unmount();
    }
  });

  run();
})();
