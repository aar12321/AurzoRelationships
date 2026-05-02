-- 0014_memories_storage.sql
-- Storage bucket + RLS for the Relationship OS `memories` photo bucket.
--
-- Mirrors the pattern set by 0011 for `user-avatars`: the first path
-- segment is the caller's auth.uid(), so users can only upload/update/
-- delete under their own {uid}/... subtree. Public SELECT keeps the
-- bucket browsable by <img> tags wherever a memory card renders.
--
-- The bucket itself is created idempotently (insert .. on conflict)
-- so this migration is safe whether the bucket already exists or not.
-- 10 MB cap is generous for phone-camera output (typical 2-4 MB) and
-- the MIME allow-list keeps non-image junk out of the bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories',
  'memories',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "memories public read" on storage.objects;
create policy "memories public read"
  on storage.objects for select
  using (bucket_id = 'memories');

drop policy if exists "memories owner insert" on storage.objects;
create policy "memories owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'memories'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "memories owner update" on storage.objects;
create policy "memories owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'memories'
    and (auth.uid())::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'memories'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "memories owner delete" on storage.objects;
create policy "memories owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'memories'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
