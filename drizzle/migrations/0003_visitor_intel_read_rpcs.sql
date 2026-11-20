CREATE OR REPLACE FUNCTION public.visitor_intel_read_events(
  _since timestamptz DEFAULT NULL,
  _kind text DEFAULT NULL,
  _mode text DEFAULT 'all',
  _simulation_run_id uuid DEFAULT NULL,
  _route_prefix text DEFAULT NULL,
  _subject_id text DEFAULT NULL,
  _subject_prefix text DEFAULT NULL,
  _offset integer DEFAULT 0,
  _limit integer DEFAULT 1000
)
RETURNS TABLE (
  event_id uuid,
  occurred_at timestamptz,
  ingested_at timestamptz,
  kind text,
  subject_id text,
  surface text,
  route text,
  locale text,
  is_simulation boolean,
  simulation_run_id uuid,
  payload jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
  SELECT e.event_id, e.occurred_at, e.ingested_at, e.kind, e.subject_id, e.surface,
         e.route, e.locale, e.is_simulation, e.simulation_run_id, e.payload
    FROM visitor_intel.events e
   WHERE (_since IS NULL OR e.occurred_at >= _since)
     AND (_kind IS NULL OR e.kind = _kind)
     AND (_subject_id IS NULL OR e.subject_id = _subject_id)
     AND (_subject_prefix IS NULL OR left(e.subject_id, length(_subject_prefix)) = _subject_prefix)
     AND (_route_prefix IS NULL OR left(e.route, length(_route_prefix)) = _route_prefix)
     AND CASE coalesce(_mode, 'all')
           WHEN 'real' THEN e.is_simulation = false
           WHEN 'simulation' THEN e.is_simulation = true
             AND (_simulation_run_id IS NULL OR e.simulation_run_id = _simulation_run_id)
           WHEN 'combined' THEN (_simulation_run_id IS NULL OR e.is_simulation = false
             OR e.simulation_run_id = _simulation_run_id)
           ELSE true
         END
   ORDER BY e.occurred_at, e.ingested_at, e.event_id
  OFFSET greatest(coalesce(_offset, 0), 0)
   LIMIT least(greatest(coalesce(_limit, 1000), 1), 1000);
$$;

REVOKE ALL ON FUNCTION public.visitor_intel_read_events(timestamptz, text, text, uuid, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_intel_read_events(timestamptz, text, text, uuid, text, text, text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.visitor_intel_count_events(
  _since timestamptz DEFAULT NULL,
  _kind text DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
  SELECT count(*)
    FROM visitor_intel.events e
   WHERE (_since IS NULL OR e.occurred_at >= _since)
     AND (_kind IS NULL OR e.kind = _kind);
$$;

REVOKE ALL ON FUNCTION public.visitor_intel_count_events(timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_intel_count_events(timestamptz, text) TO service_role;

CREATE OR REPLACE FUNCTION public.visitor_intel_append_decision_event(
  _event jsonb,
  _expected_from_state text
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
  SELECT visitor_intel.append_decision_event(_event, _expected_from_state);
$$;

REVOKE ALL ON FUNCTION public.visitor_intel_append_decision_event(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_intel_append_decision_event(jsonb, text) TO service_role;