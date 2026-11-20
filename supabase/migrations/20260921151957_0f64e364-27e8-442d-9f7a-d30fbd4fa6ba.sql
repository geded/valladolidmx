create or replace function public.unc_notify_new_traveler()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
begin
  for v_admin in
    select distinct ur.user_id
      from public.user_roles ur
     where ur.role in ('admin','super_admin')
  loop
    begin
      perform public.unc_publish_in_app(
        'traveler.signup:' || new.user_id::text,
        'Traveler.SignedUp',
        v_admin.user_id,
        'admin',
        'operational'::public.notification_category,
        jsonb_build_object(
          'traveler_user_id', new.user_id,
          'display_name', coalesce(new.display_name, new.email, 'Viajero nuevo'),
          'url', '/admin/turistas'
        )
      );
    exception when others then
      null; -- el registro del viajero nunca debe fallar por un aviso
    end;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_unc_notify_new_traveler on public.profiles;
create trigger trg_unc_notify_new_traveler
after insert on public.profiles
for each row execute function public.unc_notify_new_traveler();