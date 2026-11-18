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
      session={session}
      onSignOut={overrides.onSignOut || (() => {})}
      syncStatus={{ state: 'synced' }}
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

  test('Drawer shows account, role, sign-out and closes on Escape', async () => {
    window.MacroChef.ENV = 'TEST';
    const root = ReactDOM.createRoot(rootElement);
    let signedOut = false;
    try {
      renderHeader(root, { onSignOut: async () => { signedOut = true; } });
      await waitFor(() => rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]'));
      rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]').click();
      await waitFor(() => rootElement.querySelector('#macrochef-settings-drawer'));
      const drawer = rootElement.querySelector('#macrochef-settings-drawer');
      assert(drawer.textContent.includes(session.email), 'Email is missing');
      assert(drawer.textContent.includes(window.MacroChef.TRANSLATIONS.en.authRoleAdmin), 'Role badge is missing');
      const signOut = Array.from(drawer.querySelectorAll('button'))
        .find((button) => button.textContent.includes(window.MacroChef.TRANSLATIONS.en.authSignOut));
      assert(signOut, 'Sign-out button is missing');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await waitFor(() => !rootElement.querySelector('#macrochef-settings-drawer'));
      rootElement.querySelector('[aria-controls="macrochef-settings-drawer"]').click();
      await waitFor(() => rootElement.querySelector('#macrochef-settings-drawer'));
      Array.from(rootElement.querySelectorAll('#macrochef-settings-drawer button'))
        .find((button) => button.textContent.includes(window.MacroChef.TRANSLATIONS.en.authSignOut)).click();
      await waitFor(() => signedOut && !rootElement.querySelector('#macrochef-settings-drawer'));
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
      await waitFor(() => rootElement.querySelector('.macrochef-drawer-backdrop'));
      rootElement.querySelector('.macrochef-drawer-backdrop').click();
      await waitFor(() => !rootElement.querySelector('#macrochef-settings-drawer'));
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
      await waitFor(() => rootElement.querySelector('#macrochef-settings-drawer'));
      assert(rootElement.querySelector('#macrochef-settings-drawer').textContent.includes(window.MacroChef.APP_VERSION),
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

  run();
})();
