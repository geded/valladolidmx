-- 14.50.3 — UNC · Etapa 3 — Preferencias, categorías y consentimiento
-- Añade pista de consentimiento y RPCs SECURITY DEFINER para gestionar
-- preferencias respetando las reglas: Transaccional y Seguridad NO son
-- desactivables; Operativa y Marketing requieren consentimiento explícito
-- para canales no in-app cuando se habilitan.

-- 1) Columna de consentimiento (timestamp del acto explícito del usuario)
alter table public.notification_preferences
  add column if not exists consent_at timestamptz;

-- 2) RPC: listar preferencias del usuario (devuelve matriz completa con defaults)
create or replace function public.unc_list_my_preferences()
returns table (
  category public.notification_category,
  channel public.notification_channel,
  enabled boolean,
  locked boolean,
  consent_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with matrix as (
    select c.category, ch.channel
    from unnest(enum_range(null::public.notification_category)) c(category)
    cross join unnest(enum_range(null::public.notification_channel)) ch(channel)
  ),
  defaults as (
    select
      m.category,
      m.channel,
      -- Transaccional/Seguridad: siempre on. Operativa: on por defecto sólo in_app.
      -- Marketing: off por defecto en todos los canales.
      case
        when m.category in ('transactional','security') then true
        when m.category = 'operational' and m.channel = 'in_app' then true
        else false
      end as default_enabled,
      (m.category in ('transactional','security')) as locked
    from matrix m
  )
  select
    d.category,
    d.channel,
    coalesce(p.enabled, d.default_enabled) as enabled,
    d.locked,
    p.consent_at
  from defaults d
  left join public.notification_preferences p
    on p.user_id = auth.uid()
   and p.category = d.category
   and p.channel = d.channel
  order by d.category, d.channel;
$$;

revoke all on function public.unc_list_my_preferences() from public;
grant execute on function public.unc_list_my_preferences() to authenticated;

-- 3) RPC: actualizar una preferencia con reglas de consentimiento
create or replace function public.unc_set_my_preference(
  _category public.notification_category,
  _channel public.notification_channel,
  _enabled boolean,
  _consent boolean default false
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.notification_preferences;
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  -- Transaccional y Seguridad son inmutables (siempre habilitadas).
  if _category in ('transactional','security') then
    raise exception 'category % is not user-configurable', _category;
  end if;

  -- Habilitar canales no in-app para categorías opcionales requiere consentimiento explícito.
  if _enabled and _channel <> 'in_app' and not _consent then
    raise exception 'explicit consent required to enable channel % for category %', _channel, _category;
  end if;

  insert into public.notification_preferences (user_id, category, channel, enabled, consent_at)
  values (
    v_uid, _category, _channel, _enabled,
    case when _enabled and _consent then now() else null end
  )
  on conflict (user_id, category, channel) do update
    set enabled = excluded.enabled,
        consent_at = case
          when excluded.enabled and _consent then now()
          when not excluded.enabled then null
          else public.notification_preferences.consent_at
        end,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.unc_set_my_preference(
  public.notification_category, public.notification_channel, boolean, boolean
) from public;
grant execute on function public.unc_set_my_preference(
  public.notification_category, public.notification_channel, boolean, boolean
) to authenticated;