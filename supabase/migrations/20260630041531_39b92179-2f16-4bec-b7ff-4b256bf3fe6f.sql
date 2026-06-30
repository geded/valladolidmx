
-- 14.50.4 — UNC · Email Channel Adapter + multi-sender identity

-- 1) Soporte de múltiples identidades de remitente
alter table public.notification_subscriptions
  add column if not exists sender_identity text;

comment on column public.notification_subscriptions.sender_identity is
  '14.50.4 — Identidad de remitente para canal email (e.g. reservas, notificaciones, marketing, alux). NULL = default del proyecto.';

-- 2) RPC: publicación email idempotente con consentimiento
create or replace function public.unc_publish_email(
  _event_id text,
  _event_type text,
  _recipient_user_id uuid,
  _audience text,
  _category public.notification_category,
  _template_key text,
  _sender_identity text default null,
  _payload_ref jsonb default '{}'::jsonb
)
returns public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pref public.notification_preferences%rowtype;
  v_row public.notification_deliveries;
begin
  if _event_id is null or _event_type is null or _recipient_user_id is null or _template_key is null then
    raise exception 'unc_publish_email: parámetros requeridos faltantes' using errcode = '22023';
  end if;

  -- Operational / Marketing: requieren preferencia habilitada Y consent_at no nulo.
  if _category in ('operational','marketing') then
    select * into v_pref
      from public.notification_preferences
     where user_id = _recipient_user_id
       and category = _category
       and channel = 'email'
     limit 1;

    if v_pref.user_id is null or v_pref.enabled = false or v_pref.consent_at is null then
      insert into public.notification_deliveries (
        event_id, event_type, category, channel, recipient_user_id, audience,
        status, payload_ref, delivered_at
      ) values (
        _event_id, _event_type, _category, 'email', _recipient_user_id, _audience,
        'skipped',
        coalesce(_payload_ref, '{}'::jsonb)
          || jsonb_build_object('template_key', _template_key, 'sender_identity', _sender_identity),
        now()
      )
      on conflict (event_id, channel, recipient_user_id) do nothing
      returning * into v_row;
      return v_row;
    end if;
  end if;

  -- Transactional / Security siempre se entregan; Op/Mkt con consentimiento llegan aquí.
  insert into public.notification_deliveries (
    event_id, event_type, category, channel, recipient_user_id, audience,
    status, attempt_count, payload_ref
  ) values (
    _event_id, _event_type, _category, 'email', _recipient_user_id, _audience,
    'pending', 0,
    coalesce(_payload_ref, '{}'::jsonb)
      || jsonb_build_object('template_key', _template_key, 'sender_identity', _sender_identity)
  )
  on conflict (event_id, channel, recipient_user_id) do update
    set updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.unc_publish_email(text, text, uuid, text, public.notification_category, text, text, jsonb) from public;
grant execute on function public.unc_publish_email(text, text, uuid, text, public.notification_category, text, text, jsonb) to authenticated;

-- 3) Suscripciones email iniciales (idempotentes)
insert into public.notification_subscriptions (event_type, audience, channel, category, template_key, sender_identity, is_active)
values
  ('Business.Order.Created',           'traveler',    'email', 'transactional', 'order_confirmed',   'reservas',       true),
  ('Business.Order.Confirmed',         'traveler',    'email', 'transactional', 'order_confirmed',   'reservas',       true),
  ('Business.Order.Confirmed',         'owner',       'email', 'transactional', 'order_confirmed',   'reservas',       true),
  ('Business.Payment.Succeeded',       'traveler',    'email', 'transactional', 'payment_succeeded', 'reservas',       true),
  ('Business.Payment.Succeeded',       'owner',       'email', 'transactional', 'payment_succeeded', 'reservas',       true),
  ('Business.Payment.Failed',          'traveler',    'email', 'transactional', 'payment_failed',    'reservas',       true),
  ('Business.Payment.Failed',          'admin',       'email', 'transactional', 'payment_failed',    'notificaciones', true),
  ('Business.Webhook.SignatureInvalid','super_admin', 'email', 'security',      'security_alert',    'notificaciones', true)
on conflict do nothing;
