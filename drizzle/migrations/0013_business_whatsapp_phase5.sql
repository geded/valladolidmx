-- Fase 5 · WhatsApp de cada empresa con Alux (propuesta 19.48).

-- 1) Línea propia de la empresa y cómo se presenta Alux en ella
ALTER TABLE public.crm_whatsapp_lines
  ADD COLUMN IF NOT EXISTS alux_greeting text NULL
    CHECK (alux_greeting IS NULL OR char_length(alux_greeting) <= 400),
  ADD COLUMN IF NOT EXISTS alux_tone text NOT NULL DEFAULT 'cercano'
    CHECK (alux_tone IN ('cercano','formal')),
  ADD COLUMN IF NOT EXISTS alux_highlights text NULL
    CHECK (alux_highlights IS NULL OR char_length(alux_highlights) <= 600);
CREATE UNIQUE INDEX IF NOT EXISTS crm_whatsapp_lines_owner_business_uidx
  ON public.crm_whatsapp_lines (owner_business_id) WHERE owner_business_id IS NOT NULL;
GRANT SELECT (alux_greeting, alux_tone, alux_highlights) ON public.crm_whatsapp_lines TO authenticated;
CREATE POLICY business_read_own_whatsapp_line ON public.crm_whatsapp_lines
  FOR SELECT TO authenticated
  USING (owner_business_id IS NOT NULL
         AND public.has_business_access(auth.uid(), owner_business_id, 'viewer'));

-- 2) Contactos de WhatsApp de cada empresa (no se mezclan con CRM Prospectos)
CREATE TABLE public.business_whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  phone_e164 text NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  first_name text NOT NULL DEFAULT 'Contacto de WhatsApp'
    CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 80),
  language text NOT NULL DEFAULT 'es' CHECK (language IN ('es','en','fr','de','it','pt')),
  stage text NOT NULL DEFAULT 'nuevo'
    CHECK (stage IN ('nuevo','en_platica','atendido','cliente','perdido')),
  notes text NULL CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, phone_e164)
);
CREATE INDEX business_whatsapp_contacts_recent_idx
  ON public.business_whatsapp_contacts (business_id, last_activity_at DESC);
GRANT SELECT ON public.business_whatsapp_contacts TO authenticated;
GRANT UPDATE (stage, notes, first_name) ON public.business_whatsapp_contacts TO authenticated;
GRANT ALL ON public.business_whatsapp_contacts TO service_role;
ALTER TABLE public.business_whatsapp_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_read_whatsapp_contacts ON public.business_whatsapp_contacts
  FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'viewer'));
CREATE POLICY business_update_whatsapp_contacts ON public.business_whatsapp_contacts
  FOR UPDATE TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'editor'))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor'));

-- 3) Pláticas: empresa dueña y contacto
ALTER TABLE public.alux_public_sessions
  ADD COLUMN IF NOT EXISTS owner_business_id uuid NULL,
  ADD COLUMN IF NOT EXISTS business_contact_id uuid NULL
    REFERENCES public.business_whatsapp_contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS alux_public_sessions_owner_business_idx
  ON public.alux_public_sessions (owner_business_id, last_seen_at DESC)
  WHERE owner_business_id IS NOT NULL;

-- El Centro Concierge ve sólo las pláticas de Valladolid.mx.
DROP POLICY IF EXISTS crm_staff_read_public_sessions ON public.alux_public_sessions;
CREATE POLICY crm_staff_read_public_sessions ON public.alux_public_sessions
  FOR SELECT TO authenticated
  USING (public.crm_is_prospect_staff(auth.uid()) AND owner_business_id IS NULL);
DROP POLICY IF EXISTS crm_staff_read_public_messages ON public.alux_public_messages;
CREATE POLICY crm_staff_read_public_messages ON public.alux_public_messages
  FOR SELECT TO authenticated
  USING (
    public.crm_is_prospect_staff(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.alux_public_sessions s
       WHERE s.id = alux_public_messages.session_id AND s.owner_business_id IS NULL
    )
  );

-- El aviso al dueño de Valladolid.mx no cuenta las pláticas de las empresas.
CREATE OR REPLACE FUNCTION public.whatsapp_agent_enqueue_alux_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_business_id IS NULL
     AND COALESCE(NEW.message_count, 0) >= 1
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.message_count, 0) = 0) THEN
    BEGIN
      INSERT INTO public.whatsapp_agent_alux_notices
        (session_id, started_at, destination_slug, registered, user_agent)
      VALUES
        (NEW.id, now(), NEW.last_destination_slug, NEW.traveler_user_id IS NOT NULL, left(NEW.user_agent, 300))
      ON CONFLICT (session_id) DO NOTHING;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.whatsapp_agent_enqueue_alux_notice() FROM PUBLIC, anon, authenticated;

-- 4) Aviso al equipo de la empresa (en la app y en el celular). Nunca incluye el teléfono.
CREATE OR REPLACE FUNCTION public.business_whatsapp_notify(
  _business_id uuid, _event_id text, _event_type text, _url text, _alt text
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
  FOR r IN SELECT DISTINCT user_id FROM public.business_users
           WHERE business_id = _business_id AND status = 'active' LOOP
    PERFORM public.unc_publish_in_app(
      _event_id, _event_type, r.user_id, 'business', 'operational'::notification_category, v_payload
    );
    INSERT INTO public.notification_deliveries (
      event_id, event_type, category, channel, recipient_user_id, audience, status, payload_ref
    ) VALUES (
      _event_id, _event_type, 'operational', 'push', r.user_id, 'business', 'pending', v_payload
    ) ON CONFLICT (event_id, channel, recipient_user_id) DO NOTHING;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.business_whatsapp_notify(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.business_whatsapp_notify(uuid, text, text, text, text) TO service_role;

-- 5) Contacto desde el WhatsApp de la empresa (la persona inició la plática)
CREATE OR REPLACE FUNCTION public.business_whatsapp_touch_contact(
  _business_id uuid, _phone_e164 text, _first_name text
)
RETURNS TABLE (contact_id uuid, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_new boolean := false;
  v_name text := left(btrim(coalesce(_first_name, '')), 80);
BEGIN
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'invalid_business' USING errcode = '22023';
  END IF;
  IF _phone_e164 IS NULL OR _phone_e164 !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'invalid_phone' USING errcode = '22023';
  END IF;
  IF v_name = '' THEN v_name := 'Contacto de WhatsApp'; END IF;

  SELECT id INTO v_id FROM public.business_whatsapp_contacts
   WHERE business_id = _business_id AND phone_e164 = _phone_e164 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.business_whatsapp_contacts (business_id, phone_e164, first_name)
    VALUES (_business_id, _phone_e164, v_name)
    RETURNING id INTO v_id;
    v_new := true;
  ELSE
    UPDATE public.business_whatsapp_contacts SET
      last_activity_at = now(),
      stage = CASE WHEN stage = 'perdido' THEN 'nuevo' ELSE stage END
    WHERE id = v_id;
  END IF;

  IF v_new THEN
    PERFORM public.business_whatsapp_notify(
      _business_id,
      'biz-wa-contact-created:' || v_id::text,
      'Business.WhatsApp.ContactCreated',
      '/portal/whatsapp',
      'Nueva plática por WhatsApp'
        || CASE WHEN v_name <> 'Contacto de WhatsApp' THEN ' · ' || v_name ELSE '' END
    );
  END IF;

  RETURN QUERY SELECT v_id, v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.business_whatsapp_touch_contact(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.business_whatsapp_touch_contact(uuid, text, text) TO service_role;