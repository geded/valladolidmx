CREATE OR REPLACE FUNCTION public._guard_concierge_orders_client_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.payment_provider IS DISTINCT FROM OLD.payment_provider
     OR NEW.payment_provider_intent_id IS DISTINCT FROM OLD.payment_provider_intent_id
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_concierge_orders_client_update ON public.concierge_orders;
CREATE TRIGGER guard_concierge_orders_client_update BEFORE UPDATE ON public.concierge_orders
  FOR EACH ROW EXECUTE FUNCTION public._guard_concierge_orders_client_update();

CREATE OR REPLACE FUNCTION public._guard_orders_client_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id
     OR NEW.payment_provider IS DISTINCT FROM OLD.payment_provider
     OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.subtotal_amount IS DISTINCT FROM OLD.subtotal_amount
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cart','pending','cancelled')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_orders_client_update ON public.orders;
CREATE TRIGGER guard_orders_client_update BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._guard_orders_client_update();

CREATE OR REPLACE FUNCTION public._cv11_can_view_travel_ops(_uid uuid)
 RETURNS TABLE(can_view boolean, is_admin boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    (_uid = auth.uid() OR auth.role() = 'service_role') AND (public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin')
     OR public.has_role(_uid,'concierge') OR public.has_role(_uid,'concierge_lead')),
    (_uid = auth.uid() OR auth.role() = 'service_role') AND (public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin'));
$function$;
REVOKE EXECUTE ON FUNCTION public._cv11_can_view_travel_ops(uuid) FROM anon, PUBLIC;

CREATE OR REPLACE FUNCTION public.concierge_order_mark_paid_cash(_order_id uuid, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_is_ops boolean;
  v_plan_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticacion requerida'; END IF;

  SELECT * INTO v_order FROM public.concierge_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservacion no encontrada'; END IF;

  v_is_ops :=
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'super_admin')
    OR public.has_role(v_uid, 'concierge')
    OR public.has_role(v_uid, 'concierge_lead');

  IF v_order.user_id <> v_uid AND NOT v_is_ops THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT v_is_ops THEN
    IF v_order.status IN ('paid','fulfilled') THEN
      RETURN jsonb_build_object('ok', true, 'status', v_order.status, 'folio', v_order.folio,
                                'travel_plan_id', v_order.travel_plan_id);
    END IF;
    IF v_order.status NOT IN ('draft','awaiting_payment') THEN
      RAISE EXCEPTION 'La reservacion no admite pago (estado=%)', v_order.status;
    END IF;
    UPDATE public.concierge_orders
       SET status = 'awaiting_payment', payment_provider = 'cash', updated_at = now()
     WHERE id = _order_id;
    INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
    VALUES (_order_id, 'cash_payment_requested', v_uid, jsonb_build_object('method','cash','note',_note));
    RETURN jsonb_build_object('ok', true, 'status', 'awaiting_payment', 'folio', v_order.folio,
                              'travel_plan_id', v_order.travel_plan_id);
  END IF;

  IF v_order.status IN ('paid','fulfilled') THEN
    RETURN jsonb_build_object('ok', true, 'status', v_order.status, 'folio', v_order.folio,
                              'travel_plan_id', v_order.travel_plan_id);
  END IF;

  IF v_order.status NOT IN ('draft','awaiting_payment') THEN
    RAISE EXCEPTION 'La reservacion no admite pago (estado=%)', v_order.status;
  END IF;

  v_plan_id := v_order.travel_plan_id;
  IF v_plan_id IS NULL AND v_order.source_case_id IS NOT NULL THEN
    SELECT l.target_id INTO v_plan_id
    FROM public.concierge_case_links l
    WHERE l.case_id = v_order.source_case_id AND l.link_type = 'travel_plan'
    ORDER BY l.created_at DESC LIMIT 1;
  END IF;

  UPDATE public.concierge_orders
     SET status = 'paid',
         paid_at = now(),
         payment_provider = 'cash',
         payment_provider_intent_id = COALESCE(payment_provider_intent_id, 'cash_' || left(_order_id::text, 8)),
         travel_plan_id = COALESCE(travel_plan_id, v_plan_id),
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (_order_id, 'payment_succeeded', v_uid,
          jsonb_build_object('method', 'cash', 'note', _note,
                             'amount', v_order.total_amount, 'currency', v_order.currency));

  IF v_order.source_proposal_id IS NOT NULL THEN
    UPDATE public.concierge_proposals
       SET status = 'accepted', responded_at = COALESCE(responded_at, now()), updated_at = now()
     WHERE id = v_order.source_proposal_id AND status <> 'accepted';
  END IF;

  IF v_order.source_case_id IS NOT NULL THEN
    UPDATE public.concierge_cases
       SET status = 'closed_won', updated_at = now(), last_activity_at = now()
     WHERE id = v_order.source_case_id AND status <> 'closed_won';
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'paid', 'folio', v_order.folio,
                            'travel_plan_id', v_plan_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.eb_acquire_edit_lock(_composition_id uuid, _force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_current jsonb;
  v_new jsonb;
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF NOT public.is_editor_or_admin(v_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(display_name, email, 'Editor')
    INTO v_user_name
  FROM public.profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  SELECT editing_lock INTO v_current
  FROM public.page_compositions
  WHERE id = _composition_id
  FOR UPDATE;

  v_is_admin := public.has_role(v_user_id, 'admin')
             OR public.has_role(v_user_id, 'super_admin');

  IF public.eb_lock_is_active(v_current)
     AND (v_current->>'user_id')::uuid <> v_user_id
     AND NOT _force THEN
    RETURN jsonb_build_object('acquired', false, 'lock', v_current);
  END IF;

  IF _force AND public.eb_lock_is_active(v_current)
     AND (v_current->>'user_id')::uuid <> v_user_id
     AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden: only admins can force a lock';
  END IF;

  v_new := jsonb_build_object(
    'user_id', v_user_id,
    'user_name', COALESCE(v_user_name, 'Editor'),
    'acquired_at', to_jsonb(now()),
    'heartbeat_at', to_jsonb(now())
  );

  UPDATE public.page_compositions SET editing_lock = v_new WHERE id = _composition_id;

  IF _force AND v_current IS NOT NULL
     AND (v_current->>'user_id')::uuid <> v_user_id THEN
    INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
    VALUES ('page', _composition_id, 'lock.forced', v_user_id,
            jsonb_build_object('previous_lock', v_current, 'new_lock', v_new));
  END IF;

  RETURN jsonb_build_object('acquired', true, 'lock', v_new);
END;
$function$;

CREATE OR REPLACE FUNCTION public.crm_capture_prospect(_session_key text, _first_name text, _phone_e164 text, _language text, _reason text, _destination_slug text, _trip_brief jsonb, _trip_items jsonb, _consent_text text)
 RETURNS TABLE(prospect_id uuid, is_new boolean, reopened boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Un teléfono ya registrado no permite reescribir los datos de esa persona.
    UPDATE public.concierge_prospects SET
      consent_contact = true,
      consent_at = now(),
      consent_text = _consent_text,
      capture_reason = coalesce(capture_reason, _reason),
      destination_slug = coalesce(destination_slug, v_dest),
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
$function$;