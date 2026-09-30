# Agent Studio

Studio replaces the Remix tab with four workflows available in every project. Existing chat skills and the `/api/remix` API remain compatible.

- YouTube: choose an angle, approve an editable chapter outline, then generate a chapter-based script. Failed later chapters can resume from saved progress. A completed script can be regenerated explicitly.
- Shorts: choose a hook and generate a 15–60 second script.
- Hook Lab: edit ten hook variants and five title/thumbnail concepts.
- Repurposer: generate and retry X, LinkedIn, and newsletter outputs independently.

Use **Save changes** to persist edits. Changes to the brief, references, or creative overrides make existing output outdated; it stays available until you regenerate it. Approve a current outline before generating long-form content. Scene timing is estimated at 150 spoken words per minute.

The quality audit reports deterministic pacing/loop checks and model-assisted editorial findings. It never predicts audience retention. Content edits invalidate the audit; run it again when ready. Generation and auditing are separate actions so audit failures cannot lose the script.

Final artifacts are saved as linked Markdown source-library assets. Open them from the library to return to their structured Studio editor. Markdown and text exports use the existing authenticated export endpoints. Other text assets continue to use the ordinary editor.

## Server interfaces

All endpoints require the existing bearer session and project ownership. Base: `/api/projects/:id/studio`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/catalog` | Agent metadata and stages |
| GET / POST | `/runs` | List / create project drafts |
| GET / PATCH | `/runs/:runId` | Read / save a versioned draft or artifact |
| POST | `/runs/:runId/generate` | Generate a stage, audit, or selected scene |
| GET | `/runs/:runId/revisions` | List saved revisions |
| POST | `/runs/:runId/restore` | Restore a prior revision into a new revision |

Mutations take `revision`; generation additionally takes a UUID `requestId` and `stage`. A stale revision returns 409. Successful repeated request IDs return the saved response. Scene regeneration takes `sceneId`; long-form full regeneration takes `restart: true`. Successful chapters are saved individually, so a partial failure changes the run revision: reload before retrying.

Provider responses are JSON, validated against Zod schemas with one format-repair attempt. A stage has a three-minute ceiling and provider calls have the existing sixty-second ceiling. Cancelling disconnects the HTTP request and aborts provider work. Previously completed chapters remain saved.

Rulebooks are versioned under `server/skills/`; the server registry owns supported stages, response schemas, and token budgets. Platform constraints outrank explicit overrides, which outrank brand guidance and creative defaults. Reference material never supplies instructions. Studio runs retain their brand snapshot for repeatability.

Storage checks retain the 60 KB exported-text and 50 MB project-media limits. Project deletion removes Studio runs, revision snapshots, and request records. Generation telemetry logs only stage, agent, elapsed time, and failure category.

## Verification

- `npm test`: regression and mocked-provider Studio integration checks, using temporary MongoDB.
- `E2E_START_SERVER=true E2E_BASE_URL=http://127.0.0.1:5273 npx playwright test tests/browser/studio.spec.js tests/browser/content.spec.js`: desktop/mobile workflow and source-library checks.
- `npm run build`: production frontend.
- `npm run check:ai`: **opt-in live request** using the configured model/key. This checks provider access and can incur usage; it does not enable generation or change configuration. Mocked tests do not establish creative quality or live model compatibility. Manually exercise each format with real sources before release.
