# Google Sign-In Setup

Updated September 30, 2026.

Google sign-in is integrated into CreatorForge's sign-in and registration pages. It is deliberately disabled until a Google OAuth **Web application client ID** is configured. Existing email/password accounts continue to work.

## Enable local Google sign-in

1. In your Google Cloud project, configure the Google Auth Platform consent/branding settings and audience. If the app is in testing, add the Google accounts that should be allowed to test it.
2. Create an OAuth client with application type **Web application**.
3. Add these Authorized JavaScript origins for the local development app:
   - `http://localhost`
   - `http://localhost:5173`
4. Add these lines to `server/.env` locally:

```env
GOOGLE_CLIENT_ID=replace_with_your_actual_web_client_id.apps.googleusercontent.com
CLIENT_URL=http://localhost:5173
```

The placeholder is deliberately not accepted as a valid client ID. Copy the complete value from Google Cloud; it normally starts with your numeric project identifier followed by a hyphen. Never substitute an API key, mobile client ID, or client secret.

5. Restart the existing CreatorForge development process and open **http://localhost:5173/login** or **http://localhost:5173/register**. Use the default relative `/api` frontend API URL so challenge cookies stay on the same origin through Vite's proxy.
6. The Google-provided “Continue with Google” button replaces the disabled placeholder. Click it, choose an account, and verify that the app opens your project dashboard.

The app's existing `http://127.0.0.1:5173` preview remains usable for email/password access. For live Google tests, use the exact origin registered in Google Cloud; the steps above use `localhost`, matching Google's local-development guidance. If you use another permitted origin, authorize it in Google Cloud and set `CLIENT_URL` to that exact origin.

The client ID is public configuration, delivered by the backend. This ID-token flow does **not** require a Google client secret, access token, refresh token, Gmail scope, or Drive scope. No Google Cloud resource was created and no live OAuth credential was supplied during this implementation.

## Existing accounts and linking

- A new Google identity creates a new CreatorForge account and receives the same app JWT session used by email/password login.
- Returning Google users are identified by Google's stable `sub` claim, not solely by an email address. Google email changes do not silently transfer accounts or rewrite existing addresses.
- If the verified Google email matches an existing email/password account, CreatorForge **does not automatically merge it**. The sign-in page asks for that account's current password first.
- A correct password connects Google to the existing account, preserving its ID, projects, media and brand kit. Both sign-in methods then work.
- A wrong password leaves the account unchanged. A different Google subject cannot overwrite an already-linked identity.
- Google-only accounts do not receive a fabricated password. Password sign-in fails normally for those accounts.

## Verification and session protection

- Backend verification uses `google-auth-library` and `verifyIdToken`, with the configured client ID as the audience. The production runtime cannot replace verification through an environment flag.
- Additional checks require a Google issuer, matching audience, unexpired token, verified email, stable subject and a matching nonce.
- Sign-in initiation creates a cryptographically random, five-minute challenge tied to a signed httpOnly browser cookie and a hashed challenge in MongoDB.
- Requests require an app-specific header and are checked against the configured frontend origin. Challenges are single-use; consumed or expired challenges cannot authenticate another request.
- Secure cookies are used for HTTPS/production; local HTTP development uses a same-site cookie. Authentication is rate-limited, provider diagnostics are not exposed, and response caching is disabled.
- Google credentials and confirmation passwords are sent only to the backend, kept transiently in the browser during the flow, and never stored in localStorage. Only the normal CreatorForge session JWT is stored there, matching the existing app design.

## Production configuration

1. Add your exact HTTPS frontend origin to the Google OAuth client's Authorized JavaScript origins.
2. Set `GOOGLE_CLIENT_ID` and `CLIENT_URL` on the API service. The Render blueprint includes an optional client ID setting; leave it blank to keep Google sign-in disabled.
3. Prefer a same-origin `/api` reverse proxy or frontend/API custom domains on the same site. Separate default Vercel and Render domains may cause Safari and other privacy-focused browsers to block the cross-site challenge cookie, even though credentialed CORS is configured.
4. If using a Vercel reverse proxy, route `/api/*` to the actual deployed API **before** the SPA catch-all, keep the frontend API URL relative, and do not commit an invented backend destination.
5. Test real Google sign-in, account creation, return visits, account linking, logout and session restoration in Safari and Chrome before enabling the feature publicly.

Live Google sign-in is not verified until actual credentials and authorized origins are supplied. The automated tests use explicitly injected verification and mocked Google browser services, never a fake production provider.

## API additions

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/auth/google/config` | Public `configured` flag and client ID, or `null` when disabled |
| POST | `/api/auth/google/challenge` | Nonce and signed challenge cookie |
| POST | `/api/auth/google` | Verified credential, optional account-link password; returns `{ token, user }` |

An account-link password requirement returns HTTP 409 with `code: "ACCOUNT_LINK_REQUIRED"`. Invalid credentials/challenges return 401, disallowed initiation/origins return 403, and missing configuration returns 503.

## Troubleshooting

- **Disabled Google button:** set a real-format `GOOGLE_CLIENT_ID` on the server and restart it.
- **Origin not allowed:** the browser origin, `CLIENT_URL`, and Google Authorized JavaScript origin must match exactly, including scheme and port.
- **Expired session or nonce:** use “Try Google sign-in again”; a challenge lasts five minutes and is consumed after successful verification/linking.
- **Cookies blocked on hosted domains:** use a same-origin API proxy or same-site custom domains; do not disable nonce/cookie verification to make the error disappear.
- **SDK failed to load:** check connectivity or script-blocking extensions, retry, or continue with email/password.

## Primary references checked

- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/identity/gsi/web/reference/js-reference
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

These official references were checked during implementation; downloaded inputs are gitignored under `tmp/google-auth-research/`.
