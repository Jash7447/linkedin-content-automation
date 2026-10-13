-- ===========================================================================
-- Migration 0001: documents table + Row-Level Security
-- ===========================================================================
-- Purpose: store metadata for files a user uploads (PDF research papers,
-- Excel paper lists). The actual file bytes live in a private Supabase
-- Storage bucket (created in migration 0002); this table tracks ownership,
-- type, size, storage location, and processing status.
--
-- Design note: this table is intentionally generic ("documents", not
-- "papers"). A document is just an uploaded source file. Paper-specific
-- metadata and drafts are modeled in later migrations, so the schema can
-- generalize beyond research papers without a rewrite.
--
-- HOW TO APPLY:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--   -> Run. Safe to run once. (Re-running will error on "already exists",
--   which is expected and harmless.)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enum: the kind of file this document holds.
-- ---------------------------------------------------------------------------
create type public.document_kind as enum ('pdf', 'excel');

-- ---------------------------------------------------------------------------
-- Enum: processing lifecycle for a document.
--   uploaded   -> file stored, not yet processed
--   processing -> extraction/parsing in progress
--   ready      -> processed successfully
--   failed     -> processing failed (see processing_error)
-- ---------------------------------------------------------------------------
create type public.processing_status as enum (
  'uploaded',
  'processing',
  'ready',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Table: documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id                uuid primary key default gen_random_uuid(),

  -- Owner. References Supabase's built-in auth.users. ON DELETE CASCADE means
  -- deleting a user removes their documents.
  user_id           uuid not null references auth.users (id) on delete cascade,

  kind              public.document_kind   not null,

  -- Original filename as uploaded (for display). Not trusted as a path.
  original_filename text                   not null,

  -- Path within the private storage bucket (set after upload).
  storage_path      text                   not null,

  -- Reported MIME type and size (validated server-side before insert).
  mime_type         text                   not null,
  size_bytes        bigint                 not null check (size_bytes >= 0),

  status            public.processing_status not null default 'uploaded',

  -- Human-readable error if status = 'failed'. Never store document contents
  -- here (per steering: avoid logging document contents).
  processing_error  text,

  created_at        timestamptz            not null default now(),
  updated_at        timestamptz            not null default now()
);

-- Fast lookups of "my documents, newest first".
create index documents_user_id_created_at_idx
  on public.documents (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Keep updated_at current on every UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security: a user may only see and modify THEIR OWN documents.
-- ---------------------------------------------------------------------------
-- Enabling RLS with no policies denies all access by default; the policies
-- below re-grant access scoped to the authenticated user (auth.uid()).
alter table public.documents enable row level security;

-- Read own rows.
create policy "documents_select_own"
  on public.documents
  for select
  using (auth.uid() = user_id);

-- Insert only rows owned by self (prevents inserting on someone else's behalf).
create policy "documents_insert_own"
  on public.documents
  for insert
  with check (auth.uid() = user_id);

-- Update own rows (and cannot reassign ownership away via WITH CHECK).
create policy "documents_update_own"
  on public.documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete own rows.
create policy "documents_delete_own"
  on public.documents
  for delete
  using (auth.uid() = user_id);
