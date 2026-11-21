-- CRM Prospectos · Fase 2 (propuesta 19.48): WhatsApp por QR (Evolution API).

-- 1) Líneas de WhatsApp
CREATE TABLE public.crm_whatsapp_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  instance_name text NOT NULL UNIQUE CHECK (instance_name ~ '^vmx-[a-z0-9-]{3,40}$'),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','connecting','connected','disconnected')),
  phone_e164 text NULL CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  profile_name text NULL CHECK (profile_name IS NULL OR char_length(profile_name) <= 120),
  qr_code text NULL CHECK (qr_code IS NULL OR char_length(qr_code) <= 60000),
  qr_updated_at timestamptz NULL,
  last_state_at timestamptz NULL,
  alux_enabled boolean NOT NULL DEFAULT true,
  webhook_base_url text NULL CHECK (webhook_base_url IS NULL OR webhook_base_url ~ '^https://'),
  created_by uuid NULL,
  owner_business_id uuid NULL
);

GRANT SELECT (id, created_at, updated_at, instance_name, label, status, phone_e164, profile_name,
              qr_updated_at, last_state_at, alux_enabled, webhook_base_url, created_by, owner_business_id)
  ON public.crm_whatsapp_lines TO authenticated;
GRANT ALL ON public.crm_whatsapp_lines TO service_role;
ALTER TABLE public.crm_whatsapp_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_staff_read_whatsapp_lines ON public.crm_whatsapp_lines
  FOR SELECT TO authenticated USING (public.crm_is_prospect_staff(auth.uid()));

-- 2) Bandeja durable de avisos
CREATE TABLE public.crm_whatsapp_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL REFERENCES public.crm_whatsapp_lines(id) ON DELETE CASCADE,
  delivery_key text NOT NULL UNIQUE CHECK (char_length(delivery_key) BETWEEN 3 AND 300),
  event text NOT NULL CHECK (char_length(event) BETWEEN 1 AND 80),
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  processing_error text NULL CHECK (processing_error IS NULL OR char_length(processing_error) <= 1000),
  attempts integer NOT NULL DEFAULT 0,
  lease_until timestamptz NULL,
  next_attempt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_whatsapp_inbox_pending_idx ON public.crm_whatsapp_inbox (next_attempt_at)
  WHERE processed_at IS NULL;

GRANT ALL ON public.crm_whatsapp_inbox TO service_role;
ALTER TABLE public.crm_whatsapp_inbox ENABLE ROW LEVEL SECURITY;

-- 3) Pláticas: canal, línea y quién atiende
ALTER TABLE public.alux_public_sessions
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS whatsapp_line_id uuid NULL REFERENCES public.crm_whatsapp_lines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wa_remote_jid text NULL,
  ADD COLUMN IF NOT EXISTS alux_mode text NOT NULL DEFAULT 'alux',
  ADD COLUMN IF NOT EXISTS handoff_requested_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS handoff_reason text NULL,
  ADD COLUMN IF NOT EXISTS human_reply_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reply_lock_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS conversation_language text NULL;
ALTER TABLE public.alux_public_sessions
  ADD CONSTRAINT alux_public_sessions_channel_check CHECK (channel IN ('web','whatsapp')),
  ADD CONSTRAINT alux_public_sessions_alux_mode_check CHECK (alux_mode IN ('alux','human')),
  ADD CONSTRAINT alux_public_sessions_handoff_reason_check CHECK (handoff_reason IS NULL OR char_length(handoff_reason) <= 60),
  ADD CONSTRAINT alux_public_sessions_language_check CHECK (conversation_language IS NULL OR conversation_language IN ('es','en','fr','de','it','pt'));
CREATE UNIQUE INDEX IF NOT EXISTS alux_public_sessions_wa_chat_uidx
  ON public.alux_public_sessions (whatsapp_line_id, wa_remote_jid)
  WHERE channel = 'whatsapp';

-- 4) Mensajes: autor, id de WhatsApp y texto original
ALTER TABLE public.alux_public_messages
  ADD COLUMN IF NOT EXISTS author text NULL,
  ADD COLUMN IF NOT EXISTS external_id text NULL,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS send_status text NULL,
  ADD COLUMN IF NOT EXISTS original_text text NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid NULL;
ALTER TABLE public.alux_public_messages
  ADD CONSTRAINT alux_public_messages_author_check CHECK (author IS NULL OR author IN ('alux','concierge','system')),
  ADD CONSTRAINT alux_public_messages_channel_check CHECK (channel IN ('web','whatsapp')),
  ADD CONSTRAINT alux_public_messages_send_status_check CHECK (send_status IS NULL OR send_status IN ('accepted','failed')),
  ADD CONSTRAINT alux_public_messages_original_text_check CHECK (original_text IS NULL OR char_length(original_text) <= 4000);
CREATE UNIQUE INDEX IF NOT EXISTS alux_public_messages_external_uidx
  ON public.alux_public_messages (session_id, external_id)
  WHERE external_id IS NOT NULL;

-- 5) Aviso al equipo (en la app y en el celular). Nunca incluye el teléfono.
CREATE OR REPLACE FUNCTION public.crm_whatsapp_notify_staff(
  _event_id text, _event_type text, _url text, _alt text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_payload jsonb := jsonb_build_object('url', _url, 'alt_text', left(_alt, 200));
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.user_roles
           WHERE role IN ('concierge','concierge_lead','admin','super_admin') LOOP
    PERFORM public.unc_publish_in_app(
      _event_id, _event_type, r.user_id, 'concierge', 'operational'::notification_category, v_payload
    );
    INSERT INTO public.notification_deliveries (
      event_id, event_type, category, channel, recipient_user_id, audience, status, payload_ref
    ) VALUES (
      _event_id, _event_type, 'operational', 'push', r.user_id, 'concierge', 'pending', v_payload
    ) ON CONFLICT (event_id, channel, recipient_user_id) DO NOTHING;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_whatsapp_notify_staff(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_notify_staff(text, text, text, text) TO service_role;

-- 6) Prospecto desde WhatsApp (la persona inició la plática)
CREATE OR REPLACE FUNCTION public.crm_whatsapp_touch_prospect(
  _phone_e164 text, _first_name text, _language text
)
RETURNS TABLE (prospect_id uuid, is_new boolean, reopened boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.concierge_prospects%ROWTYPE;
  v_id uuid;
  v_new boolean := false;
  v_reopened boolean := false;
  v_name text := left(btrim(coalesce(_first_name, '')), 80);
  v_lang text := CASE WHEN _language IN ('es','en','fr','de','it','pt') THEN _language ELSE 'es' END;
BEGIN
  IF _phone_e164 IS NULL OR _phone_e164 !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'invalid_phone' USING errcode = '22023';
  END IF;
  IF v_name = '' THEN v_name := 'Contacto de WhatsApp'; END IF;

  SELECT * INTO v_existing FROM public.concierge_prospects WHERE phone_e164 = _phone_e164 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.concierge_prospects (
      source, first_name, phone_e164, language, consent_contact, consent_at, consent_text, temperature
    ) VALUES (
      'whatsapp', v_name, _phone_e164, v_lang, true, now(),
      'La persona inició la plática por WhatsApp con Valladolid.mx.', 'tibio'
    ) RETURNING id INTO v_id;
    v_new := true;
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, meta)
    VALUES (v_id, 'created', jsonb_build_object('source', 'whatsapp'));
  ELSE
    v_id := v_existing.id;
    v_reopened := v_existing.stage IN ('perdido', 'no_interesado');
    UPDATE public.concierge_prospects SET
      last_activity_at = now(),
      stage = CASE WHEN v_reopened THEN 'nuevo' ELSE stage END,
      reviewed_at = CASE WHEN v_reopened THEN NULL ELSE reviewed_at END,
      lost_reason = CASE WHEN v_reopened THEN NULL ELSE lost_reason END
    WHERE id = v_id;
    IF v_reopened THEN
      INSERT INTO public.concierge_prospect_events (prospect_id, kind, meta)
      VALUES (v_id, 'returned', jsonb_build_object('source', 'whatsapp'));
    END IF;
  END IF;

  IF v_new OR v_reopened THEN
    PERFORM public.crm_whatsapp_notify_staff(
      CASE WHEN v_new THEN 'crm-wa-prospect-created:' || v_id::text
           ELSE 'crm-wa-prospect-returned:' || v_id::text || ':' || to_char(now(), 'YYYYMMDDHH24') END,
      CASE WHEN v_new THEN 'CRM.Prospect.Created' ELSE 'CRM.Prospect.Returned' END,
      '/concierge/prospectos/' || v_id::text,
      CASE WHEN v_new THEN 'Nueva plática por WhatsApp' ELSE 'Regresó por WhatsApp' END
        || CASE WHEN v_name <> 'Contacto de WhatsApp' THEN ' · ' || v_name ELSE '' END
    );
  END IF;

  RETURN QUERY SELECT v_id, v_new, v_reopened;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_whatsapp_touch_prospect(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_touch_prospect(text, text, text) TO service_role;

-- 7) Tomar avisos pendientes sin repetirlos (un procesador a la vez por aviso)
CREATE OR REPLACE FUNCTION public.crm_whatsapp_claim_inbox(
  _id uuid, _limit integer, _lease_seconds integer
)
RETURNS SETOF public.crm_whatsapp_inbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.crm_whatsapp_inbox i
     SET lease_until = now() + make_interval(secs => GREATEST(10, LEAST(coalesce(_lease_seconds, 60), 300))),
         attempts = i.attempts + 1
   WHERE i.id IN (
     SELECT c.id FROM public.crm_whatsapp_inbox c
      WHERE c.processed_at IS NULL
        AND (c.lease_until IS NULL OR c.lease_until < now())
        AND (_id IS NOT NULL AND c.id = _id
             OR _id IS NULL AND c.next_attempt_at <= now() AND c.attempts < 8)
      ORDER BY c.attempts ASC, c.received_at ASC
      LIMIT GREATEST(1, LEAST(coalesce(_limit, 10), 50))
      FOR UPDATE SKIP LOCKED
   )
  RETURNING i.*;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_whatsapp_claim_inbox(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_claim_inbox(uuid, integer, integer) TO service_role;

-- 8) Candado: una sola respuesta de Alux a la vez por plática
CREATE OR REPLACE FUNCTION public.crm_whatsapp_acquire_reply_lock(_session_id uuid, _seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok uuid;
BEGIN
  UPDATE public.alux_public_sessions
     SET reply_lock_until = now() + make_interval(secs => GREATEST(5, LEAST(coalesce(_seconds, 45), 120)))
   WHERE id = _session_id
     AND (reply_lock_until IS NULL OR reply_lock_until < now())
  RETURNING id INTO v_ok;
  RETURN v_ok IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_whatsapp_acquire_reply_lock(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_whatsapp_acquire_reply_lock(uuid, integer) TO service_role;

-- 9) Respaldo de una vez por hora: reintenta avisos pendientes.
--    Lo normal es procesar al llegar cada aviso y en el siguiente aviso.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crm-whatsapp-hourly-backstop') THEN
    PERFORM cron.unschedule('crm-whatsapp-hourly-backstop');
  END IF;
  PERFORM cron.schedule(
    'crm-whatsapp-hourly-backstop',
    '25 * * * *',
    $cron$SELECT public.cron_hooks_invoke_long('/api/public/hooks/crm-whatsapp', 55000);$cron$
  );
END;
$$;