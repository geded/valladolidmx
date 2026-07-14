ALTER TABLE visitor_intel.events DROP CONSTRAINT visitor_intel_events_kind_chk;
ALTER TABLE visitor_intel.events ADD CONSTRAINT visitor_intel_events_kind_chk
  CHECK (kind = ANY (ARRAY['journey.transition','intent.signal','decision.offered','outcome.observed','recommendation.lifecycle']));
CREATE INDEX IF NOT EXISTS visitor_intel_events_recommendation_idx
  ON visitor_intel.events (((payload -> 'recommendation') ->> 'recommendation_id'), occurred_at DESC)
  WHERE kind = 'recommendation.lifecycle';