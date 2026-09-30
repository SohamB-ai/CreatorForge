import { getApps, initializeApp } from 'firebase/app';
import { browserPopupRedirectResolver, getAuth, GoogleAuthProvider, initializeAuth, inMemoryPersistence, signInWithPopup, signOut } from 'firebase/auth';

export async function signInWithGoogle(config) {
  const name = `creatorforge-${config.projectId}`;
  const existing = getApps().find((entry) => entry.name === name);
  const app = existing || initializeApp(config, name);
  const auth = existing ? getAuth(app) : initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return await result.user.getIdToken(true);
  } finally {
    await signOut(auth);
  }
}
