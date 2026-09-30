# CreatorForge live backend contract

This is the current implementation contract. Earlier PRD, TRD, schema, and implementation-plan examples are historical design notes when they disagree with this file or the code.

The API is Express under `/api`, authenticated with a CreatorForge JWT except for health and sign-in routes. MongoDB Atlas must be a replica set in production. `Project.storageBytes` is backfilled from existing `Media.size` values before the API starts; uploads, text edits and restores, chat saves, remix saves, Studio asset commits, media deletion, and project deletion run in MongoDB transactions. Storage is limited to 50 MiB per project; uploads are limited to 5 MiB each; Gemini context is limited to 15 MiB; editable/generated text assets are limited to 60,000 UTF-8 bytes. The local standalone MongoDB development server uses a process-local mutation queue.

| Method | Path | Contract |
|---|---|---|
| GET / POST | `/api/projects/:id/media` | List safe metadata / save upload immediately, with `analysisStatus: pending` |
| GET / POST | `/api/projects/:id/media/:mediaId/analysis`, `/api/projects/:id/media/:mediaId/analyze` | Read private summary/transcript / queue or retry, returning 202 while queued |
| GET / PUT | `/api/brand-kit` | Read or save account brand fields and logo metadata; logo bytes are separate |
| POST | `/api/brand-kit/import` | `{ projectId, mediaId }` for an owned PDF; returns `{ sourceMediaId, draft }` without saving it |
| GET / PUT / DELETE | `/api/brand-kit/logo` | Authenticated image bytes / multipart `file` upload / 204 removal |
| GET / PATCH | `/api/projects/:id/media/:mediaId/edit`, `/api/projects/:id/media/:mediaId` | Read saved text and version / save text using expected `version` |
| GET / POST | `/api/projects/:id/media/:mediaId/revisions`, `/api/projects/:id/media/:mediaId/restore` | List 20 latest prior snapshots / restore with `{ revisionId, version }` to a new current version |
| GET | `/api/projects/:id/media/:mediaId/export?format=markdown\|text\|pdf` | Download saved text with private no-store headers; Markdown and text preserve exact bytes; PDF streams on demand |

The analysis worker claims queued uploads atomically with a MongoDB lease, retries transient provider errors at most three times, and marks expired final leases failed. Existing assets are not backfilled. The upload remains available if AI is disabled or analysis fails. Media lists never include transcript or stored bytes; the analysis endpoint is project and owner scoped. Analysis and Studio logs contain duration/status/failure category, never creator content or credentials.

Studio's four agent workflows and revision system remain under `/api/projects/:id/studio`; ordinary text revisions are separate. `/api/remix` remains for compatibility. Google sign-in remains implemented but its production flag must stay false until the account owner finishes Firebase provider/domain setup. Email/password remains available.

For deployment, create one Render API service from `render.yaml` and configure an Atlas URI, `JWT_SECRET`, exact HTTPS `CLIENT_URL`, and optional Gemini credentials through Render secrets. Run `node scripts/configure-vercel-proxy.mjs` with `RENDER_API_ORIGIN` set to the actual Render HTTPS origin before deploying the `client` root to Vercel. This writes the `/api/:path*` external rewrite before the SPA fallback. Leave `VITE_API_URL` unset or `/api`. Run `npm run check:deploy`; it validates configuration only. Render `/api/health` returns 503 unless MongoDB is connected. Verify disposable-account isolation, upload/analysis, chat streaming through the proxy, Studio persistence, and all three export formats before enabling AI publicly. Roll back if health or core flows fail.
