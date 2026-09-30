import { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { api, errorText } from './api.js';

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3-4.4 3-7.6ZM12 22c2.7 0 5-.9 6.8-2.5l-3.4-2.6a6.2 6.2 0 0 1-9.3-3.3H2.6v2.7A10 10 0 0 0 12 22ZM6.1 13.6a6 6 0 0 1 0-3.2V7.7H2.6a10 10 0 0 0 0 8.6l3.5-2.7ZM12 6c1.5 0 2.9.5 4 1.6l3-3A10 10 0 0 0 2.6 7.7l3.5 2.7A6.3 6.3 0 0 1 12 6Z" /></svg>;
}

const googleHeaders = { 'X-CreatorForge-Google': '1' };
function signInError(failure) {
  if (failure.response) return errorText(failure);
  if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(failure.code)) return 'Google sign-in was cancelled. You can try again or use email/password.';
  if (failure.code === 'auth/popup-blocked') return 'Allow pop-ups for CreatorForge, then try Google sign-in again.';
  if (['auth/unauthorized-domain', 'auth/operation-not-allowed', 'auth/configuration-not-found'].includes(failure.code)) return 'Firebase Google sign-in setup is incomplete. Email/password still works.';
  return 'Google sign-in could not load or complete. Check your connection and try again.';
}

export default function GoogleSignIn({ disabled = false, onSuccess, onBusyChange }) {
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const config = useRef(null);
  const sdk = useRef(null);
  const mounted = useRef(false);
  const pending = useRef(false);
  const callbacks = useRef({ onSuccess, onBusyChange });
  const passwordId = useId();
  callbacks.current = { onSuccess, onBusyChange };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; callbacks.current.onBusyChange(false); }; }, []);
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setStatus('loading'); setError(''); setIdentity(null);
    async function prepare() {
      try {
        const { data } = await api.get('/auth/google/config', { signal: abort.signal });
        if (!active) return;
        if (!data.configured) { setStatus('unconfigured'); return; }
        const module = await import('./firebase-google.js');
        if (!active) return;
        config.current = data.firebase; sdk.current = module;
        setStatus('ready');
      } catch (failure) {
        if (active) { setStatus('failed'); setError(signInError(failure)); }
      }
    }
    prepare();
    return () => { active = false; abort.abort(); };
  }, [attempt]);

  async function exchange(proof, password) {
    const { data } = await api.post('/auth/google', { ...proof, ...(password ? { password } : {}) }, { withCredentials: true, headers: googleHeaders });
    if (mounted.current) { setIdentity(null); callbacks.current.onSuccess(data); }
  }
  async function start(password) {
    if (pending.current || disabled || status !== 'ready') return;
    pending.current = true; setBusy(true); setError(''); callbacks.current.onBusyChange(true);
    let proof = identity;
    try {
      if (!proof) {
        const tokenPromise = sdk.current.signInWithGoogle(config.current);
        const challengePromise = api.post('/auth/google/challenge', {}, { withCredentials: true, headers: googleHeaders });
        const [idToken, challenge] = await Promise.all([tokenPromise, challengePromise]);
        proof = { idToken, nonce: challenge.data.nonce };
      }
      if (mounted.current) await exchange(proof, password);
    } catch (failure) {
      if (mounted.current) {
        if (failure.response?.data?.code === 'ACCOUNT_LINK_REQUIRED') setIdentity(proof);
        else setError(signInError(failure));
      }
    } finally {
      pending.current = false;
      if (mounted.current) { setBusy(false); callbacks.current.onBusyChange(false); }
    }
  }
  return <section className="google-sign-in" aria-label="Google sign-in">
    {!identity && <button type="button" className="button secondary full" disabled={status !== 'ready' || disabled || busy} onClick={() => start()}><GoogleMark />{status === 'loading' ? 'Preparing Google sign-in…' : 'Continue with Google'}</button>}
    {status === 'unconfigured' && <p className="google-setup-note">Google sign-in will be available once Firebase Google sign-in is configured. Email/password works now.</p>}
    {busy && <p className="google-progress" role="status"><LoaderCircle className="spin" size={15} />Verifying your Google account…</p>}
    {identity && <form className="google-link-form" onSubmit={(event) => { event.preventDefault(); start(new FormData(event.currentTarget).get('password')); }}>
      <p>This email already has a CreatorForge account. Confirm its password to connect Google and keep your existing projects.</p>
      <div className="field"><label htmlFor={passwordId}>Existing account password</label><input id={passwordId} name="password" type="password" autoComplete="current-password" required maxLength={200} disabled={busy || disabled} /></div>
      <button className="button secondary full" disabled={busy || disabled}>Connect Google securely</button>
    </form>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {(status === 'failed' || error || identity) && <button className="google-retry" type="button" disabled={busy || disabled} onClick={() => setAttempt((value) => value + 1)}>{identity ? 'Cancel and restart Google sign-in' : 'Try Google sign-in again'}</button>}
    <div className="auth-divider"><span />or use email<span /></div>
  </section>;
}
