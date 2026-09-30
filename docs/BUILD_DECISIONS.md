# CreatorForge Build Decisions

Date: September 30, 2026.

The original seven planning documents remain unchanged. They define the product intent; inconsistent examples are resolved here so the frontend and backend share one contract.

## Repository and folders
- Source: `SohamB-ai/CreatorForge`, originally checked out at `/Users/rehan/Documents/Projects/CreatorForge/CreatorForge`.
- Authoritative working copy: this Creator Builder workspace's `CreatorForge/` folder. The original checkout is untouched, and no commit or push was made.
- Use `client/` and `server/` to match the repository README, rather than the implementation plan's alternate `frontend/` and `backend/` names.
- The requested Desktop folder contains a workspace launcher and a `Project` link to the authoritative copy, avoiding competing source trees.

## Product and storage
- Keep the required React/Vite/Tailwind, Express/JWT/bcrypt/Multer, MongoDB, and Gemini architecture.
- Use actual local MongoDB for credential-free development, with persistent WiredTiger data. Production still requires Atlas or another provisioned MongoDB instance.
- Adopt the conservative 5 MB upload limit from the PRD risk mitigation instead of conflicting 10 MB examples. Enforce on both client and server, with type checks and basic binary-signature validation.
- Add a 50 MB project storage cap and a 15 MB aggregate AI-input cap. Remix can operate on a single asset when the whole-project context is too large.
- Brand kits are per account, as required by FR-008, not project-only embedded settings. Brand voice is injected into chat and remix requests.
- Generated remix output is saved as a Markdown media asset, as described in APP_FLOW.md. Editing the output in the UI is explicitly local; the original saved output is not silently overwritten.
- No demo authentication, fake AI output, or hard-coded project statistics.

## Current SDKs and security
- Replace the obsolete `@google/generative-ai` examples with `@google/genai`; keep the Gemini provider and multimodal inputs.
- Latest scope: Gemini requires an explicit `GEMINI_MODEL` and `AI_GENERATION_ENABLED=true`; there is no hardcoded default or automatic model fallback. A key/model can remain configured while the feature is disabled. On September 30, 2026 the user's replacement key passed real generation, superseding the earlier key's project-level denial. `gemini-3.8-flash` passed a minimal text probe but image requests encountered temporary provider overload; `gemini-3.5-flash` also had intermittent failures. After provider listing and actual image-based generation, local configuration was explicitly changed to `gemini-3.5-flash-lite` and enabled. Real browser chat with two image fixtures and reload persistence, real remix generation, saved editing/conflict rejection and exact downloads passed; authentication configuration was preserved.
- Google's deprecation page lists Gemini 2.0 Flash as shut down on June 1, 2026; the old document's model is not a viable fixed default.
- Primary sources checked: https://ai.google.dev/gemini-api/docs/quickstart and https://ai.google.dev/gemini-api/docs/deprecations . Local research snapshots are gitignored in `tmp/research/`.
- Use maintained Multer 2 instead of the plan's Multer 1 examples, and React Router 7 instead of version 6 to clear the dependency audit advisories. Preserve the same declarative SPA routing design.
- Password minimum is eight characters, with bcrypt's 72-byte input bound enforced. JWTs are restricted to HS256 with issuer, audience, and expiry validation; production never receives an invented shared secret.
- Every project, media, history, chat, and remix lookup checks ownership. Updates explicitly allow fields rather than spreading untrusted bodies into ownership fields.
- Restrict API CORS to the configured frontend origin, rate-limit authentication and AI generation, and sanitize provider errors.
- Retain the planning documents' localStorage JWT approach for this MVP. A production hardening pass should consider httpOnly-cookie sessions, CSP on the deployed frontend, distributed rate limiting, atomic cascade deletion, and storage/context quotas under concurrent requests.

## Canonical API
Successful responses are plain JSON, without a generic `data` wrapper. Errors are `{ "error": "Human-readable message" }`.

| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | Database status and `aiConfigured` |
| POST | `/api/auth/register`, `/api/auth/login` | `{ token, user }` |
| GET | `/api/auth/me` | Safe current user |
| GET | `/api/auth/google/config` | Google sign-in status and public Firebase web configuration |
| POST | `/api/auth/google/challenge` | Browser-bound nonce challenge |
| POST | `/api/auth/google` | Google sign-in or password-confirmed linking; `{ token, user }` |
| GET / POST | `/api/projects` | Project list / created project |
| GET / PUT | `/api/onboarding` | Private `{ profile }` with `professions`, `roleDetail`, `skillIds` and `workflow`; null before setup |
| GET / PATCH / DELETE | `/api/projects/:id` | Project / updated project / 204 |
| PATCH | `/api/projects/:id/skills` | Atomically add validated catalog `skillIds` to an owned project; preserve the existing union |
| GET / POST | `/api/projects/:id/media` | Metadata list / uploaded file metadata |
| GET | `/api/projects/:id/media/:mediaId/content` | Authenticated binary file |
| DELETE | `/api/projects/:id/media/:mediaId` | 204 |
| GET | `/api/projects/:id/messages` | Ordered chat history |
| POST | `/api/projects/:id/messages/:messageId/save` | Saved Markdown asset metadata; 201 on creation, 200 for existing saved output |
| POST | `/api/chat` | `{ userMessage, assistantMessage }` |
| POST | `/api/chat/stream` | SSE `delta`, `done` or `error`; only `done` confirms persisted `{ userMessage, assistantMessage }` |
| POST | `/api/remix` | `{ content, mediaId }` |
| GET / PUT | `/api/brand-kit` | Account brand kit |

Upload accepts one multipart field named `file` per request. Chat accepts `projectId` and `message`. Remix accepts `projectId`, `mediaId`, `format`, and optional `instructions`.

Chat response saving accepts an empty JSON object only, checks project/message ownership and model role, and copies the exact original UTF-8 bytes into a Markdown asset within the existing editing/storage limits. A unique sparse `sourceMessageId` index makes duplicate saves idempotent. Re-saving returns the existing asset without overwriting edits; deleting the asset permits saving again. The chat message itself is unchanged. These assets use the existing editor and saved Markdown/text export routes. Concurrent quota reservations across different assets remain a production-hardening follow-up.

The browser streams chat over authenticated POST/fetch rather than EventSource, preserving bearer sessions and the existing completed-JSON endpoint. Incremental Markdown is an unsaved draft until a matching `done` response confirms persisted message IDs/content. Stop and workspace navigation abort the request and provider SDK signal; failures/cancellation roll back this request's inserted history. A per-project lock prevents simultaneous chat/remix generation, with timeouts and a 60,000-byte response bound. Injected-provider API/browser tests do not establish real provider latency or cancellation billing guarantees.

## Multi-profession skills

The user's onboarding clarification permits multiple professions, switching their collections and combining skills within one project. Profession metadata is separate from authentication and is not an elevated permission or account migration. Existing projects continue to work without skills. A legacy single-role creator profile is normalized on read and rewritten only when its owner saves the new form.

`shared/skills.js` is the client/server catalog for seven workflows supplied through Sam (creator), Mia (marketer) and Finn (designer). Audio-to-blog is shared and deduplicated. Student and other profession definitions are selectable, but unsupplied skills stay explicitly unavailable rather than being invented. The brand kit remains the existing account-level configuration and is included in specialist requests.

New skill selections are validated against the owner's professions and saved as project metadata. Adding to existing projects uses MongoDB `$addToSet`, not a read-modify-replace operation that could erase concurrent selections. Attached skills remain usable if the owner later changes profession preferences. Requests carry a catalog `skillId`, never user-supplied agent instructions; the server checks project membership and source types, then selects the specialist's system instruction. Both completed JSON chat and SSE streaming support it. Agents here mean scoped workflows using the existing Gemini configuration, not separate model credentials, HeyClicky persistent workers or autonomous parallel jobs. Generation happens only on an explicit run or chat submission; normal copy/library/edit/export actions remain available.

## Google authentication addition
The user's latest September 30, 2026 decision supersedes direct Google Identity Services: use a new dedicated Firebase project **only for Google sign-in**, not as a replacement auth/database stack. Created `creatorforge-20260930-204983` and registered its web app; saved public web configuration locally, with live login disabled pending Firebase Auth/Google provider/domain initialization. Firebase popup auth is memory-only and signs out after token extraction. Firebase Admin verifies the token using project ID and public certificates; additional checks restrict it to fresh, verified Google identities. Account mapping retains the existing stable Google subject, MongoDB IDs, password-confirmed linking and CreatorForge JWT sessions. Hashed single-use browser challenges and token receipts protect replay. No service account or billing upgrade is needed for this bridge. See `GOOGLE_AUTH_SETUP.md` for exact status and setup.

Firebase Admin's optional Cloud Storage dependency introduced an audited vulnerable `uuid` under `gaxios`; an earlier scoped override was attempted but the current installed tree still reports two moderate findings. No storage feature is enabled; cleanup remains pending, not a claimed clean audit.

## Content-building checkpoint

The user has taken over authentication/Firebase setup; subsequent work focuses on content and deployment preparation. Authentication/Firebase configuration remains unchanged. AI configuration is separate: a failed provider check never enables the app or changes auth.

- Saved text uses the existing Media document and exact UTF-8 bytes, with a nonempty 60 KB edit limit. Updates accept only `content` and `version`, check project/asset ownership and atomically compare/increment MongoDB `__v` to reject stale edits.
- GET `/api/projects/:id/media/:mediaId/edit` returns one consistent content/version snapshot; PATCH `/api/projects/:id/media/:mediaId` saves it. GET `/api/projects/:id/media/:mediaId/export?format=markdown|text` exports saved bytes with a safe attachment filename and private/no-store caching.
- Remix results and library text previews share the saved editor. Downloads never silently export unsaved drafts. Browser warnings and explicit discard/reload controls protect common unsaved-edit paths; full SPA-history blocking and revision history remain future work.
- `npm run check:deploy` is an offline readiness check, not a deploy command or proof of live credential validity. It deliberately skips user-managed Firebase setup and does not modify secrets or cloud resources.

## Execution constraints
The user requested task-specific agents. Three independent workers were attempted for backend, frontend, and tests, but all failed before doing work with HTTP 426 `app_update_required`. The main builder completed these tasks locally. HeyClicky must be updated before parallel worker attempts can succeed.
