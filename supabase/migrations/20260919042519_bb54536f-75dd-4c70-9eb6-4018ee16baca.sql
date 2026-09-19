drop policy if exists "Authenticated can read alux settings" on public.alux_settings;
create policy "Admins can read alux settings" on public.alux_settings
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));