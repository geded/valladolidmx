ALTER TABLE public.business_view_events
  ADD COLUMN IF NOT EXISTS surface text,
  ADD COLUMN IF NOT EXISTS rail text,
  ADD COLUMN IF NOT EXISTS placement text,
  ADD COLUMN IF NOT EXISTS grant_id uuid REFERENCES public.business_visibility_grants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_kind text,
  ADD COLUMN IF NOT EXISTS entity_id uuid;

ALTER TABLE public.business_view_events DROP CONSTRAINT IF EXISTS business_view_events_placement_check;
ALTER TABLE public.business_view_events
  ADD CONSTRAINT business_view_events_placement_check
  CHECK (placement IS NULL OR placement IN ('contratado','fijado','editorial','organico'));

ALTER TABLE public.business_view_events DROP CONSTRAINT IF EXISTS business_view_events_event_type_check;
ALTER TABLE public.business_view_events
  ADD CONSTRAINT business_view_events_event_type_check
  CHECK (event_type IN ('impression','click_card','click_whatsapp','click_map','click_web','click_phone','alux_mention','share'));

CREATE INDEX IF NOT EXISTS idx_bve_grant_time
  ON public.business_view_events (grant_id, occurred_at DESC) WHERE grant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bve_placement_time
  ON public.business_view_events (placement, occurred_at DESC) WHERE placement IS NOT NULL;

DROP FUNCTION IF EXISTS public.record_business_view_event(uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.record_business_view_event(
  _business_id uuid,
  _event_type text,
  _source text DEFAULT NULL,
  _country_code text DEFAULT NULL,
  _session_hash text DEFAULT NULL,
  _referer text DEFAULT NULL,
  _surface text DEFAULT NULL,
  _rail text DEFAULT NULL,
  _placement text DEFAULT NULL,
  _grant_id uuid DEFAULT NULL,
  _entity_kind text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _id UUID;
BEGIN
  IF _event_type NOT IN ('impression','click_card','click_whatsapp','click_map','click_web','click_phone','alux_mention','share') THEN
    RAISE EXCEPTION 'invalid event type: %', _event_type;
  END IF;
  IF _placement IS NOT NULL AND _placement NOT IN ('contratado','fijado','editorial','organico') THEN
    RAISE EXCEPTION 'invalid placement: %', _placement;
  END IF;
  INSERT INTO public.business_view_events(
    business_id, event_type, source, country_code, session_hash, referer,
    surface, rail, placement, grant_id, entity_kind, entity_id
  ) VALUES (
    _business_id, _event_type, _source, _country_code, _session_hash, _referer,
    left(_surface, 80), left(_rail, 80), _placement, _grant_id, left(_entity_kind, 40), _entity_id
  ) RETURNING id INTO _id;
  RETURN _id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_business_view_event(uuid, text, text, text, text, text, text, text, text, uuid, text, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_visibility_performance(_window_days integer DEFAULT 30)
RETURNS TABLE (
  grant_id uuid,
  business_id uuid,
  business_name text,
  business_slug text,
  plan_slug text,
  plan_name text,
  status text,
  starts_at timestamptz,
  expires_at timestamptz,
  impressions bigint,
  clicks bigint,
  last_seen timestamptz,
  surfaces jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _from timestamptz := now() - make_interval(days => greatest(coalesce(_window_days, 30), 1));
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH ev AS (
    SELECT e.grant_id, e.business_id, e.surface, e.event_type, e.occurred_at
    FROM public.business_view_events e
    WHERE e.occurred_at >= _from AND e.grant_id IS NOT NULL
  ),
  agg AS (
    SELECT ev.grant_id AS g,
           count(*) FILTER (WHERE ev.event_type = 'impression') AS imp,
           count(*) FILTER (WHERE ev.event_type <> 'impression') AS clk,
           max(ev.occurred_at) AS seen
    FROM ev GROUP BY ev.grant_id
  ),
  bysurface AS (
    SELECT ev.grant_id AS g,
           jsonb_agg(jsonb_build_object(
             'surface', coalesce(s.surface, 'sin-superficie'),
             'impressions', s.imp,
             'clicks', s.clk
           ) ORDER BY s.imp DESC) AS surfaces
    FROM (
      SELECT ev.grant_id, ev.surface,
             count(*) FILTER (WHERE ev.event_type = 'impression') AS imp,
             count(*) FILTER (WHERE ev.event_type <> 'impression') AS clk
      FROM ev GROUP BY ev.grant_id, ev.surface
    ) s
    JOIN ev ON ev.grant_id = s.grant_id
    GROUP BY ev.grant_id
  )
  SELECT gr.id,
         gr.business_id,
         b.name,
         b.slug,
         p.slug,
         p.name,
         gr.status,
         gr.starts_at,
         gr.expires_at,
         coalesce(a.imp, 0),
         coalesce(a.clk, 0),
         a.seen,
         coalesce(bs.surfaces, '[]'::jsonb)
  FROM public.business_visibility_grants gr
  LEFT JOIN public.businesses b ON b.id = gr.business_id
  LEFT JOIN public.visibility_plans p ON p.id = gr.plan_id
  LEFT JOIN agg a ON a.g = gr.id
  LEFT JOIN bysurface bs ON bs.g = gr.id
  WHERE gr.status IN ('active','pending','expired','cancelled')
  ORDER BY coalesce(a.imp, 0) DESC, gr.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_visibility_performance(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.business_visibility_performance(_business_id uuid, _window_days integer DEFAULT 30)
RETURNS TABLE (
  surface text,
  placement text,
  impressions bigint,
  clicks bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _from timestamptz := now() - make_interval(days => greatest(coalesce(_window_days, 30), 1));
BEGIN
  IF NOT (
    has_business_access(auth.uid(), _business_id, 'viewer'::business_user_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT coalesce(e.surface, 'sin-superficie'),
         coalesce(e.placement, 'organico'),
         count(*) FILTER (WHERE e.event_type = 'impression'),
         count(*) FILTER (WHERE e.event_type <> 'impression')
  FROM public.business_view_events e
  WHERE e.business_id = _business_id
    AND e.occurred_at >= _from
  GROUP BY 1, 2
  ORDER BY 3 DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.business_visibility_performance(uuid, integer) TO authenticated, service_role;