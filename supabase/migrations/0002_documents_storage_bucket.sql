-- ===========================================================================
-- Migration 0002: private "documents" storage bucket + Storage RLS
-- ===========================================================================
-- Purpose: create a PRIVATE bucket to hold uploaded file bytes, and restrict
-- access so each user can only read/write files inside their own folder.
--
-- File path convention (enforced by the policies below):
--     {user_id}/{document_id}.{ext}
-- The first path segment MUST equal the authenticated user's id. This is how
-- we guarantee one user cannot read or overwrite another user's files.
--
-- Private bucket = no public URLs. The app serves files via short-lived
-- signed URLs generated server-side.
--
-- HOW TO APPLY:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--   -> Run. Run this AFTER migration 0001.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Create the private bucket (id and name both "documents").
-- `public => false` keeps it private.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage RLS policies on storage.objects, scoped to this bucket and to a
-- per-user top-level folder.
--
-- storage.foldername(name) returns the path segments as an array;
-- element [1] is the first folder, which must equal the user's id.
-- ---------------------------------------------------------------------------

create policy "documents_bucket_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
