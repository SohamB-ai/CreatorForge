# Firebase Google Sign-In Setup

Updated September 30, 2026. Firebase is used **only as Google's identity provider**. MongoDB, email/password login, CreatorForge JWT sessions, account IDs and project ownership stay unchanged. This supersedes the earlier direct Google Identity Services configuration; `GOOGLE_CLIENT_ID` is no longer used.

## Created project and current status

- Firebase project: **CreatorForge**, ID `creatorforge-20260930-204983`, project number `901879982420`.
- Web app: **CreatorForge Web**, app ID `1:901879982420:web:a44bc7050e255973e840c1`.
- Console: https://console.firebase.google.com/project/creatorforge-20260930-204983/overview
- Created using the existing authenticated Firebase CLI account, `yumyoo007@gmail.com`.
- Registered the web app and saved its actual web configuration in the gitignored local `server/.env`. `.firebaserc` identifies this dedicated project.
- **Live Google login is still disabled.** The Auth configuration read returned HTTP 404 `CONFIGURATION_NOT_FOUND`; Firebase Authentication has not yet been initialized. The console automation tools were unavailable, so provider activation and authorized-domain configuration were not completed.
- No billing upgrade, paid Identity Platform initialization, Firestore/Realtime Database, Hosting deployment, service account, or private key was created. The publicly documented Identity Platform initialization endpoint requires a billing-enabled project; it was not called.

## Finish Firebase console setup

1. Open the project console and select **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Google** only. Select the project's support email and save. Do not enable Firebase Email/Password or migrate existing users.
3. Under **Authentication → Settings → Authorized domains**, confirm the project's Firebase auth domain and add `localhost` and `127.0.0.1` for local testing. Add the real production frontend hostname before deployment. These are hostnames, not scheme/port URLs; do not assume localhost is already authorized.
4. Keep the Firebase-created Google OAuth client. If Google asks for consent/branding or testing-audience configuration, complete it for this project and authorize only the intended testers. If customizing OAuth configuration, its redirect URI must match `https://<FIREBASE_AUTH_DOMAIN>/__/auth/handler`; do not invent credentials or copy another project's client.
5. Confirm the Google provider and domains are saved, then change only `FIREBASE_GOOGLE_SIGN_IN_ENABLED` to `true` locally and restart CreatorForge. Use `http://127.0.0.1:5173/login` with the default `/api` proxy and the matching `CLIENT_URL`.
6. Test a real Google account in Chrome and Safari. Verify first login, return login, password-confirmed account linking, password fallback and logout. Automated tests do not prove live Google access.

## Environment configuration

The current local configuration already contains the real web SDK values. Deployment examples intentionally use placeholders:

```env
CLIENT_URL=http://127.0.0.1:5173
FIREBASE_PROJECT_ID=creatorforge-20260930-204983
FIREBASE_WEB_API_KEY=copy_from_this_projects_web_app_config
FIREBASE_AUTH_DOMAIN=creatorforge-20260930-204983.firebaseapp.com
FIREBASE_APP_ID=1:901879982420:web:a44bc7050e255973e840c1
FIREBASE_GOOGLE_SIGN_IN_ENABLED=false
```

Set the flag to `true` **only after** cloud provider/domain setup is verified. Restart the API after editing environment variables. The flag and all four web values are required before the UI offers Google login. Do not change `MONGODB_URI` or `JWT_SECRET` for this integration. The development runner retains its existing persistent MongoDB data and JWT secret.

Firebase web API keys/configuration are public client settings, not admin credentials. The backend returns only those four fields when enabled. Signature verification uses Firebase Admin with an explicit project ID and Google's public signing certificates; this exchange does not require a service-account key. Revocation/admin-user operations are not used. Google is an identity bridge, not the owner of the app's long-lived sessions.

`FIREBASE_AUTH_EMULATOR_HOST` must be unset: CreatorForge refuses to enable this bridge in emulator mode rather than silently bypassing real signature verification. Do not add a production test-verifier flag.

## Account mapping and security

- Firebase Google popup uses in-memory persistence. Firebase signs out after obtaining the ID token; only the existing CreatorForge JWT remains as the app session.
- The backend verifies the Firebase token signature, issuer, project audience and expiry, then requires a verified email, a fresh `auth_time` within five minutes, no tenant, and `firebase.sign_in_provider === 'google.com'`.
- Account mapping uses the stable Google subject in `firebase.identities['google.com']`, not the Firebase UID or email. Previously linked Google accounts retain their MongoDB IDs, even if Firebase user records are recreated.
- A matching email/password account must confirm its current password before linking. Wrong passwords and conflicting Google subjects leave the account unchanged; projects and password access are preserved.
- Google-only accounts receive no fabricated password. Password sign-in fails normally for them.
- A signed httpOnly browser cookie, a body nonce, an app-specific header, origin checks, rate limits and a five-minute hashed MongoDB challenge protect the exchange. Firebase tokens do not contain the earlier GIS nonce; the nonce is checked against the browser cookie instead.
- Successful challenges are atomically consumed. A unique, hashed Firebase token receipt prevents token reuse with another challenge until token expiry. Neither raw tokens nor confirmation passwords are stored in MongoDB or browser storage.
- Tokens remain transient during password confirmation. Cancel/restart clears the pending identity. If the token/challenge ages out, start a new popup.

## Production

Set the five Firebase environment variables and exact HTTPS `CLIENT_URL` on the API. The Render blueprint defaults the enabled flag to `false`. Add the actual frontend hostname to Firebase authorized domains and verify consent/OAuth settings before enabling publicly.

Prefer a same-origin `/api` proxy or same-site custom domains. Separate default Vercel/Render domains can cause privacy-focused browsers to block the cross-site challenge cookie. If using a proxy, configure the actual API destination before the SPA catch-all; do not disable cookie verification to work around blocking.

## API and troubleshooting

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/auth/google/config` | `{ configured, firebase }`; Firebase config is null when disabled |
| POST | `/api/auth/google/challenge` | Nonce and signed challenge cookie |
| POST | `/api/auth/google` | `{ idToken, nonce, password? }`; returns existing `{ token, user }` contract |

Email collision returns HTTP 409 `ACCOUNT_LINK_REQUIRED`. Invalid tokens/challenges return 401, disallowed request markers/origins return 403, and disabled configuration returns 503. Provider errors are sanitized.

- **Disabled button:** confirm all web values, provider/domain setup, enabled flag and API restart.
- **Configuration not found/provider not allowed:** finish Authentication setup and enable Google in the dedicated project.
- **Unauthorized domain:** add the browser hostname to Firebase authorized domains. Keep the browser origin and `CLIENT_URL` identical, including scheme and port.
- **Popup blocked/cancelled:** allow popups and retry, or use email/password.
- **Expired session/token already used:** cancel/restart for a fresh popup and challenge.
- **SDK/network error:** retry or use email/password; no fallback bypasses token verification.

## Verification references

- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/auth-state-persistence
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects.identityPlatform/initializeAuth

Primary documentation/discovery inputs are gitignored under `tmp/firebase-research/`. API fixtures explicitly inject verified claims; browser tests replace the Firebase module only through Playwright interception. Neither is available as a runtime bypass.
