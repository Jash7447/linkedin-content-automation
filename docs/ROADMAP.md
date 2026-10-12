
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
