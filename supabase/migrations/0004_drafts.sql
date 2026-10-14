-- ===========================================================================
-- Migration 0004: drafts + draft_versions + Row-Level Security
-- ===========================================================================
-- Purpose: a LinkedIn draft and its IMMUTABLE version history. Core content
-- object of the product.
--
-- Steering rules enforced here (see .kiro/steering/project.md §6):
--   - Every content-changing edit/regeneration creates a NEW version.
--   - Approval/rejection applies to ONE EXACT version.
--   - A new version does NOT inherit approval from an older version.
--   - Future publishing must reference the exact approved version.
--
-- GENERALIZATION (see ROADMAP): a draft is source-agnostic. It MAY reference a
-- source analysis/document, but neither is required — so drafts created from a
-- general chat/note/URL later fit the same model. `source_analysis_id` and
-- `source_document_id` are nullable with ON DELETE SET NULL, so deleting a
-- source does not destroy the draft/version history.
--
-- Depends on 0001 (documents) and 0003 (analyses).
--
-- HOW TO APPLY:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--   -> Run. Run AFTER 0001/0002/0003.
-- ===========================================================================

-- Review status of a single version.
create type public.version_review_status as enum (
  'pending',   -- generated/edited, not yet reviewed
  'approved',  -- approved by the user (this exact version)
  'rejected'   -- rejected (must never be published)
);

-- ---------------------------------------------------------------------------
-- drafts: the container. Points at the "current" version for convenience, but
-- the versions table is the source of truth for history and approval.
-- ---------------------------------------------------------------------------
create table public.drafts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,

  -- Optional source grounding (nullable => source-agnostic).
  source_analysis_id  uuid references public.analyses (id)  on delete set null,
  source_document_id  uuid references public.documents (id) on delete set null,

  title               text not null default '',

  -- Convenience pointer to the latest version (see draft_versions). Nullable
  -- until the first version is created. Not the source of truth for approval.
  current_version_id  uuid,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index drafts_user_id_created_at_idx
  on public.drafts (user_id, created_at desc);

create trigger drafts_set_updated_at
  before update on public.drafts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- draft_versions: immutable snapshots. One row per generation/edit.
-- ---------------------------------------------------------------------------
create table public.draft_versions (
  id              uuid primary key default gen_random_uuid(),
  draft_id        uuid not null references public.drafts (id) on delete cascade,
  user_id         uuid not null references auth.users (id)   on delete cascade,

  -- Monotonic version number within a draft (1, 2, 3, …).
  version_number  int  not null check (version_number >= 1),

  -- The post content.
  post_text       text not null,

  -- Optional Mermaid diagram source (validated before storing). Null if none.
  mermaid_source  text,

  -- Review state for THIS exact version. New versions start 'pending'.
  review_status   public.version_review_status not null default 'pending',
  reviewed_at     timestamptz,

  -- Which model produced it (for debugging/regeneration).
  model           text,

  created_at      timestamptz not null default now(),

  unique (draft_id, version_number)
);

create index draft_versions_draft_id_idx
  on public.draft_versions (draft_id, version_number desc);

-- FK from drafts.current_version_id to a version (added after the table exists
-- to avoid a circular create-time dependency).
alter table public.drafts
  add constraint drafts_current_version_fk
  foreign key (current_version_id)
  references public.draft_versions (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- IMMUTABILITY: forbid changing the CONTENT of a version after creation.
-- Review fields (review_status, reviewed_at) MAY change; post_text,
-- mermaid_source, version_number, draft_id may NOT. A content change must be a
-- new row (new version), never an in-place edit.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_draft_version_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.post_text      is distinct from old.post_text
     or new.mermaid_source is distinct from old.mermaid_source
     or new.version_number is distinct from old.version_number
     or new.draft_id       is distinct from old.draft_id
     or new.created_at     is distinct from old.created_at then
    raise exception 'draft_versions are immutable; create a new version instead';
  end if;
  return new;
end;
$$;

create trigger draft_versions_immutable
  before update on public.draft_versions
  for each row execute function public.enforce_draft_version_immutable();

-- ---------------------------------------------------------------------------
-- Row-Level Security: users only access their own drafts/versions.
-- ---------------------------------------------------------------------------
alter table public.drafts         enable row level security;
alter table public.draft_versions enable row level security;

create policy "drafts_select_own" on public.drafts
  for select using (auth.uid() = user_id);
create policy "drafts_insert_own" on public.drafts
  for insert with check (auth.uid() = user_id);
create policy "drafts_update_own" on public.drafts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "drafts_delete_own" on public.drafts
  for delete using (auth.uid() = user_id);

create policy "draft_versions_select_own" on public.draft_versions
  for select using (auth.uid() = user_id);
create policy "draft_versions_insert_own" on public.draft_versions
  for insert with check (auth.uid() = user_id);
-- Update allowed (for review status changes) but content is frozen by the
-- immutability trigger above.
create policy "draft_versions_update_own" on public.draft_versions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "draft_versions_delete_own" on public.draft_versions
  for delete using (auth.uid() = user_id);
