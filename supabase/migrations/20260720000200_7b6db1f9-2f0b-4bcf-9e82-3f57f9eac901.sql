-- CV8.9.2 · Action Queue atomic append channel
--
-- No tables or mutable snapshots. This RPC serializes writes per decision and
-- appends the already validated recommendation.lifecycle envelope to the
-- existing visitor_intel.events ledger. Only service_role may execute it;
-- application roles are resolved by authenticated server functions first.

CREATE INDEX IF NOT EXISTS visitor_intel_events_decision_idx
  ON visitor_intel.events (
    ((payload -> 'payload' ->> 'decision_id')),
    occurred_at DESC,
    ingested_at DESC
  )
  WHERE kind = 'recommendation.lifecycle'
    AND payload ->> 'subtype' = 'decision';

CREATE OR REPLACE FUNCTION visitor_intel.append_decision_event(
  _event JSONB,
  _expected_from_state TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, visitor_intel
AS $$
DECLARE
  v_payload JSONB;
  v_event_id UUID;
  v_decision_id UUID;
  v_occurred_at TIMESTAMPTZ;
  v_from_state TEXT;
  v_to_state TEXT;
  v_current_state TEXT;
  v_supersedes_decision_id UUID;
BEGIN
  IF _event ->> 'kind' IS DISTINCT FROM 'recommendation.lifecycle'
     OR _event ->> 'subtype' IS DISTINCT FROM 'decision'
     OR _event ->> 'schema_version' IS DISTINCT FROM '1.0.0' THEN
    RAISE EXCEPTION 'invalid decision event envelope' USING ERRCODE = '22023';
  END IF;

  v_payload := _event -> 'payload';
  IF v_payload IS NULL OR jsonb_typeof(v_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'missing decision payload' USING ERRCODE = '22023';
  END IF;

  v_event_id := (_event ->> 'event_id')::UUID;
  v_decision_id := (v_payload ->> 'decision_id')::UUID;
  v_occurred_at := (_event ->> 'occurred_at')::TIMESTAMPTZ;
  v_from_state := v_payload ->> 'from_state';
  v_to_state := v_payload ->> 'to_state';
  v_supersedes_decision_id := NULLIF(
    v_payload ->> 'supersedes_decision_id',
    ''
  )::UUID;

  IF v_to_state IS NULL OR v_to_state NOT IN (
    'proposed', 'accepted', 'in_progress', 'implemented', 'validated',
    'deferred', 'dismissed', 'blocked', 'rejected'
  ) THEN
    RAISE EXCEPTION 'invalid decision state' USING ERRCODE = '22023';
  END IF;

  IF v_supersedes_decision_id IS NOT NULL AND (
    v_to_state <> 'proposed' OR v_supersedes_decision_id = v_decision_id
  ) THEN
    RAISE EXCEPTION 'invalid supersedes_decision_id' USING ERRCODE = '22023';
  END IF;

  IF (_event -> 'subject' ->> 'subject_id') IS DISTINCT FROM
     ('decision:' || v_decision_id::TEXT)
     OR (_event -> 'subject' ->> 'trust_level') IS DISTINCT FROM 'N4_transactional'
     OR COALESCE((_event -> 'subject' ->> 'is_authenticated')::BOOLEAN, FALSE) IS NOT TRUE
     OR (v_payload ->> 'occurred_at')::TIMESTAMPTZ IS DISTINCT FROM v_occurred_at THEN
    RAISE EXCEPTION 'invalid decision audit identity' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(v_payload ->> 'actor_user_id', '') IS NULL
     OR COALESCE(
       v_payload ->> 'actor_role' NOT IN ('founder', 'admin', 'concierge_lead', 'editor'),
       TRUE
     ) THEN
    RAISE EXCEPTION 'invalid decision actor' USING ERRCODE = '22023';
  END IF;

  IF v_to_state = 'proposed' THEN
    IF v_from_state IS NOT NULL OR _expected_from_state IS NOT NULL THEN
      RAISE EXCEPTION 'proposed must start from null' USING ERRCODE = '22023';
    END IF;
  ELSIF v_from_state IS NULL
     OR v_from_state IS DISTINCT FROM _expected_from_state
     OR NOT (
       (v_from_state = 'proposed' AND v_to_state IN ('accepted', 'deferred', 'dismissed'))
       OR (v_from_state = 'accepted' AND v_to_state IN ('in_progress', 'deferred', 'dismissed'))
       OR (v_from_state = 'in_progress' AND v_to_state IN ('implemented', 'blocked', 'deferred'))
       OR (v_from_state = 'implemented' AND v_to_state IN ('validated', 'rejected'))
       OR (v_from_state = 'deferred' AND v_to_state IN ('accepted', 'dismissed'))
       OR (v_from_state = 'blocked' AND v_to_state IN ('in_progress', 'deferred', 'dismissed'))
     ) THEN
    RAISE EXCEPTION 'invalid decision transition % -> %', v_from_state, v_to_state
      USING ERRCODE = '22023';
  END IF;

  -- One transaction at a time per decision. A correction locks both IDs in a
  -- stable order so supersede and transition cannot race or deadlock.
  IF v_supersedes_decision_id IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_decision_id::TEXT, 0));
  ELSIF v_decision_id::TEXT < v_supersedes_decision_id::TEXT THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_decision_id::TEXT, 0));
    PERFORM pg_advisory_xact_lock(hashtextextended(v_supersedes_decision_id::TEXT, 0));
  ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended(v_supersedes_decision_id::TEXT, 0));
    PERFORM pg_advisory_xact_lock(hashtextextended(v_decision_id::TEXT, 0));
  END IF;

  IF v_supersedes_decision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM visitor_intel.events e
     WHERE e.kind = 'recommendation.lifecycle'
       AND e.payload ->> 'subtype' = 'decision'
       AND e.payload -> 'payload' ->> 'decision_id' = v_supersedes_decision_id::TEXT
  ) THEN
    RAISE EXCEPTION 'superseded decision does not exist' USING ERRCODE = '23503';
  END IF;

  IF v_to_state <> 'proposed' AND EXISTS (
    SELECT 1
      FROM visitor_intel.events e
     WHERE e.kind = 'recommendation.lifecycle'
       AND e.payload ->> 'subtype' = 'decision'
       AND e.payload -> 'payload' ->> 'supersedes_decision_id' = v_decision_id::TEXT
  ) THEN
    RAISE EXCEPTION 'decision has been superseded' USING ERRCODE = '23514';
  END IF;

  SELECT e.payload -> 'payload' ->> 'to_state'
    INTO v_current_state
    FROM visitor_intel.events e
   WHERE e.kind = 'recommendation.lifecycle'
     AND e.payload ->> 'subtype' = 'decision'
     AND e.payload -> 'payload' ->> 'decision_id' = v_decision_id::TEXT
   ORDER BY e.ingested_at DESC, e.occurred_at DESC
   LIMIT 1;

  IF v_current_state IS DISTINCT FROM _expected_from_state THEN
    RAISE EXCEPTION 'stale decision state: expected %, current %',
      _expected_from_state, v_current_state
      USING ERRCODE = '40001';
  END IF;

  -- Database time is authoritative and monotonic with the serialized append.
  v_occurred_at := clock_timestamp();
  _event := jsonb_set(
    jsonb_set(_event, '{occurred_at}', to_jsonb(v_occurred_at)),
    '{payload,occurred_at}',
    to_jsonb(v_occurred_at)
  );

  INSERT INTO visitor_intel.events (
    event_id,
    occurred_at,
    schema_version,
    kind,
    subject_id,
    trust_level,
    is_authenticated,
    locale,
    destination_id,
    surface,
    route,
    travel_stage,
    live_day_phase,
    payload,
    retention_bucket,
    is_simulation,
    simulation_run_id
  ) VALUES (
    v_event_id,
    v_occurred_at,
    '1.0.0',
    'recommendation.lifecycle',
    'decision:' || v_decision_id::TEXT,
    'N4_transactional',
    TRUE,
    NULL,
    NULL,
    'cms:visitor-intel:decisions',
    '/cms/visitor-intel/decisions',
    NULL,
    NULL,
    _event,
    'R_24M',
    FALSE,
    NULL
  );

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION visitor_intel.append_decision_event(JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION visitor_intel.append_decision_event(JSONB, TEXT)
  TO service_role;

COMMENT ON FUNCTION visitor_intel.append_decision_event(JSONB, TEXT) IS
  'CV8.9.2 atomic append-only channel for governed Action Queue decisions.';
