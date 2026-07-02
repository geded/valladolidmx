-- Políticas de storage.objects para el bucket privado 'studio-media'.
-- Escritura/borrado: sólo editores/admins. Lectura: sólo servicio (backend firma URLs).
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='studio-media editor insert'
  ) then
    create policy "studio-media editor insert" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'studio-media'
        and public.is_editor_or_admin(auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='studio-media editor update'
  ) then
    create policy "studio-media editor update" on storage.objects
      for update to authenticated
      using (
        bucket_id = 'studio-media'
        and public.is_editor_or_admin(auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='studio-media editor delete'
  ) then
    create policy "studio-media editor delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'studio-media'
        and public.is_editor_or_admin(auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
    and policyname='studio-media editor select'
  ) then
    create policy "studio-media editor select" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'studio-media'
        and public.is_editor_or_admin(auth.uid())
      );
  end if;
end $$;