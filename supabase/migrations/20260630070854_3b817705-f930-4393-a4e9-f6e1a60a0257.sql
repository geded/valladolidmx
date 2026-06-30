
-- =============================================================
-- 14.60.6 — Alux Intelligence · Asistente del Concierge (read-only)
-- Aditivo: 2 RPCs nuevas. Sin tablas. Sin cambios de RLS.
-- =============================================================

-- 1) Contexto del expediente para Alux (lectura) -----------------
CREATE OR REPLACE FUNCTION public.concierge_alux_context_for_case(_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_file jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden_case_access';
  END IF;

  -- Reutiliza el proyector canónico del Customer Case File.
  v_file := public.concierge_case_file_v1(_case_id);

  -- Snapshot ligero adicional: actividad reciente acotada para limitar
  -- el contexto enviado al modelo (últimos 30 eventos).
  RETURN jsonb_build_object(
    'case_file', v_file,
    'recent_timeline', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'event_type', t.event_type,
        'severity',   t.severity,
        'summary',    t.summary,
        'occurred_at', t.occurred_at
      ) ORDER BY t.occurred_at DESC)
      FROM (
        SELECT event_type, severity, summary, occurred_at
        FROM public.concierge_case_timeline
        WHERE case_id = _case_id
        ORDER BY occurred_at DESC
        LIMIT 30
      ) t
    ), '[]'::jsonb),
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.concierge_alux_context_for_case(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_alux_context_for_case(uuid) TO authenticated;


-- 2) Log de sugerencias de Alux ----------------------------------
CREATE OR REPLACE FUNCTION public.concierge_alux_log_suggestion(
  _case_id     uuid,
  _capability  text,
  _meta        jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden_case_access';
  END IF;
  IF _capability IS NULL OR _capability NOT IN (
    'summary',
    'products',
    'proposal_draft',
    'comms_digest',
    'risk_detection',
    'opportunity_detection'
  ) THEN
    RAISE EXCEPTION 'invalid_capability';
  END IF;

  INSERT INTO public.concierge_case_timeline(
    case_id, event_type, severity, actor_user_id, summary, payload, occurred_at
  )
  VALUES (
    _case_id,
    'Alux.Suggestion.Generated',
    'info',
    v_uid,
    'Sugerencia Alux: ' || _capability,
    COALESCE(_meta, '{}'::jsonb) || jsonb_build_object('capability', _capability),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.concierge_alux_log_suggestion(uuid, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_alux_log_suggestion(uuid, text, jsonb) TO authenticated;
