-- 14.50.1 — Unified Notification Center · Etapa 1 (Fundaciones)
-- Tablas base, enums, índices, RLS, GRANTs y RPCs mínimas SECURITY DEFINER.
-- Sin canales activos. Sólo cimientos para Router/Adapters posteriores.

-- =========================================================================
-- 1) Enums
-- =========================================================================
do $$ begin
  create type public.notification_channel as enum ('in_app','email','push','webhook');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_category as enum ('transactional','operational','security','marketing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_delivery_status as enum ('pending','sent','failed','skipped','dead_letter');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- 2) notification_subscriptions
--    Mapping declarativo BEA event_type -> notificación -> audiencia/canal.
--    Catálogo administrado por super_admin. Lectura sólo a admin/super_admin.
-- =========================================================================
create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  audience text not null,                        -- e.g. 'owner','admin','traveler','super_admin'
  channel public.notification_channel not null,
  category public.notification_category not null,
  is_active boolean not null default true,
  template_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, audience, channel)
);

grant select, insert, update, delete on public.notification_subscriptions to authenticated;
grant all on public.notification_subscriptions to service_role;

alter table public.notification_subscriptions enable row level security;

create policy "subscriptions_admin_select"
  on public.notification_subscriptions for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create policy "subscriptions_super_admin_write"
  on public.notification_subscriptions for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create index if not exists idx_notif_subs_event_active
  on public.notification_subscriptions (event_type) where is_active;

-- =========================================================================
-- 3) notification_preferences
--    Preferencias por usuario / categoría / canal. Transaccional y Seguridad
--    se ignoran a nivel de Router en Etapa 3, aquí sólo el modelo.
-- =========================================================================
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notification_category not null,
  channel public.notification_channel not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, channel)
);

grant select, insert, update, delete on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;

alter table public.notification_preferences enable row level security;

create policy "preferences_owner_select"
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());

create policy "preferences_owner_write"
  on public.notification_preferences for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_notif_prefs_user on public.notification_preferences (user_id);

-- =========================================================================
-- 4) notification_deliveries
--    Delivery Ledger. Etapa 1 sólo crea la tabla; los adapters escribirán
--    en etapas posteriores. Idempotencia por (event_id, channel, recipient_user_id).
-- =========================================================================
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_type text not null,
  category public.notification_category not null,
  channel public.notification_channel not null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  audience text not null,
  status public.notification_delivery_status not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  payload_ref jsonb not null default '{}'::jsonb,  -- referencias por ID; sin PII
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, channel, recipient_user_id)
);

grant select, insert, update, delete on public.notification_deliveries to authenticated;
grant all on public.notification_deliveries to service_role;

alter table public.notification_deliveries enable row level security;

create policy "deliveries_owner_select"
  on public.notification_deliveries for select to authenticated
  using (recipient_user_id = auth.uid());

create policy "deliveries_owner_update_read"
  on public.notification_deliveries for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

create policy "deliveries_admin_select"
  on public.notification_deliveries for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create index if not exists idx_notif_deliv_recipient_created
  on public.notification_deliveries (recipient_user_id, created_at desc);

create index if not exists idx_notif_deliv_status
  on public.notification_deliveries (status) where status in ('pending','failed','dead_letter');

create index if not exists idx_notif_deliv_event
  on public.notification_deliveries (event_id);

-- =========================================================================
-- 5) Triggers updated_at
-- =========================================================================
create or replace function public.unc_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_notif_subs_updated on public.notification_subscriptions;
create trigger trg_notif_subs_updated
  before update on public.notification_subscriptions
  for each row execute function public.unc_set_updated_at();

drop trigger if exists trg_notif_prefs_updated on public.notification_preferences;
create trigger trg_notif_prefs_updated
  before update on public.notification_preferences
  for each row execute function public.unc_set_updated_at();

drop trigger if exists trg_notif_deliv_updated on public.notification_deliveries;
create trigger trg_notif_deliv_updated
  before update on public.notification_deliveries
  for each row execute function public.unc_set_updated_at();

-- =========================================================================
-- 6) RPCs mínimas SECURITY DEFINER (lectura propia + marcar leído)
-- =========================================================================

-- 6.1) Listar entregas propias (in-app feed básico, sin canales activos)
create or replace function public.unc_list_my_deliveries(
  _limit integer default 50,
  _only_unread boolean default false
)
returns setof public.notification_deliveries
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.notification_deliveries
  where recipient_user_id = auth.uid()
    and (not _only_unread or read_at is null)
  order by created_at desc
  limit greatest(1, least(coalesce(_limit, 50), 200));
$$;

revoke all on function public.unc_list_my_deliveries(integer, boolean) from public;
grant execute on function public.unc_list_my_deliveries(integer, boolean) to authenticated;

-- 6.2) Marcar una entrega propia como leída
create or replace function public.unc_mark_delivery_read(_delivery_id uuid)
returns public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notification_deliveries;
begin
  update public.notification_deliveries
     set read_at = coalesce(read_at, now())
   where id = _delivery_id
     and recipient_user_id = auth.uid()
   returning * into v_row;

  if v_row.id is null then
    raise exception 'delivery_not_found_or_forbidden' using errcode = '42501';
  end if;

  return v_row;
end;
$$;

revoke all on function public.unc_mark_delivery_read(uuid) from public;
grant execute on function public.unc_mark_delivery_read(uuid) to authenticated;

-- 6.3) Contar no leídas (para badge)
create or replace function public.unc_count_my_unread()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.notification_deliveries
  where recipient_user_id = auth.uid()
    and read_at is null;
$$;

revoke all on function public.unc_count_my_unread() from public;
grant execute on function public.unc_count_my_unread() to authenticated;
