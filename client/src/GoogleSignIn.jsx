import { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { api, errorText } from './api.js';

let sdkPromise;
function loadGoogleSdk() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => window.google?.accounts?.id ? resolve() : reject(new Error('Google sign-in could not load.'));
    script.onerror = () => { script.remove(); reject(new Error('Google sign-in could not load. Check your connection or browser settings.')); };
    document.head.appendChild(script);
  }).catch((error) => { sdkPromise = null; throw error; });
  return sdkPromise;
}
function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3-4.4 3-7.6ZM12 22c2.7 0 5-.9 6.8-2.5l-3.4-2.6a6.2 6.2 0 0 1-9.3-3.3H2.6v2.7A10 10 0 0 0 12 22ZM6.1 13.6a6 6 0 0 1 0-3.2V7.7H2.6a10 10 0 0 0 0 8.6l3.5-2.7ZM12 6c1.5 0 2.9.5 4 1.6l3-3A10 10 0 0 0 2.6 7.7l3.5 2.7A6.3 6.3 0 0 1 12 6Z" /></svg>;
}

export default function GoogleSignIn({ disabled = false, light, onSuccess, onBusyChange }) {
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [credential, setCredential] = useState('');
  const [attempt, setAttempt] = useState(0);
  const container = useRef(null);
  const mounted = useRef(false);
  const pending = useRef(false);
  const callbacks = useRef({ onSuccess, onBusyChange });
  const passwordId = useId();
  callbacks.current = { onSuccess, onBusyChange };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; callbacks.current.onBusyChange(false); }; }, []);
  useEffect(() => { if (container.current) container.current.inert = disabled || busy; }, [disabled, busy, status]);
  async function finishGoogle(responseCredential, password) {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true); setError(''); callbacks.current.onBusyChange(true);
    try {
      const { data } = await api.post('/auth/google', { credential: responseCredential, ...(password ? { password } : {}) }, { withCredentials: true, headers: { 'X-CreatorForge-Google': '1' } });
      if (mounted.current) callbacks.current.onSuccess(data);
    } catch (failure) {
      if (mounted.current) {
        if (failure.response?.data?.code === 'ACCOUNT_LINK_REQUIRED') setCredential(responseCredential);
        else setError(errorText(failure));
      }
    } finally {
      pending.current = false;
      if (mounted.current) { setBusy(false); callbacks.current.onBusyChange(false); }
    }
  }
  const finish = useRef(finishGoogle);
  finish.current = finishGoogle;
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setStatus('loading'); setError(''); setCredential('');
    async function prepare() {
      try {
        const { data: config } = await api.get('/auth/google/config', { signal: abort.signal });
        if (!active) return;
        if (!config.configured) { setStatus('unconfigured'); return; }
        await loadGoogleSdk();
        if (!active) return;
        const { data: challenge } = await api.post('/auth/google/challenge', {}, { signal: abort.signal, withCredentials: true, headers: { 'X-CreatorForge-Google': '1' } });
        if (!active) return;
        window.google.accounts.id.initialize({ client_id: config.clientId, nonce: challenge.nonce, auto_select: false, callback: (response) => active && finish.current(response.credential) });
        setStatus('ready');
        if (container.current) {
          container.current.replaceChildren();
          window.google.accounts.id.renderButton(container.current, { type: 'standard', theme: light ? 'outline' : 'filled_black', size: 'large', text: 'continue_with', shape: 'rectangular', width: Math.min(400, Math.max(200, Math.round(container.current.parentElement.clientWidth))) });
        }
      } catch (failure) {
        if (active) { setStatus('failed'); setError(failure.response ? errorText(failure) : failure.message || 'Google sign-in is unavailable.'); }
      }
    }
    prepare();
    return () => { active = false; abort.abort(); };
  }, [attempt, light]);
  return <section className="google-sign-in" aria-label="Google sign-in">
    <div ref={container} className={`google-button-container ${status !== 'ready' || credential ? 'hidden' : ''}`} />
    {status !== 'ready' && <button type="button" className="button secondary full google-unavailable" disabled><GoogleMark />{status === 'loading' ? 'Preparing Google sign-in…' : 'Continue with Google'}</button>}
    {status === 'unconfigured' && <p className="google-setup-note">Google sign-in will be available once the app's Google client ID is configured. Email/password works now.</p>}
    {busy && <p className="google-progress" role="status"><LoaderCircle className="spin" size={15} />Verifying your Google account…</p>}
    {credential && <form className="google-link-form" onSubmit={(event) => { event.preventDefault(); finishGoogle(credential, new FormData(event.currentTarget).get('password')); }}>
      <p>This email already has a CreatorForge account. Confirm its password to connect Google and keep your existing projects.</p>
      <div className="field"><label htmlFor={passwordId}>Existing account password</label><input id={passwordId} name="password" type="password" autoComplete="current-password" required maxLength={200} disabled={busy || disabled} /></div>
      <button className="button secondary full" disabled={busy || disabled}>Connect Google securely</button>
    </form>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {(status === 'failed' || error || credential) && <button className="google-retry" type="button" disabled={busy || disabled} onClick={() => setAttempt((value) => value + 1)}>{credential ? 'Cancel and restart Google sign-in' : 'Try Google sign-in again'}</button>}
    <div className="auth-divider"><span />or use email<span /></div>
  </section>;
}
