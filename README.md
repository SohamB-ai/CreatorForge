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
| AI | Google Gemini 2.0 Flash API |
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

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Google Gemini API key

### Frontend
```bash
cd client
npm install
npm run dev
```

### Backend
```bash
cd server
npm install
npm run dev
```

### Environment Variables

**server/.env**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
```

**client/.env**
```env
VITE_API_URL=http://localhost:5000/api
```

## 👥 Team

- [SohamB-ai](https://github.com/SohamB-ai)
- [Rehan0707](https://github.com/Rehan0707)
- [zaidunmatched](https://github.com/zaidunmatched)

## 📄 License

MIT
