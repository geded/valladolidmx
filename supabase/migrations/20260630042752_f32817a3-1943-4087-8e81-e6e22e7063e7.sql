
-- =========================================================================
-- 14.50.5 — UNC · Push + Webhook saliente + Dead-Letter observable
-- =========================================================================

-- 1) Push subscriptions ---------------------------------------------------
create table if not exists public.notification_push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (user_id, endpoint)
);

grant select, insert, update, delete on public.notification_push_subscriptions to authenticated;
grant all on public.notification_push_subscriptions to service_role;

alter table public.notification_push_subscriptions enable row level security;

create policy "push_subs_owner_select"
  on public.notification_push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy "push_subs_owner_modify"
  on public.notification_push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists notification_push_subscriptions_user_idx
  on public.notification_push_subscriptions(user_id)
  where revoked_at is null;

-- 2) Webhook endpoints ----------------------------------------------------
create table if not exists public.notification_webhook_endpoints (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references auth.users(id) on delete cascade,
  business_id     uuid references public.businesses(id) on delete cascade,
  label           text,
  url             text not null,
  secret_current  text not null,
  secret_previous text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

grant select, insert, update, delete on public.notification_webhook_endpoints to authenticated;
grant all on public.notification_webhook_endpoints to service_role;

alter table public.notification_webhook_endpoints enable row level security;

create policy "webhook_endpoints_owner_select"
  on public.notification_webhook_endpoints for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy "webhook_endpoints_owner_modify"
  on public.notification_webhook_endpoints for all
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create or replace function public.unc_touch_webhook_endpoints()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_unc_touch_webhook_endpoints on public.notification_webhook_endpoints;
create trigger trg_unc_touch_webhook_endpoints
  before update on public.notification_webhook_endpoints
  for each row execute function public.unc_touch_webhook_endpoints();

-- 3) RPC: publicación push idempotente ------------------------------------
create or replace function public.unc_publish_push(
  _event_id text,
  _event_type text,
  _recipient_user_id uuid,
  _audience text,
  _category public.notification_category,
  _template_key text,
  _payload_ref jsonb default '{}'::jsonb
)
returns public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pref public.notification_preferences%rowtype;
  v_row  public.notification_deliveries;
begin
  if _event_id is null or _event_type is null or _recipient_user_id is null or _template_key is null then
    raise exception 'unc_publish_push: parámetros requeridos faltantes' using errcode = '22023';
  end if;

  if _category in ('operational','marketing') then
    select * into v_pref
      from public.notification_preferences
     where user_id = _recipient_user_id and category = _category and channel = 'push'
     limit 1;

    if v_pref.user_id is null or v_pref.enabled = false or v_pref.consent_at is null then
      insert into public.notification_deliveries (
        event_id, event_type, category, channel, recipient_user_id, audience,
        status, payload_ref, delivered_at
      ) values (
        _event_id, _event_type, _category, 'push', _recipient_user_id, _audience,
        'skipped',
        coalesce(_payload_ref, '{}'::jsonb) || jsonb_build_object('template_key', _template_key),
        now()
      )
      on conflict (event_id, channel, recipient_user_id) do nothing
      returning * into v_row;
      return v_row;
    end if;
  end if;

  insert into public.notification_deliveries (
    event_id, event_type, category, channel, recipient_user_id, audience,
    status, attempt_count, payload_ref
  ) values (
    _event_id, _event_type, _category, 'push', _recipient_user_id, _audience,
    'pending', 0,
    coalesce(_payload_ref, '{}'::jsonb) || jsonb_build_object('template_key', _template_key)
  )
  on conflict (event_id, channel, recipient_user_id) do update set updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.unc_publish_push(text, text, uuid, text, public.notification_category, text, jsonb) from public;
grant execute on function public.unc_publish_push(text, text, uuid, text, public.notification_category, text, jsonb) to authenticated;

-- 4) RPC: publicación webhook idempotente ---------------------------------
create or replace function public.unc_publish_webhook(
  _event_id text,
  _event_type text,
  _endpoint_id uuid,
  _audience text,
  _category public.notification_category,
  _template_key text,
  _payload_ref jsonb default '{}'::jsonb
)
returns public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_endpoint public.notification_webhook_endpoints%rowtype;
  v_row public.notification_deliveries;
begin
  if _event_id is null or _event_type is null or _endpoint_id is null or _template_key is null then
    raise exception 'unc_publish_webhook: parámetros requeridos faltantes' using errcode = '22023';
  end if;

  -- Webhook saliente NUNCA acepta Marketing por contrato.
  if _category = 'marketing' then
    raise exception 'unc_publish_webhook: marketing no permitido en canal webhook' using errcode = '22023';
  end if;

  select * into v_endpoint from public.notification_webhook_endpoints where id = _endpoint_id;
  if v_endpoint.id is null or v_endpoint.is_active = false then
    raise exception 'unc_publish_webhook: endpoint inexistente o inactivo' using errcode = '22023';
  end if;

  insert into public.notification_deliveries (
    event_id, event_type, category, channel, recipient_user_id, audience,
    status, attempt_count, payload_ref
  ) values (
    _event_id, _event_type, _category, 'webhook', v_endpoint.owner_user_id, _audience,
    'pending', 0,
    coalesce(_payload_ref, '{}'::jsonb)
      || jsonb_build_object('template_key', _template_key, 'endpoint_id', _endpoint_id, 'url', v_endpoint.url)
  )
  on conflict (event_id, channel, recipient_user_id) do update set updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.unc_publish_webhook(text, text, uuid, text, public.notification_category, text, jsonb) from public;
grant execute on function public.unc_publish_webhook(text, text, uuid, text, public.notification_category, text, jsonb) to authenticated;

-- 5) Dead-Letter observable -----------------------------------------------
create or replace function public.unc_dead_letter_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_severity public.system_alert_severity;
begin
  if new.status = 'dead_letter' and (old.status is distinct from 'dead_letter') then
    v_severity := case
      when new.category in ('security','transactional') then 'error'::public.system_alert_severity
      else 'warning'::public.system_alert_severity
    end;

    insert into public.system_alerts (kind, severity, status, message, payload, first_seen_at, last_seen_at, occurrences)
    values (
      'unc.dead_letter',
      v_severity,
      'open',
      format('Entrega UNC en dead-letter: %s/%s', new.channel::text, new.event_type),
      jsonb_build_object(
        'delivery_id', new.id,
        'event_id', new.event_id,
        'event_type', new.event_type,
        'channel', new.channel,
        'category', new.category,
        'audience', new.audience,
        'recipient_user_id', new.recipient_user_id,
        'last_error', new.last_error,
        'attempt_count', new.attempt_count
      ),
      now(), now(), 1
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_unc_dead_letter_alert on public.notification_deliveries;
create trigger trg_unc_dead_letter_alert
  after update of status on public.notification_deliveries
  for each row execute function public.unc_dead_letter_alert();

-- 6) Suscripciones iniciales (idempotentes) -------------------------------
insert into public.notification_subscriptions (event_type, audience, channel, category, template_key, sender_identity, is_active)
values
  -- Push
  ('Business.Order.Confirmed',   'traveler', 'push',    'transactional', 'order_confirmed',   null, true),
  ('Business.Payment.Succeeded', 'traveler', 'push',    'transactional', 'payment_succeeded', null, true),
  ('Business.Payment.Succeeded', 'owner',    'push',    'transactional', 'payment_succeeded', null, true),
  -- Webhook
  ('Business.Order.Created',     'owner',    'webhook', 'transactional', 'order.created',     null, true),
  ('Business.Order.Confirmed',   'owner',    'webhook', 'transactional', 'order.confirmed',   null, true),
  ('Business.Payment.Succeeded', 'owner',    'webhook', 'transactional', 'payment.succeeded', null, true),
  ('Business.Payment.Failed',    'owner',    'webhook', 'transactional', 'payment.failed',    null, true)
on conflict do nothing;
