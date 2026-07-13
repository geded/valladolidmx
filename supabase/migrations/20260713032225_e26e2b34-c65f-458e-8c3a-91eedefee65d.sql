
-- Storage policies for private bucket 'travel-memories'
-- Path convention: <auth.uid()>/<uuid>.<ext>

create policy "travel_memories_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'travel-memories'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "travel_memories_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'travel-memories'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "travel_memories_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'travel-memories'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'travel-memories'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "travel_memories_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'travel-memories'
  and auth.uid()::text = (storage.foldername(name))[1]
);
