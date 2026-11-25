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
    v_reopened := false;
    UPDATE public.concierge_prospects SET last_activity_at = now() WHERE id = v_id;
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