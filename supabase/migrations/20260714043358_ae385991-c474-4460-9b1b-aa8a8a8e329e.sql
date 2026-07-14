-- CV8.S.1 · Contratos y Aislamiento
-- Founder Simulation Isolation Principle: toda fila simulada queda marcada
-- e identificable inequívocamente, y puede ser eliminada por run_id sin
-- afectar filas reales.

-- 1. Catálogo de corridas de simulación (fuente única de metadatos).
CREATE TABLE IF NOT EXISTS visitor_intel.simulation_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id text NOT NULL,
  scenario_version text NOT NULL,
  seed text NOT NULL,
  scale text NOT NULL CHECK (scale IN ('light', 'medium', 'full')),
  scenario_payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'wiped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  wiped_at timestamptz,
  rows_inserted jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by uuid,
  error_message text
);

CREATE INDEX IF NOT EXISTS simulation_runs_status_idx
  ON visitor_intel.simulation_runs(status, started_at DESC);

ALTER TABLE visitor_intel.simulation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role can manage simulation_runs"
  ON visitor_intel.simulation_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Aislamiento en visitor_intel.events (única tabla poblada por CV8.S.1).
--    Sub-olas siguientes (S.3) añadirán columnas equivalentes en tablas
--    afectadas (concierge_orders, travel_plans, reviews, etc.).
ALTER TABLE visitor_intel.events
  ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS simulation_run_id uuid
    REFERENCES visitor_intel.simulation_runs(run_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS visitor_intel_events_simulation_idx
  ON visitor_intel.events(simulation_run_id)
  WHERE is_simulation = true;

CREATE INDEX IF NOT EXISTS visitor_intel_events_real_idx
  ON visitor_intel.events(occurred_at DESC)
  WHERE is_simulation = false;

-- 3. Guardrail: is_simulation=true exige simulation_run_id no nulo, y viceversa.
--    Se usa trigger porque un CHECK con subselects/tiempo no es válido.
CREATE OR REPLACE FUNCTION visitor_intel.validate_simulation_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_simulation = true AND NEW.simulation_run_id IS NULL THEN
    RAISE EXCEPTION 'Simulation row requires simulation_run_id';
  END IF;
  IF NEW.is_simulation = false AND NEW.simulation_run_id IS NOT NULL THEN
    RAISE EXCEPTION 'Non-simulation row must not carry simulation_run_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visitor_intel_events_validate_sim ON visitor_intel.events;
CREATE TRIGGER visitor_intel_events_validate_sim
  BEFORE INSERT ON visitor_intel.events
  FOR EACH ROW EXECUTE FUNCTION visitor_intel.validate_simulation_flag();

-- 4. Wipe seguro por run_id. Sólo borra filas simuladas de ese run.
CREATE OR REPLACE FUNCTION visitor_intel.wipe_simulation_run(_run_id uuid)
RETURNS TABLE(events_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted bigint := 0;
BEGIN
  -- Bypass del trigger append-only sólo para filas simuladas de este run.
  SET LOCAL session_replication_role = 'replica';
  DELETE FROM visitor_intel.events
   WHERE simulation_run_id = _run_id AND is_simulation = true;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  SET LOCAL session_replication_role = 'origin';

  UPDATE visitor_intel.simulation_runs
     SET status = 'wiped', wiped_at = now()
   WHERE run_id = _run_id;

  RETURN QUERY SELECT v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION visitor_intel.wipe_simulation_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION visitor_intel.wipe_simulation_run(uuid) TO service_role;

COMMENT ON TABLE visitor_intel.simulation_runs IS
  'CV8.S · Catálogo de corridas de simulación. Toda fila is_simulation=true en tablas afectadas apunta aquí. Wipe reversible por run_id.';
COMMENT ON COLUMN visitor_intel.events.is_simulation IS
  'Founder Simulation Isolation Principle: true = fila generada por Simulation Pack, nunca confundible con producción.';