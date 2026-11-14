// Supabase client bootstrap. Falls back to Guest mode when online integration is unavailable.
// Supports 3 environments: PROD (macrochef.pl), TEST (test.macrochef.pl, localhost), LOCAL (file://)
window.MacroChef = window.MacroChef || {};

(function () {
  // Environment detection based on hostname
  const detectEnvironment = () => {
    if (window.location.protocol === 'file:') return 'LOCAL';
    
    const hostname = window.location.hostname;
    if (hostname === 'macrochef.pl' || hostname === 'www.macrochef.pl') return 'PROD';
    if (hostname === 'test.macrochef.pl' || hostname === 'localhost' || hostname === '127.0.0.1') return 'TEST';
    
    // Default to TEST for any other hostname (development, Docker, etc.)
    return 'TEST';
  };

  window.MacroChef.ENV = detectEnvironment();

  // Environment-specific Supabase configuration
  const envConfig = {
    PROD: {
      url: 'https://xymudnmqahgayqvpznwz.supabase.co',
      anonKey: 'sb_publishable_9_ZBVJnYEoFr8OWbAE0dMQ_RP1v7VeJ'
    },
    TEST: {
      url: 'SUPABASE_TEST_URL', // Placeholder: Replace with test Supabase URL
      anonKey: 'SUPABASE_TEST_ANON_KEY' // Placeholder: Replace with test anon key
    },
    LOCAL: {
      url: null,
      anonKey: null
    }
  };

  const config = envConfig[window.MacroChef.ENV];
  const SUPABASE_URL = config.url;
  const SUPABASE_ANON_KEY = config.anonKey;

  // Log environment detection for debugging
  console.log(`[MacroChef] Environment: ${window.MacroChef.ENV} (hostname: ${window.location.hostname})`);

  const guest = (reason) => ({ client: null, enabled: false, mode: 'guest', reason });

  const create = () => {
    // Standalone file:// bundle has an opaque origin: no CORS/Storage for sessions.
    if (window.location.protocol === 'file:') return guest('file-protocol');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return guest('not-configured');
    if (SUPABASE_URL.includes('PLACEHOLDER') || SUPABASE_ANON_KEY.includes('PLACEHOLDER')) {
      return guest('credentials-not-configured');
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      return guest('library-unavailable');
    }
    try {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'macrochef-supabase-session' }
      });
      return { client, enabled: true, mode: 'online', reason: null };
    } catch (error) {
      console.warn('[MacroChef] Supabase initialization failed, using guest mode:', error);
      return guest('init-failed');
    }
  };

  const state = create();
  window.MacroChef.supabaseClient = state.client;
  window.MacroChef.supabase = {
    client: state.client,
    enabled: state.enabled,
    mode: state.mode,
    reason: state.reason,
    environment: window.MacroChef.ENV
  };
})();
