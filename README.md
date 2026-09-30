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

To enable live AI, create `server/.env` and add your key locally:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
```

Restart the app after changing backend environment variables.
Missing AI configuration produces a clear message rather than invented output.
An existing detached development session can be stopped with `kill "$(cat tmp/dev.pid)"` from the project root.

### Google sign-in
Google sign-in is integrated alongside email/password login and registration, but remains disabled until `GOOGLE_CLIENT_ID` is set on the backend. Use a Google OAuth Web application client ID, not an API key. No client secret is required for this sign-in-only flow.

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
AI payload tests inject a test-only provider; they do not prove live Gemini access. Google authentication tests inject verified-claim fixtures or mock Google browser services; live Google sign-in still requires actual OAuth configuration.

### Deployment configuration
- Vercel: root directory `client`, build `npm run build`, output `dist`; set `VITE_API_URL` to the Render API URL ending in `/api`. SPA rewrites are in `client/vercel.json`.
- Render: `render.yaml` describes the API service; supply MongoDB Atlas URI, Gemini API key, and the exact deployed frontend origin. Bind `HOST=0.0.0.0` and use Render's assigned `PORT`.
- Cloud services have not been created or deployed. Local development MongoDB is not a production database.

See [BUILD_STATUS.md](./BUILD_STATUS.md) for completed work, remaining requirements, and verification, and [docs/BUILD_DECISIONS.md](./docs/BUILD_DECISIONS.md) for resolutions of conflicting planning examples.

## 👥 Team

- [SohamB-ai](https://github.com/SohamB-ai)
- [Rehan0707](https://github.com/Rehan0707)
- [zaidunmatched](https://github.com/zaidunmatched)

## 📄 License

MIT
