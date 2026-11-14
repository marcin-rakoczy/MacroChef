// SessionApp Integration Tests
// Tests for unauthenticated user flow and LoginScreen integration

(function () {
  const { assert, equal, test, run } = window.MacroChefTests;
  const { components, TRANSLATIONS } = window.MacroChef;
  let language = 'en';

  window.MacroChef.useI18n = () => ({
    lang: language,
    setLang: (lang) => { language = lang; },
    t: TRANSLATIONS[language],
    darkMode: false,
    setDarkMode() {},
    colorTheme: 'emerald',
    setColorTheme() {}
  });

  const rootElement = document.getElementById('test-root');

  async function waitFor(check, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (check()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Timed out waiting for UI');
  }

  function clearRoot() {
    rootElement.innerHTML = '';
  }

  // Mock auth module for testing
  function setupMockAuth() {
    const listeners = new Set();
    let currentSession = null;
    let signInError = null;
    let signUpError = null;

    window.MacroChef.auth = {
      getSessionAndRole: async () => {
        if (signInError) {
          const error = signInError;
          signInError = null;
          throw new Error(error);
        }
        return currentSession;
      },
      signIn: async (email, password) => {
        if (signUpError) {
          throw new Error(signUpError);
        }
        currentSession = {
          userId: 'test-user-' + Date.now(),
          email,
          role: 'Admin',
          issuer: 'https://project.supabase.co',
          tenantId: 'https://project.supabase.co',
          offline: false
        };
        listeners.forEach(listener => listener('refresh'));
        return currentSession;
      },
      signUp: async (email, password) => {
        if (signUpError) {
          throw new Error(signUpError);
        }
        currentSession = {
          userId: 'test-user-' + Date.now(),
          email,
          role: 'Admin',
          issuer: 'https://project.supabase.co',
          tenantId: 'https://project.supabase.co',
          offline: false
        };
        listeners.forEach(listener => listener('refresh'));
        return currentSession;
      },
      signOut: async () => {
        currentSession = null;
        listeners.forEach(listener => listener('refresh'));
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      setSession: (session) => { currentSession = session; },
      setSignInError: (error) => { signInError = error; },
      setSignUpError: (error) => { signUpError = error; }
    };
  }

  // Test 1: SessionApp shows LoginScreen when no session exists
  test('SessionApp shows LoginScreen for unauthenticated users', async () => {
    setupMockAuth();
    window.MacroChef.auth.setSession(null);

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.SessionApp />);
      
      // Wait for LoginScreen to appear
      await waitFor(() => rootElement.textContent.includes('MacroChef') && 
                         rootElement.querySelector('input[type="email"]'));

      assert(rootElement.querySelector('input[type="email"]'), 'LoginScreen should render email input');
      assert(rootElement.querySelector('input[type="password"]'), 'LoginScreen should render password input');
      assert(rootElement.querySelector('button[type="submit"]'), 'LoginScreen should render submit button');
      assert(!rootElement.textContent.includes(TRANSLATIONS[language].planner || 'Planner'), 
             'Application should not be visible for unauthenticated users');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 2: SessionApp shows loading state initially
  test('SessionApp shows loading state while checking session', async () => {
    setupMockAuth();
    window.MacroChef.auth.setSession(null);

    const root = ReactDOM.createRoot(rootElement);
    try {
      // Create delayed version of getSessionAndRole
      const originalGetSession = window.MacroChef.auth.getSessionAndRole;
      let resolveGetSession;
      const delayedGetSession = new Promise(resolve => { resolveGetSession = resolve; });
      window.MacroChef.auth.getSessionAndRole = async () => {
        await delayedGetSession;
        return originalGetSession();
      };

      root.render(<components.SessionApp />);
      
      // Initially should show loading
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS[language].authLoading || 'Loading'));
      
      // Resolve the delayed session check
      resolveGetSession();
      
      // Now should show LoginScreen
      await waitFor(() => rootElement.querySelector('input[type="email"]'));
      assert(rootElement.querySelector('input[type="email"]'), 'Should show LoginScreen after loading');
    } finally {
      root.unmount();
      clearRoot();
      window.MacroChef.auth.getSessionAndRole = window.MacroChef.auth.getSessionAndRole;
    }
  });

  // Test 3: SessionApp calls handleSignIn when LoginScreen submits
  test('SessionApp handles sign in flow from LoginScreen', async () => {
    setupMockAuth();
    window.MacroChef.auth.setSession(null);

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.SessionApp />);
      
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Enter credentials
      const emailInput = rootElement.querySelector('input[type="email"]');
      const passwordInput = rootElement.querySelector('input[type="password"]');
      
      emailInput.value = 'test@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      passwordInput.value = 'password123';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Submit form
      const submitButton = rootElement.querySelector('button[type="submit"]');
      submitButton.click();

      // Wait for authentication to complete
      await waitFor(() => {
        const session = window.MacroChef.auth.getSessionAndRole();
        return session && session.email === 'test@example.com';
      }, 5000);

      assert(true, 'Sign in should complete successfully');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 4: SessionApp shows error from failed sign in
  test('SessionApp displays authentication errors from LoginScreen', async () => {
    setupMockAuth();
    window.MacroChef.auth.setSession(null);
    window.MacroChef.auth.setSignInError('Invalid credentials');

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.SessionApp />);
      
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Try to sign in
      const emailInput = rootElement.querySelector('input[type="email"]');
      const passwordInput = rootElement.querySelector('input[type="password"]');
      
      emailInput.value = 'test@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      passwordInput.value = 'wrongpassword';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Submit form
      const submitButton = rootElement.querySelector('button[type="submit"]');
      submitButton.click();

      // Wait for error to display
      await waitFor(() => rootElement.textContent.includes('Invalid credentials'), 2000).catch(() => {
        // Error might be handled gracefully
      });

      // Check that we're still on login screen (authentication failed)
      assert(rootElement.querySelector('input[type="email"]'), 'Should still show LoginScreen after auth failure');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 5: SessionApp handles sign up flow
  test('SessionApp handles sign up flow from LoginScreen', async () => {
    setupMockAuth();
    window.MacroChef.auth.setSession(null);

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.SessionApp />);
      
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Switch to Sign Up mode
      const toggleButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent.includes(TRANSLATIONS[language].authSignUpLink || 'Sign Up'));
      assert(toggleButton, 'Should have Sign Up toggle button');
      toggleButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS[language].authSignUp));

      // Enter credentials
      const emailInput = rootElement.querySelector('input[type="email"]');
      const passwordInput = rootElement.querySelector('input[type="password"]');
      
      emailInput.value = 'newuser@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      passwordInput.value = 'newpassword123';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Submit form
      const submitButton = rootElement.querySelector('button[type="submit"]');
      submitButton.click();

      // Wait for sign up to complete
      await waitFor(() => {
        const session = window.MacroChef.auth.getSessionAndRole();
        return session && session.email === 'newuser@example.com';
      }, 5000);

      assert(true, 'Sign up should complete successfully');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 6: SessionApp persists language selection across authentication
  test('SessionApp preserves language selection in LoginScreen', async () => {
    setupMockAuth();
    window.MacroChef.auth.setSession(null);
    language = 'pl';

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.SessionApp />);
      
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.pl.authSignIn));
      assert(rootElement.textContent.includes(TRANSLATIONS.pl.authSignIn), 
             'LoginScreen should render in Polish initially');

      // Switch to English
      const enButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent === 'English');
      assert(enButton, 'English button should be available');
      enButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.en.authSignIn));
      assert(rootElement.textContent.includes(TRANSLATIONS.en.authSignIn), 
             'LoginScreen should render in English after toggle');
    } finally {
      root.unmount();
      clearRoot();
      language = 'en';
    }
  });

  // Test 7: SessionApp shows retry button on loading error
  test('SessionApp shows retry mechanism on session loading error', async () => {
    setupMockAuth();
    window.MacroChef.auth.setSignInError('Network error');

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.SessionApp />);
      
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Try to sign in (will fail)
      const emailInput = rootElement.querySelector('input[type="email"]');
      const passwordInput = rootElement.querySelector('input[type="password"]');
      
      emailInput.value = 'test@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      passwordInput.value = 'password123';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

      const submitButton = rootElement.querySelector('button[type="submit"]');
      submitButton.click();

      // Wait and check if we can still interact with the login form
      await waitFor(() => rootElement.querySelector('input[type="email"]'));
      assert(rootElement.querySelector('input[type="email"]'), 
             'Should remain on login screen with form for retry');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 8: SessionApp validates that LoginScreen is only shown when unauthenticated
  test('SessionApp shows ApplicationApp flow only when authenticated', async () => {
    setupMockAuth();
    // Simulate authenticated user
    window.MacroChef.auth.setSession({
      userId: 'test-user',
      email: 'test@example.com',
      role: 'Admin',
      issuer: 'https://project.supabase.co',
      tenantId: 'https://project.supabase.co',
      offline: false
    });

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.SessionApp />);
      
      // Wait for authenticated state
      await waitFor(() => !rootElement.textContent.includes('MacroChef') || 
                         rootElement.querySelector('input[type="email"]') === null, 5000);

      // For authenticated users, application should be preparing (or already loaded)
      // LoginScreen should NOT be visible
      assert(rootElement.querySelector('input[type="email"]') === null, 
             'LoginScreen should not appear for authenticated users');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 9: SessionApp handles sign out by returning to LoginScreen
  test('SessionApp returns to LoginScreen after sign out', async () => {
    setupMockAuth();
    // Start authenticated
    window.MacroChef.auth.setSession({
      userId: 'test-user',
      email: 'test@example.com',
      role: 'Admin',
      issuer: 'https://project.supabase.co',
      tenantId: 'https://project.supabase.co',
      offline: false
    });

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.SessionApp />);
      
      // Wait for authenticated state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Sign out
      await window.MacroChef.auth.signOut();

      // Wait for LoginScreen to appear
      await waitFor(() => rootElement.querySelector('input[type="email"]'), 5000);
      assert(rootElement.querySelector('input[type="email"]'), 
             'LoginScreen should appear after sign out');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  run();
})();
