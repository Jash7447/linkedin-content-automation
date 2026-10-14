-- ===========================================================================
-- Migration 0005: papers table + Row-Level Security
-- ===========================================================================
-- Purpose: one row per paper imported from an Excel sheet. Tolerant of
-- loosely-structured sheets (ROADMAP "Loosely-structured Excel input"):
--   - preserves workbook/sheet/row context,
--   - stores ALL original cells as JSONB (no fixed column assumptions),
--   - records heuristically-detected title + link (may be null / low-confidence),
--   - allows a manual, CORRECTABLE association to an uploaded PDF document.
--
-- Generalization: `link` + optional `document_id` set up the Phase 2 agentic
-- fetch (download the paper from its link) without a rewrite — in Phase 1 the
-- link is only captured; the user supplies/associates the PDF.
--
-- Depends on 0001 (documents).
--
-- HOW TO APPLY:
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--   Run AFTER 0001-0004.
-- ===========================================================================

create table public.papers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,

  -- The Excel document this row was imported from (a 'excel' kind document).
  -- Nullable + SET NULL so deleting the source file doesn't destroy the paper.
  source_document_id uuid references public.documents (id) on delete set null,

  -- Source context (preserve exact provenance).
  workbook_name text,            -- original uploaded filename
  sheet_name    text not null,
  row_number    int  not null check (row_number >= 1),

  -- All cells of the row, keyed by detected/first-row header (or col letter).
  raw_cells     jsonb not null default '{}'::jsonb,

  -- Heuristically detected fields (best-effort; may be null).
  detected_title text,
  detected_link  text,

  -- Manual association to an uploaded PDF document (correctable). Nullable.
  document_id   uuid references public.documents (id) on delete set null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index papers_user_id_created_at_idx
  on public.papers (user_id, created_at desc);

create trigger papers_set_updated_at
  before update on public.papers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security: users only access their own papers.
-- ---------------------------------------------------------------------------
alter table public.papers enable row level security;

create policy "papers_select_own" on public.papers
  for select using (auth.uid() = user_id);
create policy "papers_insert_own" on public.papers
  for insert with check (auth.uid() = user_id);
create policy "papers_update_own" on public.papers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "papers_delete_own" on public.papers
  for delete using (auth.uid() = user_id);
