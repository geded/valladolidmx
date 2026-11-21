-- CRM Prospectos · Fase 3 (propuesta 19.48): cierre automático.

-- 1) Campos de pase, rescate y recontacto
ALTER TABLE public.concierge_prospects
  ADD COLUMN IF NOT EXISTS case_id uuid NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rescue_since timestamptz NULL,
  ADD COLUMN IF NOT EXISTS recontact_due_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS recontact_trip_date date NULL;
CREATE UNIQUE INDEX IF NOT EXISTS concierge_prospects_linked_user_uidx
  ON public.concierge_prospects (linked_user_id) WHERE linked_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS concierge_prospects_case_idx
  ON public.concierge_prospects (case_id) WHERE case_id IS NOT NULL;
GRANT SELECT ON public.concierge_prospects TO authenticated;
GRANT UPDATE (recontact_due_at) ON public.concierge_prospects TO authenticated;

ALTER TABLE public.concierge_prospect_events DROP CONSTRAINT IF EXISTS concierge_prospect_events_kind_check;
ALTER TABLE public.concierge_prospect_events ADD CONSTRAINT concierge_prospect_events_kind_check
  CHECK (kind IN ('created','returned','stage_changed','note','assigned','reviewed','contact_updated','followup_set',
                  'converted','invite_created','payment_confirmed','payment_review','proposal_sent',
                  'proposal_expired','recontact','trip_status'));

ALTER TABLE public.crm_whatsapp_lines
  ADD COLUMN IF NOT EXISTS auto_recontact boolean NOT NULL DEFAULT true;
GRANT SELECT (auto_recontact) ON public.crm_whatsapp_lines TO authenticated;

-- 2) Enlaces personales (registro / pago de experiencia)
CREATE TABLE public.crm_prospect_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  prospect_id uuid NOT NULL REFERENCES public.concierge_prospects(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  purpose text NOT NULL CHECK (purpose IN ('register','pay')),
  product_id uuid NULL,
  created_by uuid NULL,
  channel text NOT NULL DEFAULT 'panel' CHECK (channel IN ('panel','whatsapp_command')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  opened_at timestamptz NULL,
  used_at timestamptz NULL,
  used_by uuid NULL,
  CONSTRAINT crm_prospect_invites_purpose_product CHECK ((purpose = 'pay') = (product_id IS NOT NULL))
);
CREATE INDEX crm_prospect_invites_prospect_idx ON public.crm_prospect_invites (prospect_id, created_at DESC);
GRANT SELECT (id, created_at, prospect_id, purpose, product_id, created_by, channel, expires_at, opened_at, used_at, used_by)
  ON public.crm_prospect_invites TO authenticated;
GRANT ALL ON public.crm_prospect_invites TO service_role;
ALTER TABLE public.crm_prospect_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_staff_read_prospect_invites ON public.crm_prospect_invites
  FOR SELECT TO authenticated USING (public.crm_is_prospect_staff(auth.uid()));

-- 3) Mensajes programados de WhatsApp (sólo servidor)
CREATE TABLE public.crm_whatsapp_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  prospect_id uuid NOT NULL REFERENCES public.concierge_prospects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('recontact')),
  dedupe_key text NOT NULL UNIQUE CHECK (char_length(dedupe_key) BETWEEN 3 AND 200),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  last_error text NULL CHECK (last_error IS NULL OR char_length(last_error) <= 500)
);
CREATE INDEX crm_whatsapp_outbox_pending_idx ON public.crm_whatsapp_outbox (next_attempt_at) WHERE status = 'pending';
GRANT ALL ON public.crm_whatsapp_outbox TO service_role;
ALTER TABLE public.crm_whatsapp_outbox ENABLE ROW LEVEL SECURITY;

-- 4) Fecha segura desde el pre-expediente
CREATE OR REPLACE FUNCTION public.crm_safe_date(_v text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF _v IS NULL OR _v !~ '^\d{4}-\d{2}-\d{2}' THEN RETURN NULL; END IF;
  RETURN left(_v, 10)::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- 5) Pago confirmado → «Reservó» (sin adivinar)
CREATE OR REPLACE FUNCTION public.crm_reconcile_paid_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  v_pid uuid;
  v_phone text;
BEGIN
  SELECT id, folio, user_id, traveler_phone, total_amount, currency, editorial_title
    INTO o FROM public.concierge_orders WHERE id = _order_id;
  IF NOT FOUND OR o.user_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_pid FROM public.concierge_prospects WHERE linked_user_id = o.user_id;
  IF v_pid IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.concierge_prospect_events
                WHERE prospect_id = v_pid AND kind = 'payment_confirmed'
                  AND meta->>'order_id' = o.id::text) THEN
      RETURN;
    END IF;
    UPDATE public.concierge_prospects
       SET stage = CASE WHEN stage IN ('por_viajar','viajo','posventa') THEN stage ELSE 'reservo' END,
           rescue_since = NULL,
           temperature = 'caliente',
           last_activity_at = now()
     WHERE id = v_pid;
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
    VALUES (v_pid, 'payment_confirmed',
            left('Pago confirmado · ' || COALESCE(o.editorial_title, 'Reservación') || ' · folio ' || COALESCE(o.folio, '—'), 2000),
            jsonb_build_object('order_id', o.id, 'folio', o.folio, 'total_amount', o.total_amount, 'currency', o.currency));
    PERFORM public.crm_whatsapp_notify_staff(
      'crm.prospect.paid:' || o.id::text, 'Crm.Prospect.Paid',
      '/concierge/prospectos/' || v_pid::text, 'Un prospecto confirmó su pago');
    RETURN;
  END IF;

  -- Sin cuenta ligada: sólo una nota si el WhatsApp coincide; nunca cambia la etapa.
  v_phone := regexp_replace(COALESCE(o.traveler_phone, ''), '[^0-9+]', '', 'g');
  IF v_phone = '' THEN RETURN; END IF;
  IF left(v_phone, 1) <> '+' THEN v_phone := '+' || v_phone; END IF;
  SELECT id INTO v_pid FROM public.concierge_prospects
   WHERE phone_e164 = v_phone AND linked_user_id IS NULL;
  IF v_pid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.concierge_prospect_events
              WHERE prospect_id = v_pid AND kind = 'payment_review'
                AND meta->>'order_id' = o.id::text) THEN
    RETURN;
  END IF;
  INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
  VALUES (v_pid, 'payment_review',
          left('Llegó un pago con el mismo WhatsApp desde una cuenta que no está ligada a este prospecto (folio '
               || COALESCE(o.folio, '—') || '). Revísalo antes de marcar «Reservó».', 2000),
          jsonb_build_object('order_id', o.id, 'folio', o.folio));
END;
$$;
REVOKE ALL ON FUNCTION public.crm_reconcile_paid_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_reconcile_paid_order(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.crm_on_concierge_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.crm_reconcile_paid_order(NEW.id);
  EXCEPTION WHEN others THEN
    RAISE WARNING 'crm_reconcile_paid_order(%): %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_on_concierge_order_paid() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER crm_concierge_orders_paid_upd
  AFTER UPDATE OF status ON public.concierge_orders
  FOR EACH ROW WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
  EXECUTE FUNCTION public.crm_on_concierge_order_paid();
CREATE TRIGGER crm_concierge_orders_paid_ins
  AFTER INSERT ON public.concierge_orders
  FOR EACH ROW WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION public.crm_on_concierge_order_paid();

-- 6) Propuesta enviada / vencida → etapa y Rescate
CREATE OR REPLACE FUNCTION public.crm_on_concierge_proposal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_traveler uuid;
  v_ids uuid[];
  v_pid uuid;
BEGIN
  BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NULL; END IF;
    IF NEW.status NOT IN ('sent','expired') THEN RETURN NULL; END IF;
    SELECT traveler_user_id INTO v_traveler FROM public.concierge_cases WHERE id = NEW.case_id;
    SELECT array_agg(DISTINCT id) INTO v_ids FROM public.concierge_prospects
     WHERE case_id = NEW.case_id OR (v_traveler IS NOT NULL AND linked_user_id = v_traveler);
    IF COALESCE(array_length(v_ids, 1), 0) <> 1 THEN RETURN NULL; END IF;
    v_pid := v_ids[1];

    IF NEW.status = 'sent' THEN
      UPDATE public.concierge_prospects
         SET stage = CASE WHEN stage IN ('nuevo','contactado','no_interesado','perdido')
                          THEN 'propuesta_enviada' ELSE stage END,
             rescue_since = NULL,
             last_activity_at = now()
       WHERE id = v_pid;
      INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
      VALUES (v_pid, 'proposal_sent', 'Se envió una propuesta desde CRM Arma tu viaje.',
              jsonb_build_object('proposal_id', NEW.id, 'case_id', NEW.case_id, 'valid_until', NEW.valid_until));
    ELSE
      IF EXISTS (SELECT 1 FROM public.concierge_proposals
                  WHERE case_id = NEW.case_id AND id <> NEW.id AND status IN ('sent','viewed','accepted')) THEN
        RETURN NULL;
      END IF;
      UPDATE public.concierge_prospects
         SET rescue_since = CASE WHEN stage IN ('reservo','por_viajar','viajo','posventa')
                                 THEN rescue_since ELSE now() END,
             stage = CASE WHEN stage = 'propuesta_enviada' THEN 'contactado' ELSE stage END,
             last_activity_at = now()
       WHERE id = v_pid;
      INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
      VALUES (v_pid, 'proposal_expired',
              'La propuesta venció sin pago. Regresa a «Contactado» y entra a Rescate.',
              jsonb_build_object('proposal_id', NEW.id, 'case_id', NEW.case_id));
      PERFORM public.crm_whatsapp_notify_staff(
        'crm.prospect.rescue:' || NEW.id::text, 'Crm.Prospect.Rescue',
        '/concierge/prospectos/' || v_pid::text, 'Una propuesta venció: rescátala');
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'crm_on_concierge_proposal_status(%): %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_on_concierge_proposal_status() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER crm_concierge_proposals_status
  AFTER INSERT OR UPDATE OF status ON public.concierge_proposals
  FOR EACH ROW EXECUTE FUNCTION public.crm_on_concierge_proposal_status();

-- 7) Revisión diaria: Por viajar, Viajó y recontacto 30 días antes
CREATE OR REPLACE FUNCTION public.crm_prospect_lifecycle_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  v_days integer;
  n_recontact integer := 0;
  n_soon integer := 0;
  n_done integer := 0;
BEGIN
  FOR r IN
    SELECT p.id, p.stage, p.recontact_trip_date,
           COALESCE(tp.start_date, public.crm_safe_date(p.trip_brief->>'startDate')) AS s,
           COALESCE(tp.end_date, public.crm_safe_date(p.trip_brief->>'endDate')) AS e
      FROM public.concierge_prospects p
      LEFT JOIN public.travel_plans tp ON tp.id = p.travel_plan_id
     WHERE p.stage NOT IN ('no_interesado','perdido','viajo','posventa')
  LOOP
    CONTINUE WHEN r.s IS NULL;
    v_days := r.s - v_today;

    IF r.stage IN ('reservo','por_viajar') AND COALESCE(r.e, r.s) < v_today THEN
      UPDATE public.concierge_prospects SET stage = 'viajo' WHERE id = r.id;
      INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
      VALUES (r.id, 'trip_status', 'El viaje terminó: pasa a «Viajó».', jsonb_build_object('end_date', COALESCE(r.e, r.s)));
      n_done := n_done + 1;
      CONTINUE;
    END IF;

    IF r.stage = 'reservo' AND v_days BETWEEN 0 AND 30 THEN
      UPDATE public.concierge_prospects SET stage = 'por_viajar' WHERE id = r.id;
      INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
      VALUES (r.id, 'trip_status', 'Faltan menos de 30 días: pasa a «Por viajar».', jsonb_build_object('start_date', r.s));
      n_soon := n_soon + 1;
    END IF;

    -- Primer toque 30 días antes; si un día no corrió, lo recupera hasta el día 27.
    IF v_days BETWEEN 27 AND 30 AND r.recontact_trip_date IS DISTINCT FROM r.s THEN
      UPDATE public.concierge_prospects
         SET recontact_due_at = now(), recontact_trip_date = r.s
       WHERE id = r.id;
      INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
      VALUES (r.id, 'recontact', 'Faltan 30 días para su viaje: recontacto de hoy.', jsonb_build_object('start_date', r.s));
      INSERT INTO public.crm_whatsapp_outbox (prospect_id, kind, dedupe_key, payload)
      VALUES (r.id, 'recontact', 'recontact:' || r.id::text || ':' || r.s::text, jsonb_build_object('start_date', r.s))
      ON CONFLICT (dedupe_key) DO NOTHING;
      PERFORM public.crm_whatsapp_notify_staff(
        'crm.prospect.recontact:' || r.id::text || ':' || r.s::text, 'Crm.Prospect.Recontact',
        '/concierge/prospectos/' || r.id::text, 'Recontacto de hoy: faltan 30 días para un viaje');
      n_recontact := n_recontact + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('recontact', n_recontact, 'por_viajar', n_soon, 'viajo', n_done);
END;
$$;
REVOKE ALL ON FUNCTION public.crm_prospect_lifecycle_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_prospect_lifecycle_tick() TO service_role;

SELECT cron.schedule('crm-prospect-lifecycle-daily', '5 12 * * *', $$SELECT public.crm_prospect_lifecycle_tick()$$);

-- 8) Canje del enlace personal
CREATE OR REPLACE FUNCTION public.crm_claim_prospect_invite(_token_hash text, _user_id uuid)
RETURNS TABLE (invite_id uuid, prospect_id uuid, purpose text, product_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
BEGIN
  SELECT i.id, i.prospect_id, i.purpose, i.product_id, i.expires_at, i.used_at, i.used_by,
         p.linked_user_id AS p_linked
    INTO v
    FROM public.crm_prospect_invites i
    JOIN public.concierge_prospects p ON p.id = i.prospect_id
   WHERE i.token_hash = _token_hash
   FOR UPDATE OF i;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::uuid, 'invalid'::text; RETURN;
  END IF;
  IF v.p_linked IS NOT NULL AND v.p_linked <> _user_id THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'other_account'::text; RETURN;
  END IF;
  IF v.used_at IS NOT NULL AND v.used_by IS DISTINCT FROM _user_id THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'used'::text; RETURN;
  END IF;
  IF v.used_at IS NULL AND v.expires_at < now() THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'expired'::text; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.concierge_prospects
              WHERE linked_user_id = _user_id AND id <> v.prospect_id) THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'account_has_prospect'::text; RETURN;
  END IF;
  UPDATE public.crm_prospect_invites
     SET used_at = COALESCE(used_at, now()), used_by = _user_id
   WHERE id = v.id;
  RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'ok'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_claim_prospect_invite(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_claim_prospect_invite(text, uuid) TO service_role;

-- 9) Cierre del pase: asignación, historial y ficha convertida
CREATE OR REPLACE FUNCTION public.crm_finalize_prospect_conversion(
  _prospect_id uuid, _user_id uuid, _case_id uuid, _travel_plan_id uuid, _summary text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  SELECT * INTO p FROM public.concierge_prospects WHERE id = _prospect_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'prospect_not_found'; END IF;
  IF p.linked_user_id IS NOT NULL AND p.linked_user_id <> _user_id THEN RAISE EXCEPTION 'other_account'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.concierge_cases WHERE id = _case_id AND traveler_user_id = _user_id) THEN
    RAISE EXCEPTION 'case_mismatch';
  END IF;

  IF p.assigned_concierge_user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.concierge_assignments WHERE case_id = _case_id AND status = 'active') THEN
    INSERT INTO public.concierge_assignments (case_id, concierge_user_id, assigned_by_user_id, status, reason)
    VALUES (_case_id, p.assigned_concierge_user_id, p.assigned_concierge_user_id, 'active', 'Llegó desde CRM Prospectos');
    INSERT INTO public.concierge_case_participants (case_id, user_id, role, is_active)
    VALUES (_case_id, p.assigned_concierge_user_id, 'concierge', true)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
    VALUES (_case_id, 'Concierge.Case.Assigned', 'info', NULL, 'Asignación de expediente',
            jsonb_build_object('concierge_user_id', p.assigned_concierge_user_id, 'reason', 'Llegó desde CRM Prospectos'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.concierge_case_timeline
                  WHERE case_id = _case_id AND event_type = 'Concierge.Case.FromProspect') THEN
    INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
    VALUES (_case_id, 'Concierge.Case.FromProspect', 'info', _user_id, 'Llegó desde CRM Prospectos',
            jsonb_build_object('prospect_id', _prospect_id, 'handoff', left(COALESCE(_summary, ''), 4000)));
  END IF;

  UPDATE public.concierge_prospects
     SET linked_user_id = _user_id,
         case_id = _case_id,
         travel_plan_id = COALESCE(_travel_plan_id, travel_plan_id),
         converted_at = COALESCE(converted_at, now()),
         handoff_summary = COALESCE(handoff_summary, left(_summary, 4000)),
         stage = CASE WHEN stage IN ('nuevo','no_interesado','perdido') THEN 'contactado' ELSE stage END,
         last_activity_at = now()
   WHERE id = _prospect_id;

  IF p.converted_at IS NULL THEN
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
    VALUES (_prospect_id, 'converted', 'Creó su cuenta y pasó a CRM Arma tu viaje con su viaje armado.',
            jsonb_build_object('case_id', _case_id, 'travel_plan_id', _travel_plan_id));
    PERFORM public.crm_whatsapp_notify_staff(
      'crm.prospect.converted:' || _prospect_id::text, 'Crm.Prospect.Converted',
      '/concierge/expedientes/' || _case_id::text, 'Un prospecto creó su cuenta y su expediente');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_finalize_prospect_conversion(uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_finalize_prospect_conversion(uuid, uuid, uuid, uuid, text) TO service_role;