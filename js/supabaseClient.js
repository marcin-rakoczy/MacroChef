// Supabase client bootstrap. Falls back to Guest mode when online integration is unavailable.
window.MacroChef = window.MacroChef || {};

(function () {
  // Replace per environment (dev / nonprod / prod). The anon key is public by design; RLS enforces access.
  const SUPABASE_URL = 'https://xymudnmqahgayqvpznwz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_9_ZBVJnYEoFr8OWbAE0dMQ_RP1v7VeJ';

  const guest = (reason) => ({ client: null, enabled: false, mode: 'guest', reason });

  const create = () => {
    // Standalone file:// bundle has an opaque origin: no CORS/Storage for sessions.
    if (window.location.protocol === 'file:') return guest('file-protocol');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return guest('not-configured');
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
    reason: state.reason
  };
})();
