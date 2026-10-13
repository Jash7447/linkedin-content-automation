-- ===========================================================================
-- Migration 0003: analyses table + Row-Level Security
-- ===========================================================================
-- Purpose: store ONE structured "analysis" (a context object) per document.
-- This is the compact, LLM-generated understanding of a source that the
-- post-writer later consumes to draft a LinkedIn post. We intentionally do
-- NOT store page-level text or citations — the goal is good context for the
-- writer, not an academic citation trail (product decision; see ROADMAP).
--
-- Generalization: the useful content lives in a JSONB `content` column rather
-- than paper-specific columns, so the same table serves research papers today
-- and other source types (articles, notes, URLs) later without a schema change.
-- `source_kind` records what the analysis was derived from.
--
-- Depends on migration 0001 (documents) and 0002 (storage).
--
-- HOW TO APPLY:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--   -> Run. Run AFTER 0001/0002.
-- ===========================================================================

-- What kind of source this analysis was derived from. Extensible later
-- (e.g. 'article', 'note', 'url') without touching dependent code.
create type public.analysis_source_kind as enum ('paper');

create table public.analyses (
  id          uuid primary key default gen_random_uuid(),

  -- The source document this analysis summarizes. One analysis per document
  -- (enforced by the unique constraint below). Cascade on document delete.
  document_id uuid not null references public.documents (id) on delete cascade,

  -- Owner, for simple fast RLS.
  user_id     uuid not null references auth.users (id) on delete cascade,

  source_kind public.analysis_source_kind not null default 'paper',

  -- Short human-readable summary for quick display in lists.
  summary     text not null default '',

  -- Structured context object produced by the LLM. Shape (current):
  --   {
  --     "title": string,
  --     "problem": string,
  --     "contributions": string[],
  --     "method": string,
  --     "results": string,
  --     "takeaways": string[]
  --   }
  -- Stored as JSONB so the shape can evolve and generalize without migrations.
  content     jsonb not null default '{}'::jsonb,

  -- Which model/version produced this, for debugging/regeneration.
  model       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One analysis per document.
  unique (document_id)
);

create index analyses_user_id_created_at_idx
  on public.analyses (user_id, created_at desc);

-- Reuse the updated_at trigger function created in migration 0001.
create trigger analyses_set_updated_at
  before update on public.analyses
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security: users only access their own analyses.
-- ---------------------------------------------------------------------------
alter table public.analyses enable row level security;

create policy "analyses_select_own"
  on public.analyses
  for select
  using (auth.uid() = user_id);

create policy "analyses_insert_own"
  on public.analyses
  for insert
  with check (auth.uid() = user_id);

create policy "analyses_update_own"
  on public.analyses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "analyses_delete_own"
  on public.analyses
  for delete
  using (auth.uid() = user_id);
