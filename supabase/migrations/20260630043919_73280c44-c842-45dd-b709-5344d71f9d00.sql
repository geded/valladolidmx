-- 14.50.6 — UNC · Intelligent Activity Center (vistas por rol + feed Alux)
-- Lectura pura. Sin nuevas tablas, sin nuevos eventos BEA.

-- =========================================================================
-- 1) Feed estructurado para Alux Intelligence
-- =========================================================================
create or replace function public.unc_activity_feed_for_alux(
  _scope text default 'traveler',
  _business_id uuid default null,
  _since timestamptz default (now() - interval '7 days'),
  _limit integer default 100
)
returns table (
  event_id text,
  event_type text,
  category text,
  severity text,
  subject_type text,
  subject_id text,
  occurred_at timestamptz,
  summary text,
  payload jsonb,
  read_state text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim integer := greatest(1, least(coalesce(_limit, 100), 500));
  v_since timestamptz := coalesce(_since, now() - interval '7 days');
  v_scope text := lower(coalesce(_scope, 'traveler'));
  v_is_admin boolean;
  v_is_member boolean;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  v_is_admin := public.has_role(v_uid, 'admin') or public.has_role(v_uid, 'super_admin');

  if v_scope = 'admin' then
    if not v_is_admin then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif v_scope = 'business' then
    if _business_id is null then
      raise exception 'business_id requerido para scope business' using errcode = '22023';
    end if;
    select exists (
      select 1 from public.business_users bu
       where bu.business_id = _business_id and bu.user_id = v_uid
    ) into v_is_member;
    if not coalesce(v_is_member, false) and not v_is_admin then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif v_scope = 'traveler' then
    -- self-only, sin chequeo adicional
    null;
  else
    raise exception 'scope inválido: %', v_scope using errcode = '22023';
  end if;

  return query
  with deliveries as (
    select
      nd.event_id,
      nd.event_type,
      nd.category::text as category,
      case
        when nd.category::text = 'security' then 'critical'
        when nd.status::text = 'dead_letter' then 'critical'
        when nd.status::text = 'failed' then 'warning'
        when nd.category::text = 'transactional' then 'info'
        else 'info'
      end as severity,
      'notification'::text as subject_type,
      nd.event_id::text as subject_id,
      nd.created_at as occurred_at,
      coalesce(nd.event_type, 'Notificación') as summary,
      jsonb_build_object(
        'channel', nd.channel,
        'status', nd.status,
        'audience', nd.audience,
        'recipient_user_id', nd.recipient_user_id,
        'payload_ref', nd.payload_ref
      ) as payload,
      case when nd.read_at is not null then 'read' else 'unread' end as read_state,
      nd.recipient_user_id
    from public.notification_deliveries nd
    where nd.created_at >= v_since
      and (
        (v_scope = 'admin')
        or (v_scope = 'traveler' and nd.recipient_user_id = v_uid)
        or (v_scope = 'business' and nd.recipient_user_id in (
              select bu.user_id from public.business_users bu
               where bu.business_id = _business_id
            ))
      )
  ),
  orders_feed as (
    select
      ('order:' || o.id::text) as event_id,
      'Business.Order'::text as event_type,
      'transactional'::text as category,
      'info'::text as severity,
      'order'::text as subject_type,
      o.id::text as subject_id,
      o.created_at as occurred_at,
      ('Orden ' || coalesce(o.status::text, ''))::text as summary,
      jsonb_build_object(
        'order_id', o.id,
        'status', o.status,
        'total', o.total_amount,
        'user_id', o.user_id
      ) as payload,
      'n/a'::text as read_state,
      o.user_id as recipient_user_id
    from public.orders o
    where o.created_at >= v_since
      and (
        v_scope = 'admin'
        or (v_scope = 'traveler' and o.user_id = v_uid)
        or (v_scope = 'business' and o.id in (
              select distinct oi.order_id
                from public.order_items oi
                join public.products p on p.id = oi.product_id
               where p.business_id = _business_id
            ))
      )
  ),
  payments_feed as (
    select
      ('payment:' || pe.id::text) as event_id,
      ('Business.Payment.' || pe.event_type)::text as event_type,
      'transactional'::text as category,
      case when pe.event_type ilike '%fail%' then 'warning' else 'info' end as severity,
      'payment'::text as subject_type,
      pe.order_id::text as subject_id,
      pe.created_at as occurred_at,
      ('Pago: ' || pe.event_type)::text as summary,
      jsonb_build_object('order_id', pe.order_id, 'event_type', pe.event_type) as payload,
      'n/a'::text as read_state,
      null::uuid as recipient_user_id
    from public.payment_events pe
    where pe.created_at >= v_since
      and (
        v_scope = 'admin'
        or (v_scope = 'traveler' and pe.order_id in (select id from public.orders where user_id = v_uid))
        or (v_scope = 'business' and pe.order_id in (
              select distinct oi.order_id
                from public.order_items oi
                join public.products p on p.id = oi.product_id
               where p.business_id = _business_id
            ))
      )
  ),
  alerts_feed as (
    select
      ('alert:' || sa.id::text) as event_id,
      coalesce(sa.alert_type, 'system.alert')::text as event_type,
      'security'::text as category,
      coalesce(sa.severity, 'info')::text as severity,
      'system_alert'::text as subject_type,
      sa.id::text as subject_id,
      sa.created_at as occurred_at,
      coalesce(sa.title, sa.alert_type, 'system alert')::text as summary,
      jsonb_build_object('alert_id', sa.id, 'type', sa.alert_type, 'severity', sa.severity) as payload,
      'n/a'::text as read_state,
      null::uuid as recipient_user_id
    from public.system_alerts sa
    where sa.created_at >= v_since
      and v_scope = 'admin'
  ),
  unified as (
    select event_id, event_type, category, severity, subject_type, subject_id,
           occurred_at, summary, payload, read_state
      from deliveries
    union all
    select event_id, event_type, category, severity, subject_type, subject_id,
           occurred_at, summary, payload, read_state
      from orders_feed
    union all
    select event_id, event_type, category, severity, subject_type, subject_id,
           occurred_at, summary, payload, read_state
      from payments_feed
    union all
    select event_id, event_type, category, severity, subject_type, subject_id,
           occurred_at, summary, payload, read_state
      from alerts_feed
  )
  select *
    from unified
   order by
     case severity when 'critical' then 0 when 'warning' then 1 else 2 end,
     occurred_at desc
   limit v_lim;
end;
$$;

revoke all on function public.unc_activity_feed_for_alux(text, uuid, timestamptz, integer) from public;
grant execute on function public.unc_activity_feed_for_alux(text, uuid, timestamptz, integer) to authenticated;

-- =========================================================================
-- 2) Resúmenes por periodo (day / week)
-- =========================================================================
create or replace function public.unc_activity_summary_by_period(
  _scope text default 'traveler',
  _business_id uuid default null,
  _since timestamptz default (now() - interval '30 days'),
  _bucket text default 'day'
)
returns table (
  bucket_start timestamptz,
  category text,
  severity text,
  event_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_trunc text := case lower(coalesce(_bucket, 'day')) when 'week' then 'week' else 'day' end;
begin
  -- La función feed valida autorización y scope; reutilizamos.
  return query
  select
    date_trunc(v_trunc, f.occurred_at) as bucket_start,
    f.category,
    f.severity,
    count(*)::bigint as event_count
  from public.unc_activity_feed_for_alux(_scope, _business_id, _since, 500) f
  group by 1, 2, 3
  order by 1 desc, 2, 3;
end;
$$;

revoke all on function public.unc_activity_summary_by_period(text, uuid, timestamptz, text) from public;
grant execute on function public.unc_activity_summary_by_period(text, uuid, timestamptz, text) to authenticated;

-- =========================================================================
-- 3) Agrupación por entidad
-- =========================================================================
create or replace function public.unc_activity_group_by_subject(
  _scope text default 'traveler',
  _business_id uuid default null,
  _since timestamptz default (now() - interval '7 days'),
  _limit integer default 50
)
returns table (
  subject_type text,
  subject_id text,
  event_count bigint,
  last_occurred_at timestamptz,
  last_severity text,
  last_summary text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lim integer := greatest(1, least(coalesce(_limit, 50), 200));
begin
  return query
  with f as (
    select * from public.unc_activity_feed_for_alux(_scope, _business_id, _since, 500)
  ),
  agg as (
    select
      subject_type,
      subject_id,
      count(*)::bigint as event_count,
      max(occurred_at) as last_occurred_at
    from f
    group by subject_type, subject_id
  )
  select
    a.subject_type,
    a.subject_id,
    a.event_count,
    a.last_occurred_at,
    (select severity from f where f.subject_type = a.subject_type and f.subject_id = a.subject_id and f.occurred_at = a.last_occurred_at limit 1) as last_severity,
    (select summary from f where f.subject_type = a.subject_type and f.subject_id = a.subject_id and f.occurred_at = a.last_occurred_at limit 1) as last_summary
  from agg a
  order by a.last_occurred_at desc
  limit v_lim;
end;
$$;

revoke all on function public.unc_activity_group_by_subject(text, uuid, timestamptz, integer) from public;
grant execute on function public.unc_activity_group_by_subject(text, uuid, timestamptz, integer) to authenticated;