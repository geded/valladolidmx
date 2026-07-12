
CREATE TABLE IF NOT EXISTS public.business_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression','click_whatsapp','click_map','click_web','click_phone','alux_mention','share'
  )),
  source TEXT,
  country_code TEXT,
  session_hash TEXT,
  referer TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bve_business_time
  ON public.business_view_events (business_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_bve_business_type_time
  ON public.business_view_events (business_id, event_type, occurred_at DESC);

GRANT SELECT ON public.business_view_events TO authenticated;
GRANT ALL ON public.business_view_events TO service_role;

ALTER TABLE public.business_view_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members read events" ON public.business_view_events;
CREATE POLICY "Business members read events"
  ON public.business_view_events FOR SELECT
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'viewer'::business_user_role));

DROP POLICY IF EXISTS "Admins read all events" ON public.business_view_events;
CREATE POLICY "Admins read all events"
  ON public.business_view_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.record_business_view_event(
  _business_id UUID,
  _event_type TEXT,
  _source TEXT DEFAULT NULL,
  _country_code TEXT DEFAULT NULL,
  _session_hash TEXT DEFAULT NULL,
  _referer TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  IF _event_type NOT IN ('impression','click_whatsapp','click_map','click_web','click_phone','alux_mention','share') THEN
    RAISE EXCEPTION 'invalid event type: %', _event_type;
  END IF;
  INSERT INTO public.business_view_events(
    business_id,event_type,source,country_code,session_hash,referer
  ) VALUES (
    _business_id, _event_type, _source, _country_code, _session_hash, _referer
  ) RETURNING id INTO _id;
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_business_view_event(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_business_presence_report(
  _business_id UUID,
  _window_days INT DEFAULT 30
) RETURNS TABLE(
  total_impressions BIGINT,
  total_whatsapp BIGINT,
  total_map BIGINT,
  total_web BIGINT,
  total_phone BIGINT,
  total_alux BIGINT,
  total_share BIGINT,
  series JSONB,
  top_sources JSONB,
  countries JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since TIMESTAMPTZ := now() - make_interval(days => GREATEST(_window_days,1));
BEGIN
  IF NOT (
    public.has_business_access(auth.uid(), _business_id, 'viewer'::business_user_role)
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT * FROM public.business_view_events
    WHERE business_id = _business_id AND occurred_at >= _since
  ),
  daily AS (
    SELECT date_trunc('day', occurred_at)::date AS d,
           event_type, COUNT(*)::int AS c
    FROM base GROUP BY 1,2
  ),
  daily_json AS (
    SELECT jsonb_agg(jsonb_build_object('date', d, 'event_type', event_type, 'count', c) ORDER BY d) AS s
    FROM daily
  ),
  src AS (
    SELECT COALESCE(source,'directo') AS s, COUNT(*)::int AS c FROM base GROUP BY 1 ORDER BY 2 DESC LIMIT 8
  ),
  cty AS (
    SELECT COALESCE(country_code,'??') AS cc, COUNT(*)::int AS c FROM base GROUP BY 1 ORDER BY 2 DESC LIMIT 8
  )
  SELECT
    (SELECT COUNT(*) FROM base WHERE event_type='impression'),
    (SELECT COUNT(*) FROM base WHERE event_type='click_whatsapp'),
    (SELECT COUNT(*) FROM base WHERE event_type='click_map'),
    (SELECT COUNT(*) FROM base WHERE event_type='click_web'),
    (SELECT COUNT(*) FROM base WHERE event_type='click_phone'),
    (SELECT COUNT(*) FROM base WHERE event_type='alux_mention'),
    (SELECT COUNT(*) FROM base WHERE event_type='share'),
    COALESCE((SELECT s FROM daily_json), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('source', s, 'count', c)) FROM src), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('country_code', cc, 'count', c)) FROM cty), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_presence_report(UUID,INT) TO authenticated;
