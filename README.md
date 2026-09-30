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
Replace the model placeholder with an actual `gemini-...` model ID. There is no hardcoded default, automatic model switch or fake-provider fallback. Disabled/incomplete configuration returns a clear error without calling Google or persisting phantom output. Configuration presence does not prove live model access: test an actual generation before release. The user authorized configuration, so the supplied key is now saved only in the gitignored, permission-restricted backend environment. Google lists `gemini-3.8-flash`, but a real generation probe returned HTTP 403: "Your project has been denied access. Please contact support." AI remains explicitly disabled until project access is resolved or a replacement authorized key passes `npm run check:ai`.
An existing detached development session can be stopped with `kill "$(cat tmp/dev.pid)"` from the project root.

### Google sign-in
Authentication and Firebase console setup are now **user-managed**; current build work leaves their configuration untouched.
Google sign-in uses Firebase **only as the Google identity provider**. MongoDB, email/password login and CreatorForge JWT sessions remain unchanged. The dedicated Firebase project `creatorforge-20260930-204983` and web app are created; their web configuration is saved locally. Live login remains disabled until Firebase Authentication is initialized, Google is enabled, authorized domains are verified, and `FIREBASE_GOOGLE_SIGN_IN_ENABLED=true` is set. The old `GOOGLE_CLIENT_ID` setting is superseded.

See [Google Sign-In Setup](./docs/GOOGLE_AUTH_SETUP.md) for authorized origins, local configuration, account linking, production cookie/proxy considerations, and testing. Existing accounts require password confirmation before Google can be linked; projects and password access are preserved.

For MongoDB Atlas or production, also set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and `CLIENT_URL`.
Copy the examples in `server/.env.example` and `client/.env.example` only when needed; replace placeholders and never commit secrets.

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
- Run `npm run check:deploy` for an offline check of hosted MongoDB, the production session secret, HTTPS origins, frontend API routing and enabled AI configuration. It never deploys, enables billing or prints secrets; the local setup currently reports four missing production configuration items. Existing dependency audit findings also remain a release blocker. Those production credentials/origins must come from the intended deployment account; local development settings are not substituted to make this check pass.

### Saved content editing and export
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
