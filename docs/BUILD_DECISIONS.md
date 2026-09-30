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
- Gemini model is configurable via `GEMINI_MODEL`, defaulting to `gemini-3.8-flash`, which the Google quickstart used when checked on September 30, 2026.
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
| GET | `/api/auth/google/config` | Google sign-in configuration status and public client ID |
| POST | `/api/auth/google/challenge` | Browser-bound nonce challenge |
| POST | `/api/auth/google` | Google sign-in or password-confirmed linking; `{ token, user }` |
| GET / POST | `/api/projects` | Project list / created project |
| GET / PATCH / DELETE | `/api/projects/:id` | Project / updated project / 204 |
| GET / POST | `/api/projects/:id/media` | Metadata list / uploaded file metadata |
| GET | `/api/projects/:id/media/:mediaId/content` | Authenticated binary file |
| DELETE | `/api/projects/:id/media/:mediaId` | 204 |
| GET | `/api/projects/:id/messages` | Ordered chat history |
| POST | `/api/chat` | `{ userMessage, assistantMessage }` |
| POST | `/api/remix` | `{ content, mediaId }` |
| GET / PUT | `/api/brand-kit` | Account brand kit |

Upload accepts one multipart field named `file` per request. Chat accepts `projectId` and `message`. Remix accepts `projectId`, `mediaId`, `format`, and optional `instructions`.

## Google authentication addition
The user requested Google authentication on September 30, 2026. Google Identity Services supplies the browser button and ID token; the backend uses `google-auth-library` to verify it. Google users are identified by stable subject, not auto-linked by email. Matching email/password accounts must confirm their password before linking. Signed httpOnly cookie challenges, stored hashed nonces, expiry and single-use consumption protect the sign-in exchange. `GOOGLE_CLIENT_ID` remains unset; see `GOOGLE_AUTH_SETUP.md` for real setup.

## Execution constraints
The user requested task-specific agents. Three independent workers were attempted for backend, frontend, and tests, but all failed before doing work with HTTP 426 `app_update_required`. The main builder completed these tasks locally. HeyClicky must be updated before parallel worker attempts can succeed.
