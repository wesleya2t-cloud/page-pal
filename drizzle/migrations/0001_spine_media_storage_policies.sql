create policy "spine media readable by authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'spine-media');

create policy "spine media upload own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'spine-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "spine media update own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'spine-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "spine media delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'spine-media' and (storage.foldername(name))[1] = auth.uid()::text);
