window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  function AuthModal({ session, onClose }) {
    const { t } = window.MacroChef.useI18n();
    const [register, setRegister] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [busy, setBusy] = React.useState(false);

    async function submit(event) {
      event.preventDefault();
      setBusy(true);
      setError('');
      setMessage('');
      try {
        const result = register
          ? await window.MacroChef.auth.signUp(email.trim(), password)
          : await window.MacroChef.auth.signIn(email.trim(), password);
        setPassword('');
        if (register && !result.session) setMessage(t.authConfirmEmail);
      } catch (err) {
        console.error('Authentication failed:', err);
        if (!window.MacroChef.supabaseClient) setError(t.authUnavailable);
        else if (navigator.onLine === false) setError(t.authOfflineError);
        else if (err.code === 'invalid_credentials') setError(t.authInvalidCredentials);
        else if (err.code === 'user_already_exists') setError(t.authAlreadyRegistered);
        else if (err.code === 'email_not_confirmed') setError(t.authConfirmEmail);
        else setError(t.authError);
      } finally {
        setBusy(false);
      }
    }

    async function signOut() {
      setBusy(true);
      setError('');
      try {
        await window.MacroChef.auth.signOut();
      } catch (err) {
        console.error('Sign-out failed:', err);
        setError(t.authSignOutError);
        setBusy(false);
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 id="auth-title" className="text-xl font-bold">{t.authTitle}</h2>
            <button type="button" onClick={onClose} aria-label={t.authClose}>✕</button>
          </div>
          {session ? (
            <div className="space-y-4">
              <p>{t.authEmail}: {session.email}</p>
              <p>{t.authRole}: {t[`authRole${session.role}`]}</p>
              {session.offline && <p role="status">{t.authOfflineSession}</p>}
              <button type="button" disabled={busy} onClick={signOut} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{t.authSignOut}</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block">{t.authEmail}
                <input className="block w-full rounded-lg border p-2 text-slate-900" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="block">{t.authPassword}
                <input className="block w-full rounded-lg border p-2 text-slate-900" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <button type="submit" disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{register ? t.authSignUp : t.authSignIn}</button>
              <button type="button" disabled={busy} className="block underline" onClick={() => { setRegister(!register); setError(''); setMessage(''); }}>
                {register ? t.authSwitchSignIn : t.authSwitchSignUp}
              </button>
            </form>
          )}
          {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
          {message && <p role="status" className="mt-4">{message}</p>}
        </div>
      </div>
    );
  }

  window.MacroChef.components.AuthModal = AuthModal;
})();
