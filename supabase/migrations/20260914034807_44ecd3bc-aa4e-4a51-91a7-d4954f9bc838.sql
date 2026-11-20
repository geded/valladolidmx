create or replace function public.concierge_directory()
returns table (user_id uuid, display_name text, active boolean)
language sql
stable
security definer
set search_path = public
as $$
  select cp.user_id, cp.display_name, cp.active
  from public.concierge_profiles cp
  where public.concierge_is_internal(auth.uid())
  order by cp.active desc, cp.display_name asc
$$;

revoke all on function public.concierge_directory() from public, anon;
grant execute on function public.concierge_directory() to authenticated, service_role;