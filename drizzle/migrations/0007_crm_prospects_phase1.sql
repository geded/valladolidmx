
-- Helper: equipo del CRM (concierge, líder, admin, super admin).
CREATE OR REPLACE FUNCTION public.crm_is_prospect_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('concierge','concierge_lead','admin','super_admin')
  );
$$;
REVOKE ALL ON FUNCTION public.crm_is_prospect_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_is_prospect_staff(uuid) TO authenticated, service_role;

-- 1) Prospectos
CREATE TABLE public.concierge_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'alux_web'
    CHECK (source IN ('alux_web','whatsapp','instagram','facebook','manual')),
  first_name text NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 80),
  phone_e164 text NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email text NULL CHECK (email IS NULL OR char_length(email) <= 254),
  language text NOT NULL DEFAULT 'es' CHECK (language IN ('es','en','fr','de','it','pt')),
  consent_contact boolean NOT NULL CHECK (consent_contact),
  consent_at timestamptz NOT NULL DEFAULT now(),
  consent_text text NOT NULL CHECK (char_length(consent_text) BETWEEN 10 AND 600),
  stage text NOT NULL DEFAULT 'nuevo'
    CHECK (stage IN ('nuevo','contactado','propuesta_enviada','reservo','por_viajar','viajo','posventa','no_interesado','perdido')),
  temperature text NOT NULL DEFAULT 'tibio' CHECK (temperature IN ('frio','tibio','caliente')),
  capture_reason text NULL CHECK (capture_reason IS NULL OR capture_reason IN ('price','booking','concierge','itinerary','followup')),
  destination_slug text NULL CHECK (destination_slug IS NULL OR char_length(destination_slug) <= 128),
  trip_brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  trip_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  handoff_summary text NULL CHECK (handoff_summary IS NULL OR char_length(handoff_summary) <= 4000),
  assigned_concierge_user_id uuid NULL,
  reviewed_at timestamptz NULL,
  reviewed_by uuid NULL,
  next_followup_at timestamptz NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  linked_user_id uuid NULL,
  travel_plan_id uuid NULL,
  lost_reason text NULL CHECK (lost_reason IS NULL OR char_length(lost_reason) <= 500)
);
CREATE UNIQUE INDEX concierge_prospects_phone_uidx ON public.concierge_prospects (phone_e164);
CREATE INDEX concierge_prospects_stage_idx ON public.concierge_prospects (stage, last_activity_at DESC);
CREATE INDEX concierge_prospects_followup_idx ON public.concierge_prospects (next_followup_at) WHERE next_followup_at IS NOT NULL;

GRANT SELECT ON public.concierge_prospects TO authenticated;
GRANT UPDATE (first_name, email, stage, temperature, assigned_concierge_user_id, reviewed_at, reviewed_by,
              next_followup_at, lost_reason, handoff_summary, last_activity_at)
  ON public.concierge_prospects TO authenticated;
GRANT ALL ON public.concierge_prospects TO service_role;
ALTER TABLE public.concierge_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_staff_read_prospects ON public.concierge_prospects
  FOR SELECT TO authenticated USING (public.crm_is_prospect_staff(auth.uid()));
CREATE POLICY crm_staff_update_prospects ON public.concierge_prospects
  FOR UPDATE TO authenticated
  USING (public.crm_is_prospect_staff(auth.uid()))
  WITH CHECK (public.crm_is_prospect_staff(auth.uid()));

-- 2) Historial
CREATE TABLE public.concierge_prospect_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.concierge_prospects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('created','returned','stage_changed','note','assigned','reviewed','contact_updated','followup_set')),
  actor_user_id uuid NULL,
  body text NULL CHECK (body IS NULL OR char_length(body) <= 2000),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX concierge_prospect_events_prospect_idx ON public.concierge_prospect_events (prospect_id, created_at DESC);

GRANT SELECT, INSERT ON public.concierge_prospect_events TO authenticated;
GRANT ALL ON public.concierge_prospect_events TO service_role;
ALTER TABLE public.concierge_prospect_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_staff_read_prospect_events ON public.concierge_prospect_events
  FOR SELECT TO authenticated USING (public.crm_is_prospect_staff(auth.uid()));
CREATE POLICY crm_staff_insert_prospect_notes ON public.concierge_prospect_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.crm_is_prospect_staff(auth.uid())
    AND actor_user_id = auth.uid()
    AND kind = 'note'
    AND body IS NOT NULL
  );

-- 3) Bitácora automática de cambios hechos por el equipo
CREATE OR REPLACE FUNCTION public.crm_prospect_audit_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, actor_user_id, meta)
    VALUES (NEW.id, 'stage_changed', auth.uid(), jsonb_build_object('from', OLD.stage, 'to', NEW.stage));
  END IF;
  IF NEW.assigned_concierge_user_id IS DISTINCT FROM OLD.assigned_concierge_user_id THEN
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, actor_user_id, meta)
    VALUES (NEW.id, 'assigned', auth.uid(), jsonb_build_object('to', NEW.assigned_concierge_user_id));
  END IF;
  IF NEW.reviewed_at IS NOT NULL AND OLD.reviewed_at IS NULL THEN
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, actor_user_id)
    VALUES (NEW.id, 'reviewed', auth.uid());
  END IF;
  IF NEW.next_followup_at IS DISTINCT FROM OLD.next_followup_at AND NEW.next_followup_at IS NOT NULL THEN
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, actor_user_id, meta)
    VALUES (NEW.id, 'followup_set', auth.uid(), jsonb_build_object('at', NEW.next_followup_at));
  END IF;
  IF NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.email IS DISTINCT FROM OLD.email THEN
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, actor_user_id)
    VALUES (NEW.id, 'contact_updated', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_prospect_audit_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER concierge_prospects_audit_update
  BEFORE UPDATE ON public.concierge_prospects
  FOR EACH ROW EXECUTE FUNCTION public.crm_prospect_audit_update();

-- 4) Pláticas de Alux: enlace al prospecto y límite de ofrecimientos
ALTER TABLE public.alux_public_sessions
  ADD COLUMN IF NOT EXISTS prospect_id uuid NULL REFERENCES public.concierge_prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_offer_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_offer_last_message_count integer NULL,
  ADD COLUMN IF NOT EXISTS contact_capture_count integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS alux_public_sessions_prospect_idx ON public.alux_public_sessions (prospect_id) WHERE prospect_id IS NOT NULL;

CREATE POLICY crm_staff_read_public_sessions ON public.alux_public_sessions
  FOR SELECT TO authenticated USING (public.crm_is_prospect_staff(auth.uid()));
CREATE POLICY crm_staff_read_public_messages ON public.alux_public_messages
  FOR SELECT TO authenticated USING (public.crm_is_prospect_staff(auth.uid()));

-- 5) Captura consentida (sólo servidor)
CREATE OR REPLACE FUNCTION public.crm_capture_prospect(
  _session_key text,
  _first_name text,
  _phone_e164 text,
  _language text,
  _reason text,
  _destination_slug text,
  _trip_brief jsonb,
  _trip_items jsonb,
  _consent_text text
)
RETURNS TABLE (prospect_id uuid, is_new boolean, reopened boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.alux_public_sessions%ROWTYPE;
  v_existing public.concierge_prospects%ROWTYPE;
  v_id uuid;
  v_new boolean := false;
  v_reopened boolean := false;
  v_temp text;
  v_event_id text;
  v_event_type text;
  v_alt text;
  v_dest text := NULLIF(btrim(coalesce(_destination_slug, '')), '');
  v_items jsonb := CASE WHEN jsonb_typeof(_trip_items) = 'array' THEN _trip_items ELSE '[]'::jsonb END;
  v_brief jsonb := CASE WHEN jsonb_typeof(_trip_brief) = 'object' THEN _trip_brief ELSE '{}'::jsonb END;
  r record;
BEGIN
  SELECT * INTO v_session FROM public.alux_public_sessions WHERE session_key = _session_key FOR UPDATE;
  IF NOT FOUND OR coalesce(v_session.message_count, 0) < 1 THEN
    RAISE EXCEPTION 'session_not_found' USING errcode = '22023';
  END IF;
  IF v_session.contact_capture_count >= 5 THEN
    RAISE EXCEPTION 'too_many_attempts' USING errcode = '22023';
  END IF;

  v_temp := CASE WHEN _reason IN ('price','booking','concierge') THEN 'caliente' ELSE 'tibio' END;

  SELECT * INTO v_existing FROM public.concierge_prospects WHERE phone_e164 = _phone_e164 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.concierge_prospects (
      source, first_name, phone_e164, language, consent_contact, consent_at, consent_text,
      temperature, capture_reason, destination_slug, trip_brief, trip_items
    ) VALUES (
      'alux_web', btrim(_first_name), _phone_e164, coalesce(_language, 'es'), true, now(), _consent_text,
      v_temp, _reason, v_dest, v_brief, v_items
    ) RETURNING id INTO v_id;
    v_new := true;
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, meta)
    VALUES (v_id, 'created', jsonb_build_object('source', 'alux_web', 'reason', _reason, 'session_id', v_session.id));
  ELSE
    v_id := v_existing.id;
    v_reopened := v_existing.stage IN ('perdido', 'no_interesado');
    UPDATE public.concierge_prospects SET
      first_name = btrim(_first_name),
      language = coalesce(_language, language),
      consent_contact = true,
      consent_at = now(),
      consent_text = _consent_text,
      capture_reason = coalesce(_reason, capture_reason),
      destination_slug = coalesce(v_dest, destination_slug),
      trip_brief = trip_brief || v_brief,
      trip_items = CASE WHEN jsonb_array_length(v_items) > 0 THEN v_items ELSE trip_items END,
      temperature = CASE WHEN v_temp = 'caliente' THEN 'caliente' ELSE temperature END,
      stage = CASE WHEN v_reopened THEN 'nuevo' ELSE stage END,
      reviewed_at = NULL,
      reviewed_by = NULL,
      last_activity_at = now()
    WHERE id = v_id;
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, meta)
    VALUES (v_id, 'returned', jsonb_build_object('source', 'alux_web', 'reason', _reason, 'reopened', v_reopened, 'session_id', v_session.id));
  END IF;

  UPDATE public.alux_public_sessions
     SET prospect_id = v_id,
         contact_capture_count = contact_capture_count + 1
   WHERE id = v_session.id;

  -- Aviso al equipo (en la app y en el celular). Nunca incluye el teléfono.
  IF v_new THEN
    v_event_id := 'crm-prospect-created:' || v_id::text;
    v_event_type := 'CRM.Prospect.Created';
  ELSE
    v_event_id := 'crm-prospect-returned:' || v_id::text || ':' || to_char(now(), 'YYYYMMDDHH24');
    v_event_type := 'CRM.Prospect.Returned';
  END IF;
  v_alt := btrim(_first_name) || ' dejó su WhatsApp con Alux' ||
           CASE WHEN v_dest IS NOT NULL THEN ' · ' || v_dest ELSE '' END;
  FOR r IN SELECT DISTINCT user_id FROM public.user_roles
           WHERE role IN ('concierge','concierge_lead','admin','super_admin') LOOP
    PERFORM public.unc_publish_in_app(
      v_event_id, v_event_type, r.user_id, 'concierge', 'operational'::notification_category,
      jsonb_build_object('url', '/concierge/prospectos/' || v_id::text, 'alt_text', v_alt, 'prospect_id', v_id)
    );
    INSERT INTO public.notification_deliveries (
      event_id, event_type, category, channel, recipient_user_id, audience, status, payload_ref
    ) VALUES (
      v_event_id, v_event_type, 'operational', 'push', r.user_id, 'concierge', 'pending',
      jsonb_build_object('url', '/concierge/prospectos/' || v_id::text, 'alt_text', v_alt, 'prospect_id', v_id)
    ) ON CONFLICT (event_id, channel, recipient_user_id) DO NOTHING;
  END LOOP;

  RETURN QUERY SELECT v_id, v_new, v_reopened;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_capture_prospect(text, text, text, text, text, text, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_capture_prospect(text, text, text, text, text, text, jsonb, jsonb, text) TO service_role;
