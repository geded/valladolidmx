-- 14.50.2 — UNC · Router + In-App Channel + Activity Center (lectura)
-- Reutiliza tablas/enums de 14.50.1, system_alerts y orders/payment_events.

-- =========================================================================
-- 1) Router · publicación in-app idempotente
-- =========================================================================
create or replace function public.unc_publish_in_app(
  _event_id text,
  _event_type text,
  _recipient_user_id uuid,
  _audience text,
  _category public.notification_category,
  _payload_ref jsonb default '{}'::jsonb
)
returns public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pref boolean;
  v_row public.notification_deliveries;
begin
  if _event_id is null or _event_type is null or _recipient_user_id is null then
    raise exception 'unc_publish_in_app: parámetros requeridos faltantes' using errcode = '22023';
  end if;

  -- Categorías transactional y security NUNCA se silencian.
  if _category in ('operational','marketing') then
    select enabled into v_pref
      from public.notification_preferences
     where user_id = _recipient_user_id
       and category = _category
       and channel = 'in_app'
     limit 1;

    if v_pref is not null and v_pref = false then
      -- Registrar como 'skipped' para trazabilidad sin entregar.
      insert into public.notification_deliveries (
        event_id, event_type, category, channel, recipient_user_id, audience,
        status, payload_ref, delivered_at
      ) values (
        _event_id, _event_type, _category, 'in_app', _recipient_user_id, _audience,
        'skipped', coalesce(_payload_ref, '{}'::jsonb), now()
      )
      on conflict (event_id, channel, recipient_user_id) do nothing
      returning * into v_row;
      return v_row;
    end if;
  end if;

  insert into public.notification_deliveries (
    event_id, event_type, category, channel, recipient_user_id, audience,
    status, attempt_count, payload_ref, delivered_at
  ) values (
    _event_id, _event_type, _category, 'in_app', _recipient_user_id, _audience,
    'sent', 1, coalesce(_payload_ref, '{}'::jsonb), now()
  )
  on conflict (event_id, channel, recipient_user_id) do update
    set updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.unc_publish_in_app(text, text, uuid, text, public.notification_category, jsonb) from public;
grant execute on function public.unc_publish_in_app(text, text, uuid, text, public.notification_category, jsonb) to authenticated;

-- =========================================================================
-- 2) Activity Center · Administrador
-- =========================================================================
create or replace function public.unc_activity_admin(_limit integer default 50)
returns table (
  kind text,
  occurred_at timestamptz,
  severity text,
  title text,
  ref jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with lim as (select greatest(1, least(coalesce(_limit, 50), 200)) as n),
  base as (
    -- Alertas críticas del sistema (Etapa 7)
    select
      'system_alert'::text as kind,
      sa.created_at as occurred_at,
      coalesce(sa.severity, 'info')::text as severity,
      coalesce(sa.title, sa.alert_type, 'system alert')::text as title,
      jsonb_build_object('alert_id', sa.id, 'type', sa.alert_type) as ref
    from public.system_alerts sa
    order by sa.created_at desc
    limit (select n from lim)
  ),
  orders_recent as (
    select
      'order_created'::text as kind,
      o.created_at as occurred_at,
      'info'::text as severity,
      ('Nueva orden ' || coalesce(o.status::text, ''))::text as title,
      jsonb_build_object('order_id', o.id, 'status', o.status, 'total', o.total_amount) as ref
    from public.orders o
    order by o.created_at desc
    limit (select n from lim)
  ),
  payments_recent as (
    select
      ('payment_' || pe.event_type)::text as kind,
      pe.created_at as occurred_at,
      case when pe.event_type ilike '%fail%' then 'warning' else 'info' end::text as severity,
      ('Pago: ' || pe.event_type)::text as title,
      jsonb_build_object('order_id', pe.order_id, 'event_type', pe.event_type) as ref
    from public.payment_events pe
    order by pe.created_at desc
    limit (select n from lim)
  )
  select * from base
  union all select * from orders_recent
  union all select * from payments_recent
  order by occurred_at desc
  limit (select n from lim);
end;
$$;

revoke all on function public.unc_activity_admin(integer) from public;
grant execute on function public.unc_activity_admin(integer) to authenticated;

-- =========================================================================
-- 3) Activity Center · Empresario (owner/staff de su empresa)
-- =========================================================================
create or replace function public.unc_activity_business(_business_id uuid, _limit integer default 50)
returns table (
  kind text,
  occurred_at timestamptz,
  severity text,
  title text,
  ref jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_member boolean;
begin
  if _business_id is null then
    raise exception 'business_id requerido' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.business_users bu
     where bu.business_id = _business_id
       and bu.user_id = auth.uid()
  ) into v_member;

  if not coalesce(v_member, false)
     and not public.has_role(auth.uid(), 'admin')
     and not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with lim as (select greatest(1, least(coalesce(_limit, 50), 200)) as n),
  business_orders as (
    select distinct o.id, o.created_at, o.status, o.total_amount
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.products p on p.id = oi.product_id
    where p.business_id = _business_id
    order by o.created_at desc
    limit (select n from lim)
  ),
  orders_feed as (
    select
      'order_created'::text as kind,
      bo.created_at as occurred_at,
      'info'::text as severity,
      ('Nueva orden ' || coalesce(bo.status::text, ''))::text as title,
      jsonb_build_object('order_id', bo.id, 'status', bo.status, 'total', bo.total_amount) as ref
    from business_orders bo
  ),
  payments_feed as (
    select
      ('payment_' || pe.event_type)::text as kind,
      pe.created_at as occurred_at,
      case when pe.event_type ilike '%fail%' then 'warning' else 'info' end::text as severity,
      ('Pago: ' || pe.event_type)::text as title,
      jsonb_build_object('order_id', pe.order_id, 'event_type', pe.event_type) as ref
    from public.payment_events pe
    where pe.order_id in (select id from business_orders)
  )
  select * from orders_feed
  union all select * from payments_feed
  order by occurred_at desc
  limit (select n from lim);
end;
$$;

revoke all on function public.unc_activity_business(uuid, integer) from public;
grant execute on function public.unc_activity_business(uuid, integer) to authenticated;

-- =========================================================================
-- 4) Activity Center · Viajero (self)
-- =========================================================================
create or replace function public.unc_activity_traveler(_limit integer default 50)
returns table (
  kind text,
  occurred_at timestamptz,
  severity text,
  title text,
  ref jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  return query
  with lim as (select greatest(1, least(coalesce(_limit, 50), 200)) as n),
  my_orders as (
    select id, created_at, status, total_amount
      from public.orders
     where user_id = v_uid
     order by created_at desc
     limit (select n from lim)
  ),
  orders_feed as (
    select
      'order'::text as kind,
      o.created_at as occurred_at,
      'info'::text as severity,
      ('Orden ' || coalesce(o.status::text, ''))::text as title,
      jsonb_build_object('order_id', o.id, 'status', o.status, 'total', o.total_amount) as ref
    from my_orders o
  ),
  payments_feed as (
    select
      ('payment_' || pe.event_type)::text as kind,
      pe.created_at as occurred_at,
      case when pe.event_type ilike '%fail%' then 'warning' else 'info' end::text as severity,
      ('Pago: ' || pe.event_type)::text as title,
      jsonb_build_object('order_id', pe.order_id, 'event_type', pe.event_type) as ref
    from public.payment_events pe
    where pe.order_id in (select id from my_orders)
  ),
  inapp_feed as (
    select
      ('inapp_' || nd.event_type)::text as kind,
      nd.created_at as occurred_at,
      case when nd.category::text = 'security' then 'warning' else 'info' end::text as severity,
      coalesce(nd.event_type, 'Notificación')::text as title,
      jsonb_build_object('delivery_id', nd.id, 'read_at', nd.read_at, 'event_id', nd.event_id) as ref
    from public.notification_deliveries nd
    where nd.recipient_user_id = v_uid
      and nd.channel = 'in_app'
    order by nd.created_at desc
    limit (select n from lim)
  )
  select * from orders_feed
  union all select * from payments_feed
  union all select * from inapp_feed
  order by occurred_at desc
  limit (select n from lim);
end;
$$;

revoke all on function public.unc_activity_traveler(integer) from public;
grant execute on function public.unc_activity_traveler(integer) to authenticated;

-- =========================================================================
-- 5) Catálogo inicial de notification_subscriptions (idempotente, in-app)
-- =========================================================================
insert into public.notification_subscriptions (event_type, audience, channel, category, is_active)
values
  ('Business.Order.Created',          'traveler',    'in_app', 'transactional', true),
  ('Business.Order.Created',          'owner',       'in_app', 'operational',   true),
  ('Business.Order.Confirmed',        'traveler',    'in_app', 'transactional', true),
  ('Business.Order.Confirmed',        'owner',       'in_app', 'operational',   true),
  ('Business.Payment.Succeeded',      'traveler',    'in_app', 'transactional', true),
  ('Business.Payment.Succeeded',      'owner',       'in_app', 'operational',   true),
  ('Business.Payment.Failed',         'traveler',    'in_app', 'transactional', true),
  ('Business.Payment.Failed',         'admin',       'in_app', 'operational',   true),
  ('Business.Webhook.SignatureInvalid','super_admin','in_app', 'security',      true)
on conflict (event_type, audience, channel) do nothing;
