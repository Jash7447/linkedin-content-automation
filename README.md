# LinkedIn Content Workspace

An AI-powered workspace for turning research papers, technical documents, and personal learning into thoughtful LinkedIn content.

**Status:** Early development 🚧

## Overview

Creating meaningful technical content takes more than generating text. It requires understanding source material, identifying useful insights, communicating them clearly, and refining the result before publishing.

LinkedIn Content Workspace aims to bring that process into one place: a workspace where you can explore ideas, work with your documents, create and refine drafts, and manage content through a human-in-the-loop workflow.

The project is being developed incrementally, starting with research-paper analysis and LinkedIn draft generation.

## Planned Features

- **Research and document analysis** — Extract key contributions, methodologies, results, and limitations from technical papers.
- **AI-assisted writing** — Turn research and personal learning into clear, technically grounded LinkedIn drafts.
- **Source references** — Keep generated insights connected to their source documents wherever possible.
- **Technical diagrams** — Generate editable Mermaid diagrams to explain architectures and concepts.
- **Draft workspace** — Edit, regenerate, review, and organize drafts with version history.
- **Knowledge library** — Reuse PDFs, spreadsheets, notes, and other documents across conversations.
- **AI conversations** — Explore ideas and refine content through persistent, context-aware chats.
- **Scheduling and publishing** — Plan and publish approved posts through supported official integrations.

Features will be introduced in stages; not all capabilities are available yet.

## Initial Use Case

The first workflow focuses on research papers related to scalable system design:

1. Import paper metadata from an Excel spreadsheet.
2. Upload and analyze a research paper.
3. Identify its problem, key contributions, methodology, results, and limitations.
4. Generate a technical LinkedIn draft based on the analysis.
5. Include a diagram when it helps explain the paper.
6. Review and refine the draft before publication.

The goal is to communicate what was learned from a paper—not simply summarize it or generate generic AI content.

## Technology Stack

The initial architecture is planned around:

- [Next.js](https://nextjs.org/) and [TypeScript](https://www.typescriptlang.org/) for the application.
- [Supabase](https://supabase.com/) for authentication, database, and file storage.
- A configurable AI provider for document analysis and writing.
- [Mermaid](https://mermaid.js.org/) for editable technical diagrams.
- Background processing for document extraction and other long-running tasks where needed.

The implementation may evolve as the project develops.

## Design Principles

- **Human approval before publishing:** Generated content is a draft, not permission to publish.
- **Grounded writing:** Avoid fabricated claims, results, and citations.
- **Traceability:** Preserve source references wherever practical.
- **Versioned drafts:** Keep review decisions tied to the exact version reviewed.
- **Privacy and security:** Protect uploaded documents, credentials, and user content.
- **Incremental development:** Prioritize a working, maintainable product over premature complexity.

## Project Roadmap

1. **Foundation:** Document upload, paper analysis, draft generation, and review.
2. **Knowledge workspace:** Persistent conversations, reusable documents, and draft-specific refinement.
3. **Publishing workflow:** Scheduling and official LinkedIn integration, subject to API access and permissions.
4. **Automation:** Reading-list processing, batch draft generation, and workflow improvements.

## Current Status

This project is in its initial development stage. The roadmap describes intended functionality, not a claim that these features are already implemented.

## Contributions

The project structure and implementation are still evolving. Bug reports, ideas, and constructive feedback are welcome as the project becomes more complete.

## Disclaimer

This is an independent project and is not affiliated with or endorsed by LinkedIn. Any future LinkedIn integration will depend on the availability and terms of official APIs.