(function () {
  const { assert, equal, test, run } = window.MacroChefTests;
  const rootElement = document.getElementById('test-root');
  const { Header, Navigation } = window.MacroChef.components;
  const session = { email: 'admin@macrochef.pl', role: 'Admin' };
  let language = 'en';

  window.MacroChef.useI18n = () => ({
    lang: language,
    t: window.MacroChef.TRANSLATIONS[language],
    setLang(next) { language = next; },
    darkMode: false,
    setDarkMode() {},
    colorTheme: 'emerald',
    setColorTheme() {}
  });

  async function waitFor(check) {
    for (let index = 0; index < 100; index++) {
      if (check()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Timed out waiting for UI');
  }

  function renderHeader(root, overrides = {}) {
    root.render(<Header
      session={Object.prototype.hasOwnProperty.call(overrides, 'session') ? overrides.session : session}
      onSignOut={overrides.onSignOut || (() => {})}
      onSignIn={overrides.onSignIn}
      syncStatus={overrides.syncStatus || { state: 'synced' }}
      onRetryPermissionErrors={overrides.onRetryPermissionErrors}
      darkMode={false}
      setDarkMode={() => {}}
      colorTheme="emerald"
      setColorTheme={() => {}}
    />);
  }

  test('Header contains only the hamburger trigger and TEST version badge', async () => {
    window.MacroChef.ENV = 'TEST';
    const root = ReactDOM.createRoot(rootElement);
    try {
      renderHeader(root);
      await waitFor(() => rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]'));
      equal(rootElement.querySelectorAll('header > div > button').length, 0, 'Standalone profile trigger');
      assert(rootElement.textContent.includes(`v${window.MacroChef.APP_VERSION}`), 'TEST header version is missing');
      equal(rootElement.querySelectorAll('[aria-controls="macrochef-settings-drawer"]').length, 1, 'Menu trigger count');
    } finally {
      root.unmount();
    }
  });

  test('Permission conflicts offer an explicit retry', async () => {
    const root = ReactDOM.createRoot(rootElement);
    let retried = false;
    try {
      renderHeader(root, {
        syncStatus: { state: 'conflict', message: 'Permission denied', permissionErrors: true },
        onRetryPermissionErrors: () => { retried = true; }
      });
      await waitFor(() => Array.from(rootElement.querySelectorAll('button'))
        .some((button) => button.textContent === window.MacroChef.TRANSLATIONS.en.sync_retry));
      const retry = Array.from(rootElement.querySelectorAll('button'))
        .find((button) => button.textContent === window.MacroChef.TRANSLATIONS.en.sync_retry);
      retry.click();
      assert(retried, 'Retry action was not invoked');
    } finally {
      root.unmount();
    }
  });

  test('Conflict badge shows the pending count in both languages', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      for (const lang of ['en', 'pl']) {
        language = lang;
        const t = window.MacroChef.TRANSLATIONS[lang];
        renderHeader(root, { syncStatus: {
          state: 'syncing', conflictCount: 1, pendingCount: 2, message: 'Server version changed'
        } });
        await waitFor(() => rootElement.querySelector('[role="status"]')?.textContent.includes(t.sync_conflict));
        const status = rootElement.querySelector('[role="status"]');
        assert(status.textContent.includes(`2 ${t.sync_pendingChanges}`), 'Pending count is missing');
        assert(status.getAttribute('aria-label').includes('Server version changed'), 'Conflict detail is missing');
        assert(!status.textContent.includes(t.sync_synced), 'Conflict appeared synced');
      }
    } finally {
      root.unmount();
      language = 'en';
    }
  });

  test('Drawer shows account, role, sign-out and closes on Escape', async () => {
    window.MacroChef.ENV = 'TEST';
    const root = ReactDOM.createRoot(rootElement);
    let signedOut = false;
    try {
      renderHeader(root, { onSignOut: async () => { signedOut = true; } });
      await waitFor(() => rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]'));
      rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]').click();
      await waitFor(() => document.querySelector('#macrochef-settings-drawer'));
      const drawer = document.querySelector('#macrochef-settings-drawer');
      assert(drawer.textContent.includes(session.email), 'Email is missing');
      assert(drawer.textContent.includes(window.MacroChef.TRANSLATIONS.en.authRoleAdmin), 'Role badge is missing');
      const signOut = Array.from(drawer.querySelectorAll('button'))
        .find((button) => button.textContent.includes(window.MacroChef.TRANSLATIONS.en.authSignOut));
      assert(signOut, 'Sign-out button is missing');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await waitFor(() => !document.querySelector('#macrochef-settings-drawer'));
      rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]').click();
      await waitFor(() => document.querySelector('#macrochef-settings-drawer'));
      Array.from(document.querySelectorAll('#macrochef-settings-drawer button'))
        .find((button) => button.textContent.includes(window.MacroChef.TRANSLATIONS.en.authSignOut)).click();
      await waitFor(() => signedOut && !document.querySelector('#macrochef-settings-drawer'));
    } finally {
      root.unmount();
    }
  });

  test('Guest drawer offers sign-in', async () => {
    const root = ReactDOM.createRoot(rootElement);
    let signIn = false;
    try {
      renderHeader(root, { session: null, onSignIn: () => { signIn = true; } });
      await waitFor(() => rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]'));
      rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]').click();
      await waitFor(() => document.querySelector('#macrochef-settings-drawer'));
      const drawer = document.querySelector('#macrochef-settings-drawer');
      assert(drawer.textContent.includes(window.MacroChef.TRANSLATIONS.en.authRoleGuest), 'Guest role missing');
      const button = Array.from(drawer.querySelectorAll('button'))
        .find((item) => item.textContent.includes(window.MacroChef.TRANSLATIONS.en.authSignIn));
      assert(button, 'Sign-in action missing');
      button.click();
      await waitFor(() => signIn && !document.querySelector('#macrochef-settings-drawer'));
    } finally {
      root.unmount();
    }
  });

  test('Drawer backdrop closes the menu', async () => {
    window.MacroChef.ENV = 'TEST';
    const root = ReactDOM.createRoot(rootElement);
    try {
      renderHeader(root);
      await waitFor(() => rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]'));
      rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]').click();
      await waitFor(() => document.querySelector('.macrochef-drawer-backdrop'));
      document.querySelector('.macrochef-drawer-backdrop').click();
      await waitFor(() => !document.querySelector('#macrochef-settings-drawer'));
    } finally {
      root.unmount();
    }
  });

  test('PROD hides header version and places it in the mobile drawer', async () => {
    window.MacroChef.ENV = 'PROD';
    const root = ReactDOM.createRoot(rootElement);
    try {
      renderHeader(root);
      await waitFor(() => rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]'));
      assert(!rootElement.textContent.includes(`v${window.MacroChef.APP_VERSION}`), 'PROD header version is visible');
      rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]').click();
      await waitFor(() => document.querySelector('#macrochef-settings-drawer'));
      assert(document.querySelector('#macrochef-settings-drawer').textContent.includes(window.MacroChef.APP_VERSION),
        'PROD mobile drawer version is missing');
    } finally {
      root.unmount();
      window.MacroChef.ENV = 'TEST';
    }
  });

  test('Navigation exposes one active page', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<Navigation activeTab="recipes" setActiveTab={() => {}} session={session} />);
      await waitFor(() => rootElement.querySelector('nav'));
      const current = rootElement.querySelectorAll('button[aria-current="page"]');
      equal(current.length, 1, 'Active page count');
      assert(current[0].textContent.includes(window.MacroChef.TRANSLATIONS.en.recipes), 'Wrong active page');
    } finally {
      root.unmount();
    }
  });

  test('Drawer restores settings controls and fills the viewport', async () => {
    window.MacroChef.ENV = 'TEST';
    const root = ReactDOM.createRoot(rootElement);
    try {
      renderHeader(root);
      await waitFor(() => rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]'));
      rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]').click();
      await waitFor(() => document.querySelector('#macrochef-settings-drawer'));
      const drawer = document.querySelector('#macrochef-settings-drawer');
      const text = drawer.textContent;
      assert(text.includes(window.MacroChef.TRANSLATIONS.en.colorPalette), 'Color palette section missing');
      assert(text.includes(window.MacroChef.TRANSLATIONS.en.theme), 'Theme section missing');
      assert(text.includes(window.MacroChef.TRANSLATIONS.en.language), 'Language section missing');
      assert(text.includes(session.email) && text.includes(window.MacroChef.TRANSLATIONS.en.authSignOut),
        'Account section missing');
      equal(Math.round(drawer.getBoundingClientRect().height), window.innerHeight, 'Drawer does not fill viewport');
      const scrollBody = drawer.children[1];
      equal(scrollBody.style.overflowY, 'auto', 'Drawer body is not scrollable');
      assert(scrollBody.classList.contains('min-h-0'), 'Drawer body cannot shrink inside the viewport');
    } finally {
      root.unmount();
      window.MacroChef.ENV = 'TEST';
    }
  });

  run();
})();
