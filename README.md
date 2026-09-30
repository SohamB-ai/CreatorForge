# 🔥 CreatorForge

> **Forge content from any source. AI that sees, hears, reads, and creates.**

A Multimodal AI Content Creator Toolkit built for the hackathon. Upload images, audio, video, PDFs, and text — AI understands everything together and helps you generate, remix, and stay on-brand.

## 🎯 Problem

Content creators juggle fragmented tools and formats. Reference images live in one place, voice memos in another, briefs in a third. No single tool understands all their content together.

## 💡 Solution

CreatorForge — one workspace where AI sees everything, connects the dots, and helps creators produce content across formats.

## ✨ Features

- **Project Workspace** — Create projects, upload mixed media into one workspace
- **AI Chat with Context** — Chat with AI that understands ALL uploaded files
- **Smart Content Generation** — AI generates text, analyzes images, transcribes audio, summarizes videos
- **Content Remixing** — Transform content across formats (image→caption, audio→blog, video→script)
- **Brand Kit** — Set brand guidelines, AI keeps all output on-brand

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Vite + Tailwind CSS |
| Backend | Express.js + JWT + bcrypt + Multer |
| Database | MongoDB (Mongoose) |
| AI | Google Gemini API (`@google/genai`, configurable model) |
| Deployment | Vercel (frontend) + Render (backend) |

## 📂 Documentation

All project documentation is in the [`docs/`](./docs/) folder:

| Document | Description |
|----------|-------------|
| [PRD.md](./docs/PRD.md) | Product Requirements Document |
| [TRD.md](./docs/TRD.md) | Technical Requirements Document |
| [UI_UX.md](./docs/UI_UX.md) | UI/UX Design Document |
| [BACKEND_SCHEMA.md](./docs/BACKEND_SCHEMA.md) | Backend Schema & API Spec |
| [APP_FLOW.md](./docs/APP_FLOW.md) | Application Flow Diagrams |
| [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) | Step-by-Step Implementation Plan |
| [PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) | High-Level Project Overview |

## 🚀 Quick Start

### Local development
Use Node.js 20.19+ or 22.12+ and run these commands at the repository root:

```bash
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173` and the API at `http://127.0.0.1:5001`.
The first run downloads a local MongoDB binary into `tmp/mongodb-binaries`.
Real local MongoDB data persists in `tmp/mongodb-data`, and a development JWT secret is generated automatically into a gitignored, permission-restricted file.
No cloud account is needed to use registration, projects, media uploads, or brand settings locally.
There are no seeded projects or simulated AI responses.

AI is **off by default**, even when a key is present. To enable it, update the existing `server/.env` with a key and a model you have confirmed works for your account:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=your_confirmed_gemini_model
AI_GENERATION_ENABLED=true
```

Restart the app after changing backend environment variables. Run `npm run check:ai` to make one minimal live provider request without printing the key or changing the application/authentication flags. Model listing alone is not proof of generation access.
Replace the model placeholder with an actual `gemini-...` model ID. There is no hardcoded default, automatic model switch or fake-provider fallback. Disabled/incomplete configuration returns a clear error without calling Google or persisting phantom output. Configuration presence does not prove live model access: test an actual generation before release. On September 30, 2026, the user's replacement key passed live generation and was saved only in the gitignored, permission-restricted backend environment. `gemini-3.8-flash` passed a minimal text probe but image requests encountered temporary provider overload; `gemini-3.5-flash` also had intermittent request failures. The local configuration was explicitly changed to provider-listed `gemini-3.5-flash-lite` after successful image-based generation; AI is now enabled locally. Real browser chat with two image fixtures and real remix generation succeeded, with persisted content, editable saved output and exact Markdown/text downloads. Provider availability/quota can still cause failures; this does not establish production deployment or rendered image/video output.
An existing detached development session can be stopped with `kill "$(cat tmp/dev.pid)"` from the project root.

### Google sign-in
Authentication and Firebase console setup are now **user-managed**; current build work leaves their configuration untouched.
Google sign-in uses Firebase **only as the Google identity provider**. MongoDB, email/password login and CreatorForge JWT sessions remain unchanged. The dedicated Firebase project `creatorforge-20260930-204983` and web app are created; their web configuration is saved locally. Live login remains disabled until Firebase Authentication is initialized, Google is enabled, authorized domains are verified, and `FIREBASE_GOOGLE_SIGN_IN_ENABLED=true` is set. The old `GOOGLE_CLIENT_ID` setting is superseded.

See [Google Sign-In Setup](./docs/GOOGLE_AUTH_SETUP.md) for authorized origins, local configuration, account linking, production cookie/proxy considerations, and testing. Existing accounts require password confirmation before Google can be linked; projects and password access are preserved.

For MongoDB Atlas or production, also set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and `CLIENT_URL`.
Copy the examples in `server/.env.example` and `client/.env.example` only when needed; replace placeholders and never commit secrets.

### Profession onboarding and skills
Visit `/onboarding` after signing in, or choose **Personalize my workspace** on the dashboard. Select multiple professions, choose starting skills and continue to `/skills`. Switch a profession filter without losing your combined selection; create a new project or add skills to an existing one. In a project, select **Active project skill**, upload the indicated sources and run its assigned specialist workflow. All generated outputs are text; image prompts do not render images. Student skills remain unavailable until their workflows are supplied. Account authentication/Firebase configuration is unchanged.

The catalog and assigned instructions live in `shared/skills.js`. All seven skills use the existing Gemini model; they are not independently provisioned workers. Onboarding and project creation do not make AI requests. Per-skill output history/provenance and autonomous multi-agent pipelines are not implemented.

### Verification
```bash
npm test
npm run build
npm audit
PLAYWRIGHT_BROWSERS_PATH="$PWD/tmp/playwright" npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/tmp/playwright" npm run test:e2e
```

Browser tests require `npm run dev` to be running separately. API tests use a separate isolated MongoDB instance.
AI payload tests inject a test-only provider; they do not prove live Gemini access. Google authentication tests inject Firebase claim fixtures or mock the Firebase browser module; live Google sign-in still requires Firebase provider/domain configuration and a real-account test.

### Deployment configuration
- Vercel: root directory `client`, build `npm run build`, output `dist`; set `VITE_API_URL` to the Render API URL ending in `/api`. SPA rewrites are in `client/vercel.json`.
- Render: `render.yaml` describes the API service; supply MongoDB Atlas URI, Gemini API key, and the exact deployed frontend origin. Bind `HOST=0.0.0.0` and use Render's assigned `PORT`.
- A Firebase project/web app exists, but frontend/API hosting has not been deployed. Local development MongoDB is not a production database.
- Run `npm run check:deploy` for an offline check of hosted MongoDB, the production session secret, HTTPS origins, frontend API routing and enabled AI configuration. It never deploys, enables billing or prints secrets; the local setup currently reports four missing production configuration items. Those production credentials/origins must come from the intended deployment account; local development settings are not substituted to make this check pass.
- Use Node 24.21.0 (`.node-version` and the Render manifest). The checked-in CI workflow installs from the lockfile, audits production dependencies, runs unit/API tests, builds the client and runs isolated desktop/mobile browser tests without production credentials.
- Run the API as **one Node process on one service instance**. Project storage mutations, generated-output commits and cascade deletion are serialized per project within that process; generation itself does not hold the mutation queue. Uploads, saved responses, edits and remixes share the 50 MiB quota. Deleted projects reject late output instead of creating orphan assets. Multiple processes/replicas require a database-backed transaction or distributed lock before scaling; the local queue is not a distributed consistency guarantee.
- For disposable browser verification, use `E2E_START_SERVER=true E2E_BASE_URL=http://127.0.0.1:5273 npm run test:e2e`. This starts its own database/API/frontend on 5101/5273, leaves the existing 5001/5173 application untouched and makes no paid provider calls. Stop/retry tests keep upstream generation stalled while verifying a new request can succeed.

### Saved content editing and export
- Click **Save response to library** beside an AI chat response to create an editable Markdown asset. The saved indicator survives reload; repeated or simultaneous saves reuse the same asset without overwriting your later edits. Removing the asset allows saving the original response again.
- Open any text/Markdown asset in the source library, click **Edit content**, then **Save changes**. Remix results use the same saved editor and reopen from the source library after reload.
- Edits update the same asset and preserve its owner/project, MIME type, filename and exact UTF-8 content. A version conflict keeps your draft instead of silently overwriting another session's work; use **Reload saved version** when ready.
- Editing is limited to nonempty content up to 60,000 UTF-8 bytes. Larger text assets remain previewable/exportable. Binary media cannot be edited through this endpoint.
- Choose **Markdown (.md)** or **Plain text (.txt)** and **Download saved content**. Both formats export the exact saved text, preserving Markdown syntax rather than generating a rendered document. Save/discard unsaved edits before downloading. Requests require the normal app session and enforce ownership.
- This adds persistent remix/text-asset editing, not chat-message editing, revision history, PDF exports, or project ZIP downloads.

See [BUILD_STATUS.md](./BUILD_STATUS.md) for completed work, remaining requirements, and verification, and [docs/BUILD_DECISIONS.md](./docs/BUILD_DECISIONS.md) for resolutions of conflicting planning examples.

## 👥 Team

- [SohamB-ai](https://github.com/SohamB-ai)
- [Rehan0707](https://github.com/Rehan0707)
- [zaidunmatched](https://github.com/zaidunmatched)

## 📄 License

MIT
