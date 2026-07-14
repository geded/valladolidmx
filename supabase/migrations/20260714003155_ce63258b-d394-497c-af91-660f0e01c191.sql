-- CV8.1 · Journey Event Ingestion — visitor_intel domain (append-only)

CREATE SCHEMA IF NOT EXISTS visitor_intel;

-- Lock the schema to service_role only. No anon/authenticated USAGE.
REVOKE ALL ON SCHEMA visitor_intel FROM PUBLIC;
REVOKE ALL ON SCHEMA visitor_intel FROM anon, authenticated;
GRANT USAGE ON SCHEMA visitor_intel TO service_role;

-- --------------------------------------------------------------------------
-- Table: visitor_intel.events (append-only)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitor_intel.events (
  event_id           UUID PRIMARY KEY,
  occurred_at        TIMESTAMPTZ NOT NULL,
  ingested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  schema_version     TEXT NOT NULL,
  kind               TEXT NOT NULL,
  subject_id         TEXT NOT NULL,
  trust_level        TEXT NOT NULL,
  is_authenticated   BOOLEAN NOT NULL,
  locale             TEXT NULL,
  destination_id     UUID NULL,
  surface            TEXT NOT NULL,
  route              TEXT NOT NULL,
  travel_stage       TEXT NULL,
  live_day_phase     TEXT NULL,
  payload            JSONB NOT NULL,
  retention_bucket   TEXT NOT NULL,
  CONSTRAINT visitor_intel_events_schema_version_chk
    CHECK (schema_version = '1.0.0'),
  CONSTRAINT visitor_intel_events_kind_chk
    CHECK (kind IN ('journey.transition','intent.signal','decision.offered','outcome.observed')),
  CONSTRAINT visitor_intel_events_trust_level_chk
    CHECK (trust_level IN ('N0_anonymous','N1_continuity','N2_personalization','N3_operational','N4_transactional')),
  CONSTRAINT visitor_intel_events_retention_chk
    CHECK (retention_bucket IN ('R_30D','R_180D','R_24M'))
);

-- Grants: only service_role touches this table.
REVOKE ALL ON TABLE visitor_intel.events FROM PUBLIC;
REVOKE ALL ON TABLE visitor_intel.events FROM anon, authenticated;
GRANT INSERT, SELECT ON TABLE visitor_intel.events TO service_role;

-- RLS on to double-lock even if a future grant is accidentally added.
ALTER TABLE visitor_intel.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_intel.events FORCE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => zero access from Data API.
-- Explicit service_role bypass policy is not needed (service_role bypasses RLS by default),
-- but we add a permissive INSERT policy for service_role for auditability.
DROP POLICY IF EXISTS "service_role can insert" ON visitor_intel.events;
CREATE POLICY "service_role can insert" ON visitor_intel.events
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "service_role can select" ON visitor_intel.events;
CREATE POLICY "service_role can select" ON visitor_intel.events
  FOR SELECT TO service_role USING (true);

-- --------------------------------------------------------------------------
-- Append-only enforcement (Founder Signal Quality · Regla de Evolución)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION visitor_intel.reject_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, visitor_intel
AS $$
BEGIN
  RAISE EXCEPTION 'visitor_intel.events is append-only (op=%, event_id=%)',
    TG_OP,
    COALESCE(OLD.event_id::text, NEW.event_id::text);
END;
$$;

DROP TRIGGER IF EXISTS visitor_intel_events_no_update ON visitor_intel.events;
CREATE TRIGGER visitor_intel_events_no_update
  BEFORE UPDATE ON visitor_intel.events
  FOR EACH ROW EXECUTE FUNCTION visitor_intel.reject_mutation();

DROP TRIGGER IF EXISTS visitor_intel_events_no_delete ON visitor_intel.events;
CREATE TRIGGER visitor_intel_events_no_delete
  BEFORE DELETE ON visitor_intel.events
  FOR EACH ROW EXECUTE FUNCTION visitor_intel.reject_mutation();

-- --------------------------------------------------------------------------
-- Retention bucket derivation (trust_level -> bucket) on insert
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION visitor_intel.set_retention_bucket()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, visitor_intel
AS $$
BEGIN
  IF NEW.trust_level = 'N0_anonymous' THEN
    NEW.retention_bucket := 'R_30D';
  ELSIF NEW.trust_level IN ('N1_continuity','N2_personalization') THEN
    NEW.retention_bucket := 'R_180D';
  ELSE
    NEW.retention_bucket := 'R_24M';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visitor_intel_events_set_bucket ON visitor_intel.events;
CREATE TRIGGER visitor_intel_events_set_bucket
  BEFORE INSERT ON visitor_intel.events
  FOR EACH ROW EXECUTE FUNCTION visitor_intel.set_retention_bucket();

-- --------------------------------------------------------------------------
-- Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS visitor_intel_events_occurred_at_idx
  ON visitor_intel.events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS visitor_intel_events_subject_idx
  ON visitor_intel.events (subject_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS visitor_intel_events_kind_idx
  ON visitor_intel.events (kind, occurred_at DESC);

CREATE INDEX IF NOT EXISTS visitor_intel_events_transition_idx
  ON visitor_intel.events (((payload -> 'transition' ->> 'id')))
  WHERE kind = 'journey.transition';

CREATE INDEX IF NOT EXISTS visitor_intel_events_trust_idx
  ON visitor_intel.events (trust_level, occurred_at DESC);

COMMENT ON SCHEMA visitor_intel IS
  'CV8 Visitor Intelligence Platform — dominio append-only. Sólo service_role. Contratos en src/lib/visitor-intel/*.';
COMMENT ON TABLE visitor_intel.events IS
  'CV8.1 · Journey Event Ingestion. Append-only por trigger. schema_version=1.0.0.';