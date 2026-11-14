// Login Screen Component Tests
// Tests for LoginScreen.js and SessionApp integration with authentication

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

  async function waitFor(check, timeout = 2000) {
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

  function getInputValue(selector) {
    const input = rootElement.querySelector(selector);
    return input ? input.value : null;
  }

  function setInputValue(selector, value) {
    const input = rootElement.querySelector(selector);
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function clickButton(selector) {
    const button = rootElement.querySelector(selector);
    if (button) button.click();
  }

  // Test 1: LoginScreen renders with correct elements
  test('LoginScreen renders with email, password, and submit button', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));
      
      assert(rootElement.querySelector('h1')?.textContent.includes('MacroChef'), 'MacroChef logo/title missing');
      assert(rootElement.querySelector('input[type="email"]'), 'Email input missing');
      assert(rootElement.querySelector('input[type="password"]'), 'Password input missing');
      assert(rootElement.querySelector('button[type="submit"]'), 'Submit button missing');
      assert(rootElement.textContent.includes(TRANSLATIONS[language].authSignIn), 'Sign in heading missing');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 2: LoginScreen mode toggle (Sign In <-> Sign Up)
  test('LoginScreen toggles between Sign In and Sign Up modes', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Start in Sign In mode
      assert(rootElement.textContent.includes(TRANSLATIONS[language].authSignIn), 'Should start in Sign In mode');
      
      // Click toggle to Sign Up
      const toggleButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent.includes(TRANSLATIONS[language].authSignUpLink || 'Sign Up'));
      assert(toggleButton, 'Toggle to Sign Up button missing');
      toggleButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS[language].authSignUp));
      assert(rootElement.textContent.includes(TRANSLATIONS[language].authSignUp), 'Should switch to Sign Up mode');

      // Click toggle back to Sign In
      const toggleBackButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent.includes(TRANSLATIONS[language].authSignInLink || 'Sign In'));
      assert(toggleBackButton, 'Toggle to Sign In button missing');
      toggleBackButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS[language].authSignIn));
      assert(rootElement.textContent.includes(TRANSLATIONS[language].authSignIn), 'Should switch back to Sign In mode');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 3: Email validation
  test('LoginScreen validates email format', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Try invalid email
      setInputValue('input[type="email"]', 'invalid-email');
      clickButton('button[type="submit"]');

      await waitFor(() => rootElement.textContent.includes('Invalid email') || 
                         rootElement.textContent.includes('email format'));
      assert(rootElement.textContent.includes('Invalid email') || 
             rootElement.textContent.includes('email format'), 
             'Should show email format error');

      // Clear error by entering valid email
      setInputValue('input[type="email"]', 'valid@example.com');
      await waitFor(() => !rootElement.textContent.includes('Invalid email'));
      assert(!rootElement.textContent.includes('Invalid email'), 'Error should clear after valid input');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 4: Required field validation
  test('LoginScreen validates required fields', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Try submitting empty form
      clickButton('button[type="submit"]');

      await waitFor(() => rootElement.textContent.includes('required') || 
                         rootElement.textContent.includes('Required'));
      assert(rootElement.textContent.includes('required') || 
             rootElement.textContent.includes('Required'), 
             'Should show required field error');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 5: Password minimum length validation for signup
  test('LoginScreen validates password minimum length on signup', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Switch to Sign Up mode
      const toggleButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent.includes(TRANSLATIONS[language].authSignUpLink || 'Sign Up'));
      toggleButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS[language].authSignUp));

      // Try short password
      setInputValue('input[type="email"]', 'test@example.com');
      setInputValue('input[type="password"]', '12345'); // Only 5 chars
      clickButton('button[type="submit"]');

      await waitFor(() => rootElement.textContent.includes('at least 6') || 
                         rootElement.textContent.includes('minimum'));
      assert(rootElement.textContent.includes('at least 6') || 
             rootElement.textContent.includes('minimum'), 
             'Should show password minimum length error for signup');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 6: Password visibility toggle
  test('LoginScreen toggles password visibility', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="password"]'));

      const passwordInput = rootElement.querySelector('input[type="password"]');
      
      // Initially password type
      equal(passwordInput.type, 'password', 'Password input should start as password type');

      // Click toggle button (eye icon)
      const toggleButton = rootElement.querySelector('input[type="password"]').parentElement.querySelector('button');
      assert(toggleButton, 'Password visibility toggle button missing');
      toggleButton.click();

      await waitFor(() => rootElement.querySelector('input[type="text"]'));
      const textInput = rootElement.querySelector('input[type="text"]');
      equal(textInput?.type, 'text', 'Password input should change to text type after toggle');

      // Click toggle again
      const toggleButton2 = rootElement.querySelector('input[type="text"]').parentElement.querySelector('button');
      toggleButton2.click();

      await waitFor(() => rootElement.querySelector('input[type="password"]'));
      const passwordInput2 = rootElement.querySelector('input[type="password"]');
      equal(passwordInput2.type, 'password', 'Password input should change back to password type');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 7: onSignIn callback is called with correct data
  test('LoginScreen calls onSignIn with email, password, and isSignUp flag', async () => {
    const calls = [];
    const onSignIn = async (email, password, isSignUp) => {
      calls.push({ email, password, isSignUp });
    };

    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={onSignIn} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Test Sign In
      setInputValue('input[type="email"]', 'user@example.com');
      setInputValue('input[type="password"]', 'password123');
      clickButton('button[type="submit"]');

      await waitFor(() => calls.length === 1);
      equal(calls[0].email, 'user@example.com', 'Email should be passed to onSignIn');
      equal(calls[0].password, 'password123', 'Password should be passed to onSignIn');
      equal(calls[0].isSignUp, false, 'isSignUp should be false for Sign In');

      // Test Sign Up
      calls.length = 0;
      const toggleButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent.includes(TRANSLATIONS[language].authSignUpLink || 'Sign Up'));
      toggleButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS[language].authSignUp));
      setInputValue('input[type="email"]', 'newuser@example.com');
      setInputValue('input[type="password"]', 'newpassword123');
      clickButton('button[type="submit"]');

      await waitFor(() => calls.length === 1);
      equal(calls[0].email, 'newuser@example.com', 'Email should be passed for signup');
      equal(calls[0].isSignUp, true, 'isSignUp should be true for Sign Up');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 8: Error display
  test('LoginScreen displays error messages', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="Invalid credentials" loading={false} />);
      await waitFor(() => rootElement.textContent.includes('Invalid credentials'));

      assert(rootElement.textContent.includes('Invalid credentials'), 'Error message should display');
      assert(rootElement.querySelector('[role="alert"]') || 
             rootElement.querySelector('.bg-red'), 'Error should be in alert styling');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 9: Loading state
  test('LoginScreen shows loading spinner and disables inputs during loading', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={true} />);
      await waitFor(() => rootElement.querySelector('button[type="submit"]:disabled'));

      const emailInput = rootElement.querySelector('input[type="email"]');
      const passwordInput = rootElement.querySelector('input[type="password"]');
      const submitButton = rootElement.querySelector('button[type="submit"]');

      assert(emailInput?.disabled === true, 'Email input should be disabled during loading');
      assert(passwordInput?.disabled === true, 'Password input should be disabled during loading');
      assert(submitButton?.disabled === true, 'Submit button should be disabled during loading');
      assert(rootElement.textContent.includes(TRANSLATIONS[language].authLoading || 'Loading'), 
             'Should show loading text');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 10: Language switcher
  test('LoginScreen changes language when switcher buttons clicked', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      language = 'pl';
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.pl.authSignIn));

      assert(rootElement.textContent.includes(TRANSLATIONS.pl.authSignIn), 'Should show Polish text initially');

      // Click English button
      const enButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent === 'English');
      assert(enButton, 'English language button missing');
      enButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.en.authSignIn));
      assert(rootElement.textContent.includes(TRANSLATIONS.en.authSignIn), 'Should show English text after switch');

      // Click Polish button
      const plButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent === 'Polski');
      plButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS.pl.authSignIn));
      assert(rootElement.textContent.includes(TRANSLATIONS.pl.authSignIn), 'Should show Polish text after switch back');
    } finally {
      root.unmount();
      clearRoot();
      language = 'en';
    }
  });

  // Test 11: Form data clears on mode toggle
  test('LoginScreen clears form data when toggling Sign In/Sign Up mode', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Enter data
      setInputValue('input[type="email"]', 'test@example.com');
      setInputValue('input[type="password"]', 'password123');

      // Verify data is there
      equal(getInputValue('input[type="email"]'), 'test@example.com', 'Email should be set');
      equal(getInputValue('input[type="password"]'), 'password123', 'Password should be set');

      // Toggle to Sign Up
      const toggleButton = Array.from(rootElement.querySelectorAll('button'))
        .find(b => b.textContent.includes(TRANSLATIONS[language].authSignUpLink || 'Sign Up'));
      toggleButton.click();

      await waitFor(() => rootElement.textContent.includes(TRANSLATIONS[language].authSignUp));

      // Verify data is cleared
      await waitFor(() => getInputValue('input[type="email"]') === '');
      equal(getInputValue('input[type="email"]'), '', 'Email should be cleared on mode toggle');
      equal(getInputValue('input[type="password"]'), '', 'Password should be cleared on mode toggle');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 12: Responsive layout on mobile
  test('LoginScreen has responsive layout with max-width constraint', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      const container = rootElement.querySelector('[class*="max-w"]');
      assert(container, 'LoginScreen should have max-width container for responsive design');
      assert(rootElement.textContent, 'LoginScreen should render content');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  // Test 13: Validation errors clear on input
  test('LoginScreen clears validation errors when user enters input', async () => {
    const root = ReactDOM.createRoot(rootElement);
    try {
      root.render(<components.LoginScreen onSignIn={() => {}} error="" loading={false} />);
      await waitFor(() => rootElement.querySelector('input[type="email"]'));

      // Trigger validation error
      clickButton('button[type="submit"]');
      await waitFor(() => rootElement.textContent.includes('required') || 
                         rootElement.textContent.includes('Required'));

      // Clear error by entering email
      setInputValue('input[type="email"]', 'test@example.com');
      await waitFor(() => !(rootElement.textContent.includes('required') || 
                           rootElement.textContent.includes('Required')));

      assert(!(rootElement.textContent.includes('required') || 
              rootElement.textContent.includes('Required')), 
              'Error should clear when user enters email');
    } finally {
      root.unmount();
      clearRoot();
    }
  });

  run();
})();
