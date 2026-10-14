
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

### 2. Document Upload and Analysis

- Support PDF uploads. **(DONE)**
- Validate file type, size, and authorization. **(DONE)**
- Store files privately in per-user storage with RLS. **(DONE)**
- Extract PDF text with `unpdf`, then produce a structured **analysis / context
  object** (not page-level citations — see decision log 2026-10-13). **(DONE)**
- Show processing status and actionable errors with a retry action. **(DONE)**
- Support Excel imports containing paper metadata — parse rows, preserve
  workbook/sheet/row context, tolerate loosely-structured sheets, detect a
  link/URL column where present. **(TODO — Phase 1 Excel slice)**

> NOTE on "source references": the original plan called for page-referenced
> citations. Per the 2026-10-13 decision, we store a compact structured analysis
> instead (the goal is good context for the post writer, not an academic
> citation trail). The analysis is viewable alongside the draft, which satisfies
> the "inspect the analysis" intent. True page-level citations are explicitly
> descoped and NOT a Phase 1 requirement.

### 3. Paper Selection and Association

- Display imported paper metadata (rows from the Excel import). **(TODO)**
- Allow the user to select a paper. **(TODO)**
- Associate the selected paper with an uploaded PDF (manual association in
  Phase 1). **(TODO)**
- Make uncertain matches visible and correctable. **(TODO)**
- Analyze the paper into the structured context object. **(DONE for PDFs)**
- Distinguish source-supported findings from AI interpretation (the analysis
  prompt forbids inventing specific numbers/claims not present). **(DONE)**

> The AI **fetching** a paper from a link (download PDF or pull content) is
> explicitly **Phase 2** (see "Agentic paper acquisition"). In Phase 1 the link
> is only captured/displayed; the user supplies the PDF and associates it.

### 4. LinkedIn Draft Generation **(DONE)**

- Generate a technically accurate LinkedIn post based on the analysis. **(DONE)**
- Use a personal learning and reflection style. **(DONE)**
- Avoid fabricated claims, generic hype, and unsupported conclusions. **(DONE — prompt-enforced)**
- Generate Mermaid source when a diagram meaningfully improves understanding. **(DONE)**
- Validate Mermaid source before rendering. **(DONE — server + client)**
- Allow the user to inspect the analysis alongside the draft. **(DONE)**

### 5. Draft Review and Versioning **(DONE)**

- Save generated drafts. **(DONE)**
- Allow editing and regeneration. **(DONE)**
- Create a new immutable version for every content-changing edit or regeneration. **(DONE — DB trigger enforced)**
- Display draft versions and review status. **(DONE)**
- Allow approval or rejection of a specific version. **(DONE)**
- Require new approval whenever the content changes. **(DONE — new versions start pending)**
- Persist drafts and review decisions across sessions. **(DONE)**

### Phase 1 Acceptance Criteria

Phase 1 is complete when:

- [x] A user can sign in and sign out.
- [x] An authenticated user can upload a PDF.
- [ ] An Excel paper list can be imported and inspected. **(TODO)**
- [ ] The user can select a paper and correct its PDF association. **(TODO)**
- [x] The application analyzes the paper and presents the structured analysis
      for inspection. *(Reworded: page-level "source references" descoped per
      2026-10-13 decision; the structured analysis is the context record.)*
- [x] The user can generate a LinkedIn draft.
- [x] The user can edit and regenerate drafts.
- [x] Draft versions persist after refreshing the application.
- [x] Approval applies only to the exact version reviewed.
- [x] A new version requires a new approval.
- [x] The user can reject a version.
- [ ] Users cannot access another user's files or drafts. *(RLS implemented on
      every table/bucket; not yet proven by an automated isolation test — TODO.)*
- [ ] Core workflows work on desktop and mobile. *(Responsive CSS in place; not
      yet verified on mobile — TODO.)*
- [ ] Relevant automated tests pass. *(No test runner/tests yet — TODO. Verified
      so far only via typecheck/lint/build.)*

### Remaining Phase 1 work (summary)

1. **Excel import + inspect** (parse `.xlsx`, preserve workbook/sheet/row, detect
   link column, store `paper` rows).
2. **Paper selection + manual PDF association** (incl. making uncertain matches
   correctable).
3. **Automated tests** — set up a runner and cover core units: upload
   validation, Mermaid validation, version immutability/approval rules, and an
   RLS cross-user isolation test.
4. **Mobile verification** of the core workflows.

### Explicitly Out of Scope

Do not implement the following during Phase 1:

- General-purpose persistent chat.
- Knowledge retrieval across a large document library.
- LinkedIn publishing.
- Scheduling.
- Automated processing of an entire course reading list.
- Complex recurring automations.

## Phase 2 — Agentic Paper Acquisition, Chat & Knowledge Library

### Goal

Turn the Excel import into an agentic workflow: refer to a paper, have an AI
**fetch** it from its link, then flow into the existing analysis → draft
pipeline. Also expand beyond single papers with persistent chat and a reusable
knowledge library.

### Lead feature — Agentic paper acquisition (the "pull the paper from a link" flow)

This is the capability discussed on 2026-10-14. Flow:

1. User imports an Excel sheet of papers (Phase 1) and refers to one — e.g.
   "do this paper" / "do the next one".
2. The app resolves which paper is meant from conversation context and
   **confirms the match with the user before acting** (never silently guesses).
3. An agent **fetches** the paper from its link:
   - **arXiv** links/titles → via the **official arXiv API**
     (`export.arxiv.org/api/query`) for metadata + the direct PDF URL. Fetches
     MUST be paced, retried with backoff on HTTP 429, and ToS-compliant.
   - Downloaded PDF is stored in private storage like a manual upload, then runs
     the existing analysis pipeline.
4. **Out of scope / guardrails:** non-arXiv, paywalled, or login-gated sources;
   no scraping that violates a site's terms. Treat any downloaded file as
   untrusted content, not instructions.

Depends on persistent conversation state (below) for "this/next paper"
resolution. The Phase 1 schema already captures the per-row link so this plugs
in without a rewrite.

### Other Phase 2 features

- Persistent conversations and message history.
- A personal knowledge library for PDFs, spreadsheets, notes, and documents.
- Reuse of previously uploaded files across conversations.
- Retrieval with source provenance.
- An explicit action to create a draft from a conversation.
- Draft-specific chat for revisions.
- Draft history and version comparison.
- Search and organization for conversations, files, and drafts.

### Acceptance Criteria

- From an imported Excel list, the user can ask for a paper, the app confirms
  the match, fetches it via the arXiv API (paced/ToS-compliant), and runs
  analysis → draft on it.
- The user can resume previous conversations, reuse relevant uploaded knowledge,
  and create or revise drafts with traceable context.

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
- `GEMINI_MODEL` (server only, optional; defaults to `gemini-flash-latest`)

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

### 2026-10-13

- **Auth implemented (Phase 1, item 1).** Supabase email/password via
  `@supabase/supabase-js` + `@supabase/ssr` (cookie-based). Server/browser
  clients split; secrets isolated behind a `server-only` env module. Route
  protection + session refresh in Next 16 `proxy.ts` (renamed from the
  deprecated `middleware` convention). Dashboard verifies the user server-side.
- **Node upgraded 20 → 22 LTS.** Latest `supabase-js` dropped Node 20 (EOL
  Apr 2026). Managed via nvm; `engines` now `>=22`.
- **Lint toolchain migrated for Next 16.** `next lint` was removed in Next 16,
  and `eslint-config-next` via `FlatCompat` crashes under ESLint 9 flat config.
  Switched to a native flat config using `@next/eslint-plugin-next` +
  `typescript-eslint` + `eslint-plugin-react-hooks` directly; `lint` script now
  runs `eslint .`. Removed `eslint-config-next` and `@eslint/eslintrc`. This
  also resolved most of the earlier high-severity dev-only audit advisory
  (lint tree shrank significantly).
- **PDF upload (Phase 1, item 2).** `documents` table (migration 0001) + private
  Supabase Storage bucket (migration 0002), both with per-user RLS. Upload API
  validates type (PDF) and size (25 MB) server-side; files stored at
  `{user_id}/{document_id}.pdf`; orphaned bytes rolled back if the DB insert
  fails.
- **ARCHITECTURE DECISION — store a structured ANALYSIS (context object), not
  page-level text or citations.** Product intent: the goal is a good LinkedIn
  post from the *right context*, NOT an academic, page-referenced citation
  trail. We therefore reverted the earlier `document_pages` design. Pipeline:
  extract text locally with `unpdf` → send text to Gemini → store ONE structured
  analysis per document (migration 0003 `analyses`). Rationale:
    - **Cost/quota:** extracting text locally and sending text (not whole PDFs)
      to Gemini is far cheaper on the cut free tier, and lets us regenerate
      without re-uploading the PDF each time.
    - **Still no fabrication of hard specifics:** the analysis prompt forbids
      inventing numbers/metrics/citations not present — not for academic rigor,
      but to avoid a confidently-wrong stat in a public post. This is a softened
      form of the steering file's grounding rule, appropriate for LinkedIn
      content rather than paper reproduction.
    - **Trade-off accepted:** plain-text extraction loses figures/tables. If
      figure-heavy papers produce thin analyses, revisit by also passing the raw
      PDF to Gemini (multimodal) while keeping the stored analysis as the record.
- **GENERALIZATION (end goal: general LinkedIn content, not just papers).**
  Schema is deliberately source-agnostic so broadening later is additive, not a
  rewrite:
    - `documents` is a generic uploaded source (not "papers").
    - `analyses.content` is **JSONB** (not paper-specific columns) and carries a
      `source_kind` enum (currently just `'paper'`, extensible to `article`,
      `note`, `url`, …) so the context-object shape can evolve without a schema
      change.
    - The **draft core** (to be built) will treat a paper/analysis as ONE
      optional *source* of a draft, not a required parent — so drafts from
      general chat/notes/URLs fit the same model, and Phase 3 publishing attaches
      to an approved draft version regardless of origin.
- **AI provider abstraction.** `src/lib/ai/gemini.ts` exposes `generateJson`
  with task-scoped keys (`analysis`/`drafting`), 429/5xx retry with exponential
  backoff + jitter, and `QuotaExceededError`. Model name is env-configurable
  (`GEMINI_MODEL`, default `gemini-flash-latest`) because free-tier model
  availability changes often (2.5-class deprecation signals seen Oct 2026).
  Call sites depend on this module, not the SDK, so the provider is replaceable.
- **Analysis runs after upload via Next `after()`** (post-response), with a
  `/api/documents/[id]/retry` route for user-triggered re-runs. Not a durable
  job (out of scope for Phase 1); status flows `processing → ready | failed`.

### 2026-10-14

- **Phase 1 draft workflow completed.** Draft generation, edit (new immutable
  version), regenerate (new version), approve/reject per exact version, and
  version history are implemented and build-verified. DB trigger enforces
  version immutability; new versions always start `pending` (no inherited
  approval). Routes: `/api/analyses/[id]/draft`, `/api/drafts/[id]/edit`,
  `/api/drafts/[id]/regenerate`, `/api/versions/[id]/review`.
- **Phase boundaries re-scoped (user request).** The Excel workflow the user
  wants is agentic: refer to a paper → AI fetches it from a link (PDF download
  or direct pull) → analyze → draft. Mapped the pieces to phases:
    - **Phase 1 (Excel slice):** parse/inspect Excel, store `paper` rows
      including any detected link, manual paper↔PDF association. The link is
      only captured in Phase 1, not fetched.
    - **Phase 2 (lead feature):** the **agentic fetch** (arXiv API only, paced,
      ToS-compliant) + conversational "this/next paper" resolution with explicit
      user confirmation. Phase 2 now leads with this flow.
  Rationale: fetching-from-the-internet and conversational resolution were
  already Phase 2 in the Future Requirements; this makes the end-to-end intent
  explicit and keeps Phase 1 honest. Phase 1 schema captures the per-row link so
  Phase 2 plugs in without a rewrite.
- **"Source references" criterion reworded.** Page-level citations were descoped
  on 2026-10-13 in favor of the structured analysis. The acceptance criterion
  now reads "presents the structured analysis for inspection"; true page
  citations are explicitly NOT a Phase 1 requirement.
- **Known gap — no automated tests yet.** Everything so far is verified via
  `typecheck`/`lint`/`build` only. The "relevant automated tests pass" criterion
  is outstanding; a test runner + core-unit + RLS-isolation tests are listed in
  "Remaining Phase 1 work."

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

### Automation, scheduling & compute (Phase 3/4 — do not build in Phase 1)

User-stated intent (2026-10-13): after deployment, add time-triggered and
chained automation beyond the request/response features built in Phase 1:

1. **Pipeline chaining:** an analyzed paper flows automatically into draft
   generation (no manual click). Lightest to add; can be chained right after
   analysis. Make draft generation a *callable unit* (not only a UI button) so a
   pipeline/cron can invoke it. (Phase 1 draft code is being designed this way.)
2. **Email when a draft is ready for review.** Needs a trigger (draft reaches
   ready) + an email provider.
3. **Interval publishing:** e.g. "every 4–5 days, publish one approved post if an
   approved version exists." Needs a scheduler **and** the LinkedIn publishing
   integration (Phase 3, gated on verified official LinkedIn API access).
4. **Diagrams/images:** generate a system diagram as **Mermaid source** (text,
   LLM-generated, validated, rendered client-side) at draft time — NOT raster
   image generation or an always-on compute instance. Extracting an existing
   figure *out of* a PDF (`unpdf` can extract images) is a separate heavier
   feature. This is draft-time work, not a scheduler concern.

#### Why these need more than request-triggered functions

Everything in Phase 1 runs because a user made a request. The above are
time-triggered (no user in the loop) and some are multi-step, so they need a
**scheduler** (cron) and, for heavier/long/retried work, **durable background
execution**. A plain serverless function does not schedule itself.

#### Confirmed/candidate tools (all free-tier; re-verify limits before relying)

| Need | Tool | Notes |
|---|---|---|
| Serverless app + request functions | **Vercel Hobby** | Already in use. Functions capped at **60s**; max 12 functions/deployment on Hobby. |
| Scheduler (time trigger) | **Vercel Cron** (free on Hobby) | Calls one of our API routes on a schedule. Natural fit; low frequency is fine for "every 4–5 days". DB-centric alternative: **Supabase scheduled Edge Functions / `pg_cron`** (free on our project). |
| Email ("draft ready") | **Resend** (free tier) | Purpose-built; low-volume friendly. Supabase built-in email is test-only (heavily rate-limited). Requires later domain/SMTP setup. |
| Durable background jobs / retries | **Upstash QStash** (free tier) | Serverless queue + scheduler with retries. Add ONLY if a job exceeds ~60s or must survive failures. Preferred over adopting a second cloud. |

#### Compute-option evaluation (separate clouds)

Evaluated **Azure Functions**, **Google Cloud Functions / Cloud Run**, and
**Cloudflare Workers** at the user's request.

- **Decision:** do NOT adopt a second compute cloud preemptively. The app already
  has a serverless platform (Vercel) and a free scheduler (Vercel Cron). A second
  FaaS provider duplicates the credential surface (Supabase service-role + Gemini
  keys in two places), doubles logs/dashboards/failure modes, and violates the
  steering rule "do not introduce extra infrastructure without a demonstrated
  need."
- **The only legitimate trigger to look elsewhere is execution time / durability,
  not scheduling.** Vercel Hobby functions cap at 60s. If a background task needs
  minutes (e.g. Phase 4 batch-processing a whole reading list):
    1. First try **Upstash QStash** to chunk/retry within short steps.
    2. Only if that genuinely cannot work, consider a longer-run runtime —
       **Google Cloud Run** (long requests) or **Azure Functions Consumption**
       (configurable timeout) are the candidates. Cloudflare Workers' short CPU
       budget makes long multi-step jobs awkward; not a clean fit.
- **OPEN QUESTION to validate after deploy:** does a single
  analyze → draft(+Mermaid) generation complete **within 60s** on Vercel? If yes,
  no durable-jobs infra is needed for per-paper work and we keep the simple
  `after()`/cron model. If it exceeds 60s, introduce QStash (or a longer-run
  runtime) at that point — a measured decision, not a preemptive one.

> Guardrail (unchanged): publishing/scheduling stay disabled until Phase 3, which
> first requires verifying official LinkedIn API access and permissions. The
> server must verify approval + exact version identity before any publish.
