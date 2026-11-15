-- Storage buckets. Every object key is prefixed with the owner's user id:
--   job-images/<uid>/<job-id>/<file>.webp
--   avatars/<uid>/<file>.webp
--   bank-slips/<uid>/<job-id>/<file>.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('job-images', 'job-images', true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('avatars',    'avatars',    true,  2097152, array['image/jpeg','image/png','image/webp']),
  ('bank-slips', 'bank-slips', false, 8388608, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- job-images / avatars: public read (bucket is public), owner-only write.
create policy "public images read" on storage.objects for select
  using (bucket_id in ('job-images','avatars'));

create policy "own images insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('job-images','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own images update" on storage.objects for update to authenticated
  using (bucket_id in ('job-images','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own images delete" on storage.objects for delete to authenticated
  using (bucket_id in ('job-images','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- bank-slips: NO public read. Insert by owner, select by owner or admin.
-- Admins are served short-lived signed URLs generated server-side.
create policy "own slips insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'bank-slips' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own or admin slips read" on storage.objects for select to authenticated
  using (bucket_id = 'bank-slips'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
