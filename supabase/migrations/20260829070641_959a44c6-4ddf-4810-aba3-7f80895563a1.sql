CREATE OR REPLACE FUNCTION public.visitor_intel_ingest_event(p_row JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
DECLARE
  v_inserted BOOLEAN := FALSE;
BEGIN
  INSERT INTO visitor_intel.events (
    event_id, occurred_at, schema_version, kind, subject_id, trust_level,
    is_authenticated, locale, destination_id, surface, route, travel_stage,
    live_day_phase, payload, retention_bucket
  )
  VALUES (
    (p_row->>'event_id')::uuid,
    (p_row->>'occurred_at')::timestamptz,
    p_row->>'schema_version',
    p_row->>'kind',
    p_row->>'subject_id',
    p_row->>'trust_level',
    COALESCE((p_row->>'is_authenticated')::boolean, FALSE),
    NULLIF(p_row->>'locale', ''),
    NULLIF(p_row->>'destination_id', '')::uuid,
    p_row->>'surface',
    p_row->>'route',
    NULLIF(p_row->>'travel_stage', ''),
    NULLIF(p_row->>'live_day_phase', ''),
    p_row->'payload',
    COALESCE(NULLIF(p_row->>'retention_bucket', ''), 'R_30D')
  )
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.visitor_intel_ingest_event(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_intel_ingest_event(JSONB) TO service_role;