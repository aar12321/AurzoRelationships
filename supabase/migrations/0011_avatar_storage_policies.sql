-- 0011_avatar_storage_policies.sql
-- Storage RLS for the shared Aurzo `user-avatars` bucket. The bucket
-- itself existed from the identity-setup pass but carried zero policies,
-- which meant any browser-side upload failed with 403. These four
-- policies match the client's path convention: the first path segment
-- MUST be the caller's auth.uid(), so a user can only read/write under
-- their own {uid}/... subtree. Public SELECT keeps the bucket browsable
-- for <img> tags anywhere an avatar renders.
--
-- Already applied to live via Management API — checking this in so fresh
-- Supabase environments (CI, staging, backups) get the same rules.

drop policy if exists "user-avatars public read" on storage.objects;
create policy "user-avatars public read"
  on storage.objects for select
  using (bucket_id = 'user-avatars');

drop policy if exists "user-avatars owner insert" on storage.objects;
create policy "user-avatars owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "user-avatars owner update" on storage.objects;
create policy "user-avatars owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'user-avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'user-avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "user-avatars owner delete" on storage.objects;
create policy "user-avatars owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'user-avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
