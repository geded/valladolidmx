create policy "tourism_attribute_options_editor_insert"
on public.tourism_attribute_options
for insert
to authenticated
with check (public.is_editor_or_admin(auth.uid()));