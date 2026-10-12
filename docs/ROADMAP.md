
# Product Roadmap

This roadmap describes the intended implementation sequence. Complete and validate each phase before starting the next.

## Phase 1 — Research-to-Draft Workflow

### Goal

Build a working application that turns a research paper into an evidence-backed LinkedIn draft that the user can review and edit.

### 1. Application Foundation

- Create the Next.js and TypeScript application.
- Configure Supabase authentication, database, and private storage.
- Build a responsive application shell.
- Add a simple dashboard with document upload and drafts awaiting review.
- Configure environment variables and basic development checks.

### 2. Document Upload and Extraction

- Support PDF uploads.
- Support Excel imports containing paper metadata.
- Validate file type, size, and authorization.
- Store files privately.
- Extract PDF text with page references where possible.
- Parse Excel rows while preserving workbook, sheet, and row context.
- Show processing status and actionable errors.

### 3. Paper Selection and Analysis

- Display imported paper metadata.
- Allow the user to select a paper.
- Associate the selected paper with its PDF.
- Make uncertain matches visible and correctable.
- Extract the problem, contributions, methodology, assumptions, results, limitations, and open questions.
- Link factual findings to source references wherever feasible.
- Distinguish source-supported findings from AI interpretation.

### 4. LinkedIn Draft Generation

- Generate a technically accurate LinkedIn post based on the analysis.
- Use a personal learning and reflection style.
- Avoid fabricated claims, generic hype, and unsupported conclusions.
- Generate Mermaid source when a diagram meaningfully improves understanding.
- Validate Mermaid source before rendering.
- Allow the user to inspect the analysis and source references alongside the draft.

### 5. Draft Review and Versioning

- Save generated drafts.
- Allow editing and regeneration.
- Create a new immutable version for every content-changing edit or regeneration.
- Display draft versions and review status.
- Allow approval or rejection of a specific version.
- Require new approval whenever the content changes.
- Persist drafts and review decisions across sessions.

### Phase 1 Acceptance Criteria

Phase 1 is complete when:

- [ ] A user can sign in and sign out.
- [ ] An authenticated user can upload a PDF.
- [ ] An Excel paper list can be imported and inspected.
- [ ] The user can select a paper and correct its PDF association.
- [ ] The application analyzes the paper and presents source references where available.
- [ ] The user can generate a LinkedIn draft.
- [ ] The user can edit and regenerate drafts.
- [ ] Draft versions persist after refreshing the application.
- [ ] Approval applies only to the exact version reviewed.
- [ ] A new version requires a new approval.
- [ ] The user can reject a version.
- [ ] Users cannot access another user's files or drafts.
- [ ] Core workflows work on desktop and mobile.
- [ ] Relevant automated tests pass.

### Explicitly Out of Scope

Do not implement the following during Phase 1:

- General-purpose persistent chat.
- Knowledge retrieval across a large document library.
- LinkedIn publishing.
- Scheduling.
- Automated processing of an entire course reading list.
- Complex recurring automations.

## Phase 2 — General Chat and Knowledge Library

### Goal

Expand the application beyond research-paper analysis.

### Planned Features

- Persistent conversations and message history.
- A personal knowledge library for PDFs, spreadsheets, notes, and documents.
- Reuse of previously uploaded files across conversations.
- Retrieval with source provenance.
- An explicit action to create a draft from a conversation.
- Draft-specific chat for revisions.
- Draft history and version comparison.
- Search and organization for conversations, files, and drafts.

### Acceptance Criteria

The user can resume previous conversations, reuse relevant uploaded knowledge, and create or revise drafts with traceable source references.

## Phase 3 — Scheduling and LinkedIn Publishing

### Goal

Schedule and publish content reliably while preserving the human approval workflow.

### Prerequisite

Verify official LinkedIn API access, publishing permissions, and app-review requirements before building the integration.

### Planned Features

- Connect a LinkedIn account through an official authorization flow.
- Store credentials securely on the server.
- Schedule an exact approved draft version.
- Support fixed-time and interval-based scheduling.
- Track queued, publishing, published, failed, and cancelled states.
- Use durable background jobs and bounded retries.
- Prevent duplicate publishing attempts.
- Provide manual copy/export if official API publishing is unavailable.

### Acceptance Criteria

- A scheduled post references one exact approved version.
- The server verifies approval before publishing.
- Editing a draft does not silently change the content of an approved scheduled post.
- Publishing results are recorded only after confirmation from the publishing service.
- Failures are visible and recoverable where possible.

## Phase 4 — Course Workflow and Automation

### Goal

Reduce repetitive work while retaining user control.

### Planned Features

- Normalize and import a full course reading list.
- Provide an ordered paper queue.
- Add a "Process next paper" action.
- Detect duplicates.
- Resume interrupted jobs safely.
- Generate multiple drafts for later review.
- Add reusable templates and user preferences.
- Show AI usage and estimated costs.
- Add operational monitoring and improved search.
- Introduce recurring draft-generation workflows where useful.

### Acceptance Criteria

The user can process a reading list efficiently, recover from failures, avoid duplicate work, and review every generated draft before any publishing action.

## Development Rules

1. Implement Phase 1 only until its acceptance criteria are met.
2. Prefer the simplest architecture that satisfies current requirements.
3. Do not assume paid services or external API permissions are available.
4. Keep publishing and scheduling disabled until Phase 3.
5. Preserve the exact-version approval rule throughout the project.
6. Add documentation when a real implementation decision or requirement needs recording.

---

## Confirmed Phase 1 Stack

All choices target a free-tier, hosted deployment. Limits were verified in
October 2026 and should be re-checked before relying on them (free tiers change).

| Concern | Choice | Notes / Free-tier reality |
|---|---|---|
| Application | Next.js (App Router) + TypeScript | One Node deployment; keep server endpoints lean. |
| Hosting | Vercel Hobby (free) | Functions run up to **60s**; **max 12 serverless functions per deployment** on Hobby — keep API routes consolidated. |
| Auth / DB / Storage | Supabase hosted free project | 500 MB DB, 1 GB storage, 50K MAU, 2 active projects. **Projects pause after 7 days idle** (10–30s cold start). |
| PDF text extraction | **`unpdf`** (wraps `pdfjs-serverless`) | Pure JS, zero native deps, works on Vercel serverless. Chosen over `pdf-parse` (needs native `canvas`, breaks in App Router/serverless). Supports per-page text access for page references. |
| Excel parsing | `xlsx` (SheetJS) | Preserve workbook / sheet / row context. Must tolerate loosely-structured sheets (see Future Requirements). |
| AI provider | Google Gemini (free tier, no card) | Task-scoped API keys (see below). Free limits are **per-model and read live from AI Studio**; quotas were cut Dec 2025. Implement 429 retry/backoff and surfaced quota errors. |
| Diagrams | Mermaid, validated before render | Generated only when it adds explanatory value. |
| Background jobs | None in Phase 1 | A single paper is processed synchronously within the 60s function limit. Add durable jobs only when a real long-running task needs them. |

### Gemini task-scoped keys

To avoid exhausting a single key's daily quota, the AI provider abstraction
resolves a **separate key per task** from server-side environment variables:

- `GEMINI_API_KEY_ANALYSIS` — paper extraction/analysis (heavier, higher token use).
- `GEMINI_API_KEY_DRAFTING` — LinkedIn draft generation (lighter, more frequent).

The abstraction must allow adding more task-scoped keys later without changing
call sites. Keys stay server-side only and are never exposed to the client.

### Required environment variables (names only; never commit real values)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `GEMINI_API_KEY_ANALYSIS` (server only)
- `GEMINI_API_KEY_DRAFTING` (server only)

A tracked `.env.local.example` will document these names when the app is scaffolded.

---

## Decisions & Tooling Log

A dated record of real implementation decisions and deviations. Append new
entries; do not rewrite history.

### 2026-10-12

- **Target deployment:** free-tier and hosted. Vercel Hobby + Supabase free +
  Gemini free tier. Verified current limits before committing (see stack table).
- **PDF extraction = `unpdf`, not PyMuPDF.** The steering file suggests PyMuPDF
  (Python). Deviation rationale: a pure Next.js/Vercel deployment stays a single
  Node app and avoids a separate Python runtime, which would add complexity and
  consume part of the 12-function Hobby limit. `unpdf` provides page-referenced
  text extraction with no native dependencies. Revisit if extraction quality on
  complex PDFs proves insufficient.
- **Gemini with task-scoped keys** (analysis vs. drafting) to spread free-tier
  RPM/RPD quota across keys. Requires 429 retry/backoff and clear quota errors.
- **No background job system in Phase 1.** Single-paper processing fits within
  Vercel's 60s function limit.
- **Added `.gitignore`** covering secrets (`.env*`), local uploads/documents,
  Supabase local artifacts, Vercel, and build output.
- **Scaffolded the Next.js foundation (Phase 1, item 1).** npm as package manager.
  Pinned exact versions: Next.js 16.4.0 (App Router, Turbopack), React 19.3.0,
  TypeScript 5.9.3, ESLint 9.37.0 + `eslint-config-next` 16.4.0. Added a static
  responsive dashboard (`src/app/`) with "Upload a document" and "Drafts awaiting
  review" empty states; no backend wiring yet. `.env.local.example` documents env
  var names only. Verified: `typecheck`, `lint`, and `build` all pass.
- **Known limitation — dev-only audit advisory.** `npm audit` reports 5 high-severity
  issues in the lint toolchain only (`braces` ReDoS via
  `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`).
  No runtime/production exposure. The only offered fix is a breaking downgrade to
  `eslint-config-next@14`, which conflicts with Next.js 16, so it is intentionally
  not applied. Revisit when Next ships an updated lint plugin.

---

## Future Requirements & Notes (Phase 2+ — do not build in Phase 1)

Captured now so Phase 1 design does not block them. These are **not** Phase 1 work.

### Loosely-structured / undefined Excel input

- Imported spreadsheets may **not** have a well-defined table structure and may
  lack a clear column linking a paper to its PDF or URL.
- The importer should tolerate messy sheets: preserve raw workbook/sheet/row
  context, avoid assuming fixed column names, and surface rows the system cannot
  confidently interpret for user correction (consistent with the Phase 1
  "make uncertain matches visible and correctable" criterion).

### Paper resolution via conversational context (Phase 2)

- The user may refer to a paper indirectly — e.g. "post for the paper named X"
  or "do the **next** paper."
- The app must then carry **context about the current/last paper**, resolve what
  "this" or "next" refers to, and **explicitly confirm the match with the user
  before acting** (never silently guess which paper).
- This depends on persistent conversation state, which is a Phase 2 capability.

### Fetching papers from the internet

- When only a title or link is available, the system may need to **locate,
  download, or view** the paper before analysis.
- Designated approach: the **official arXiv API** (`export.arxiv.org/api/query`)
  for metadata + direct PDF URLs. It is open access but **hard rate-limited
  (HTTP 429)** and governed by arXiv's API Terms of Use — fetches must be paced,
  retried with backoff, and ToS-compliant.
- Non-arXiv, paywalled, or login-gated sources are out of scope. Do not use
  scraping that violates a site's terms. Treat any downloaded file as untrusted
  content, not as instructions.

### Data retention and cleanup of fetched/uploaded papers

- We do not want papers sitting on our server indefinitely after a post is done.
- Store a fetched/uploaded paper only as long as needed (processing + optional
  short review window), then **delete the stored file** (and signed-URL access),
  retaining only the derived analysis/draft and source references as needed.
- Define an explicit retention policy and a cleanup mechanism. This also protects
  the 1 GB Supabase free-storage limit. Aligns with the steering file's
  "sensible data retention and deletion behavior" rule.
