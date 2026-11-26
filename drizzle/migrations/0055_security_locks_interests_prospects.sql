CREATE OR REPLACE FUNCTION public.eb_heartbeat_edit_lock(_composition_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_current jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  SELECT editing_lock INTO v_current FROM public.page_compositions WHERE id = _composition_id FOR UPDATE;
  IF v_current IS NULL OR (v_current->>'user_id')::uuid <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'lock', NULL);
  END IF;
  v_current := jsonb_set(v_current, '{heartbeat_at}', to_jsonb(now()));
  UPDATE public.page_compositions SET editing_lock = v_current WHERE id = _composition_id;
  RETURN jsonb_build_object('ok', true, 'lock', v_current);
END;
$function$;

CREATE OR REPLACE FUNCTION public.concierge_traveler_interests(_case_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_traveler uuid; v_memory jsonb := NULL; v_favorites jsonb := '[]'; v_planned jsonb := '[]';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT public.concierge_is_internal(v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT traveler_user_id INTO v_traveler FROM public.concierge_cases WHERE id = _case_id;
  IF v_traveler IS NULL THEN RETURN jsonb_build_object('has_traveler', false); END IF;
  SELECT summary INTO v_memory FROM public.traveler_memory_projection
    WHERE user_id = v_traveler AND personalization = 'active' AND (expires_at IS NULL OR expires_at > now());
  SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]') INTO v_favorites FROM (
    SELECT tf.entity_kind::text AS kind, tf.entity_id, tf.created_at,
      COALESCE(b.display_name, p.name, poi.name, e.title, r.name) AS label
    FROM public.traveler_favorites tf
      LEFT JOIN public.businesses b ON tf.entity_kind='business' AND b.id=tf.entity_id
      LEFT JOIN public.products p ON tf.entity_kind='product' AND p.id=tf.entity_id
      LEFT JOIN public.points_of_interest poi ON tf.entity_kind='place' AND poi.id=tf.entity_id
      LEFT JOIN public.events e ON tf.entity_kind='event' AND e.id=tf.entity_id
      LEFT JOIN public.editorial_routes r ON tf.entity_kind='route' AND r.id=tf.entity_id
    WHERE tf.user_id = v_traveler ORDER BY tf.created_at DESC LIMIT 30) f;
  SELECT COALESCE(jsonb_agg(row_to_json(i)), '[]') INTO v_planned FROM (
    SELECT tpi.item_kind::text AS kind, tpi.target_id AS entity_id,
      COALESCE(tpi.snapshot->>'title', tpi.snapshot->>'name') AS label
    FROM public.travel_plan_items tpi JOIN public.travel_plans tp ON tp.id = tpi.plan_id
    WHERE tp.user_id = v_traveler LIMIT 80) i;
  RETURN jsonb_build_object('has_traveler', true, 'memory', v_memory, 'favorites', v_favorites, 'planned', v_planned);
END; $function$;

CREATE OR REPLACE FUNCTION public.crm_capture_prospect(_session_key text, _first_name text, _phone_e164 text, _language text, _reason text, _destination_slug text, _trip_brief jsonb, _trip_items jsonb, _consent_text text)
  RETURNS TABLE(prospect_id uuid, is_new boolean, reopened boolean)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_session public.alux_public_sessions%ROWTYPE;
  v_id uuid;
  v_event_id text;
  v_alt text;
  v_temp text;
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
  UPDATE public.alux_public_sessions SET contact_capture_count = contact_capture_count + 1 WHERE id = v_session.id;
  IF EXISTS (SELECT 1 FROM public.concierge_prospects p WHERE p.phone_e164 = _phone_e164) THEN
    RETURN QUERY SELECT NULL::uuid, false, false;
    RETURN;
  END IF;
  v_temp := CASE WHEN _reason IN ('price','booking','concierge') THEN 'caliente' ELSE 'tibio' END;
  INSERT INTO public.concierge_prospects (
    source, first_name, phone_e164, language, consent_contact, consent_at, consent_text,
    temperature, capture_reason, destination_slug, trip_brief, trip_items
  ) VALUES (
    'alux_web', btrim(_first_name), _phone_e164, coalesce(_language, 'es'), true, now(), _consent_text,
    v_temp, _reason, v_dest, v_brief, v_items
  ) RETURNING id INTO v_id;
  INSERT INTO public.concierge_prospect_events (prospect_id, kind, meta)
  VALUES (v_id, 'created', jsonb_build_object('source', 'alux_web', 'reason', _reason, 'session_id', v_session.id));
  UPDATE public.alux_public_sessions SET prospect_id = v_id WHERE id = v_session.id;
  v_event_id := 'crm-prospect-created:' || v_id::text;
  v_alt := btrim(_first_name) || ' dejó su WhatsApp con Alux' ||
           CASE WHEN v_dest IS NOT NULL THEN ' · ' || v_dest ELSE '' END;
  FOR r IN SELECT DISTINCT ur.user_id FROM public.user_roles ur
           WHERE ur.role IN ('concierge','concierge_lead','admin','super_admin') LOOP
    PERFORM public.unc_publish_in_app(
      v_event_id, 'CRM.Prospect.Created', r.user_id, 'concierge', 'operational'::notification_category,
      jsonb_build_object('url', '/concierge/prospectos/' || v_id::text, 'alt_text', v_alt, 'prospect_id', v_id)
    );
    INSERT INTO public.notification_deliveries (
      event_id, event_type, category, channel, recipient_user_id, audience, status, payload_ref
    ) VALUES (
      v_event_id, 'CRM.Prospect.Created', 'operational', 'push', r.user_id, 'concierge', 'pending',
      jsonb_build_object('url', '/concierge/prospectos/' || v_id::text, 'alt_text', v_alt, 'prospect_id', v_id)
    ) ON CONFLICT (event_id, channel, recipient_user_id) DO NOTHING;
  END LOOP;
  RETURN QUERY SELECT v_id, true, false;
END;
$function$;