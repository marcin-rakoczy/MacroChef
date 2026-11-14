window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  const { useState, useEffect } = React;

  function LoginScreen({ onSignIn, error, loading }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');
    const [validationError, setValidationError] = useState('');
    const [lang, setLang] = useState(localStorage.getItem('macrochef_lang') === 'en' ? 'en' : 'pl');

    const t = window.MacroChef.TRANSLATIONS[lang];

    useEffect(() => {
      setLocalError('');
      setValidationError('');
    }, [isSignUp]);

    const validateEmail = (e) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(e);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLocalError('');
      setValidationError('');

      if (!email.trim()) {
        setValidationError(t.authEmailRequired || 'Email is required');
        return;
      }

      if (!validateEmail(email)) {
        setValidationError(t.authEmailInvalid || 'Invalid email format');
        return;
      }

      if (!password) {
        setValidationError(t.authPasswordRequired || 'Password is required');
        return;
      }

      if (isSignUp && password.length < 6) {
        setValidationError(t.authPasswordMinLength || 'Password must be at least 6 characters');
        return;
      }

      try {
        await onSignIn(email, password, isSignUp);
      } catch (err) {
        setLocalError(err.message || (isSignUp ? 'Sign up failed' : 'Sign in failed'));
      }
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const toggleMode = () => {
      setIsSignUp(!isSignUp);
      setEmail('');
      setPassword('');
      setLocalError('');
      setValidationError('');
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-lg mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">MacroChef</h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t.authSubtitle || 'Calorie & Meal Planner PWA'}
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
              {isSignUp ? (t.authSignUp || 'Create Account') : (t.authSignIn || 'Sign In')}
            </h2>

            {/* Error Messages */}
            {(error || localError || validationError) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                  {validationError || localError || error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t.authEmail || 'Email Address'}
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValidationError('');
                    }}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t.authPassword || 'Password'}
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm6-10V7a3 3 0 00-3-3H9a3 3 0 00-3 3v2h6z" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationError('');
                    }}
                    placeholder={isSignUp ? t.authPasswordMinSix || 'Min 6 characters' : '••••••••'}
                    className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                    disabled={loading}
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m7.313-10.049L9.47 9.47" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:dark:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 mt-6"
              >
                {loading && <svg className="w-5 h-5 animate-spin inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>}
                {loading
                  ? (t.authLoading || 'Loading...')
                  : (isSignUp ? (t.authSignUpButton || 'Create Account') : (t.authSignInButton || 'Sign In'))
                }
              </button>
            </form>

            {/* Toggle Sign Up / Sign In */}
            <div className="mt-6 text-center">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {isSignUp ? (t.authHaveAccount || 'Already have an account?') : (t.authNoAccount || "Don't have an account?")}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline disabled:opacity-50 transition"
                >
                  {isSignUp ? (t.authSignInLink || 'Sign In') : (t.authSignUpLink || 'Sign Up')}
                </button>
              </p>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => {
                setLang('pl');
                localStorage.setItem('macrochef_lang', 'pl');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                lang === 'pl'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Polski
            </button>
            <button
              onClick={() => {
                setLang('en');
                localStorage.setItem('macrochef_lang', 'en');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                lang === 'en'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              English
            </button>
          </div>

          {/* Info Text */}
          <p className="text-center text-slate-600 dark:text-slate-400 text-xs mt-6">
            {t.authInfo || 'Your data is encrypted and stored securely.'}
          </p>
        </div>
      </div>
    );
  }

  window.MacroChef.components.LoginScreen = LoginScreen;
})();
