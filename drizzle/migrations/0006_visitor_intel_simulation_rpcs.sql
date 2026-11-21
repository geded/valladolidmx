-- Pruebas con visitantes simulados: lecturas y escrituras a través de funciones
-- internas (sólo service_role), porque el esquema visitor_intel no está expuesto
-- en la Data API.

CREATE OR REPLACE FUNCTION visitor_intel.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, visitor_intel
AS $$
BEGIN
  -- Única excepción: borrar visitas simuladas de la prueba que se está borrando
  -- desde public.visitor_intel_wipe_simulation_run. Las visitas reales nunca.
  IF TG_OP = 'DELETE'
     AND OLD.is_simulation = true
     AND OLD.simulation_run_id IS NOT NULL
     AND OLD.simulation_run_id::text = current_setting('visitor_intel.wipe_run_id', true) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'visitor_intel.events is append-only (op=%, event_id=%)',
    TG_OP,
    COALESCE(OLD.event_id::text, NEW.event_id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.visitor_intel_list_simulation_runs(_limit integer DEFAULT 50)
RETURNS TABLE (
  run_id uuid,
  scenario_id text,
  scenario_version text,
  seed text,
  scale text,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  wiped_at timestamptz,
  rows_inserted jsonb,
  triggered_by uuid,
  error_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
  SELECT r.run_id, r.scenario_id, r.scenario_version, r.seed, r.scale, r.status,
         r.started_at, r.completed_at, r.wiped_at, r.rows_inserted, r.triggered_by,
         r.error_message
    FROM visitor_intel.simulation_runs r
   ORDER BY r.started_at DESC
   LIMIT least(greatest(coalesce(_limit, 50), 1), 200);
$$;

CREATE OR REPLACE FUNCTION public.visitor_intel_create_simulation_run(
  _scenario_id text,
  _scenario_version text,
  _seed text,
  _scale text,
  _scenario_payload jsonb,
  _triggered_by uuid
)
RETURNS uuid
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
  INSERT INTO visitor_intel.simulation_runs
    (scenario_id, scenario_version, seed, scale, scenario_payload, status, started_at, triggered_by)
  VALUES
    (_scenario_id, _scenario_version, _seed, _scale, _scenario_payload, 'running', now(), _triggered_by)
  RETURNING run_id;
$$;

CREATE OR REPLACE FUNCTION public.visitor_intel_insert_simulation_events(_run_id uuid, _rows jsonb)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
DECLARE
  _inserted integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM visitor_intel.simulation_runs WHERE run_id = _run_id AND status = 'running'
  ) THEN
    RAISE EXCEPTION 'Simulation run % is not running', _run_id;
  END IF;

  INSERT INTO visitor_intel.events (
    event_id, occurred_at, schema_version, kind, subject_id, trust_level,
    is_authenticated, locale, destination_id, surface, route, travel_stage,
    live_day_phase, payload, retention_bucket, is_simulation, simulation_run_id
  )
  SELECT (r->>'event_id')::uuid,
         (r->>'occurred_at')::timestamptz,
         r->>'schema_version',
         r->>'kind',
         r->>'subject_id',
         r->>'trust_level',
         coalesce((r->>'is_authenticated')::boolean, false),
         r->>'locale',
         nullif(r->>'destination_id', '')::uuid,
         r->>'surface',
         r->>'route',
         r->>'travel_stage',
         r->>'live_day_phase',
         coalesce(r->'payload', '{}'::jsonb),
         coalesce(r->>'retention_bucket', 'R_30D'),
         true,
         _run_id
    FROM jsonb_array_elements(coalesce(_rows, '[]'::jsonb)) AS r
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.visitor_intel_finish_simulation_run(
  _run_id uuid,
  _status text,
  _rows_inserted jsonb DEFAULT NULL,
  _error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
BEGIN
  IF _status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid final status %', _status;
  END IF;
  UPDATE visitor_intel.simulation_runs
     SET status = _status,
         completed_at = now(),
         rows_inserted = coalesce(_rows_inserted, rows_inserted),
         error_message = left(_error_message, 500)
   WHERE run_id = _run_id
     AND status = 'running';
END;
$$;

CREATE OR REPLACE FUNCTION public.visitor_intel_wipe_simulation_run(_run_id uuid)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, visitor_intel
AS $$
DECLARE
  _deleted bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM visitor_intel.simulation_runs WHERE run_id = _run_id) THEN
    RAISE EXCEPTION 'Simulation run % not found', _run_id;
  END IF;

  PERFORM set_config('visitor_intel.wipe_run_id', _run_id::text, true);
  DELETE FROM visitor_intel.events
   WHERE simulation_run_id = _run_id
     AND is_simulation = true;
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  PERFORM set_config('visitor_intel.wipe_run_id', '', true);

  UPDATE visitor_intel.simulation_runs
     SET status = 'wiped', wiped_at = now()
   WHERE run_id = _run_id;

  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.visitor_intel_list_simulation_runs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.visitor_intel_create_simulation_run(text, text, text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.visitor_intel_insert_simulation_events(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.visitor_intel_finish_simulation_run(uuid, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.visitor_intel_wipe_simulation_run(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_intel_list_simulation_runs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.visitor_intel_create_simulation_run(text, text, text, text, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.visitor_intel_insert_simulation_events(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.visitor_intel_finish_simulation_run(uuid, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.visitor_intel_wipe_simulation_run(uuid) TO service_role;
