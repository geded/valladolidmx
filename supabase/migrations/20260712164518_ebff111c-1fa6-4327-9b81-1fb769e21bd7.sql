CREATE OR REPLACE FUNCTION public.concierge_case_attach_handoff_context(
  _case_id UUID,
  _payload JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_event UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING errcode = '42501';
  END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  INSERT INTO public.concierge_case_timeline (
    case_id, event_type, severity, actor_user_id, summary, payload
  ) VALUES (
    _case_id,
    'Concierge.Handoff.Context',
    'info',
    v_uid,
    'Contexto del viajero adjuntado (Alux -> Concierge)',
    COALESCE(_payload, '{}'::jsonb)
  ) RETURNING id INTO v_event;

  RETURN v_event;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_attach_handoff_context(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_attach_handoff_context(UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_case_get_handoff_context(
  _case_id UUID
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING errcode = '42501';
  END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT id, occurred_at, payload
    INTO v_row
    FROM public.concierge_case_timeline
   WHERE case_id = _case_id
     AND event_type = 'Concierge.Handoff.Context'
   ORDER BY occurred_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'event_id', v_row.id,
    'occurred_at', v_row.occurred_at,
    'payload', v_row.payload
  );
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_get_handoff_context(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_get_handoff_context(UUID) TO authenticated;