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
    SELECT e.grant_id AS g, e.surface AS surface, e.event_type AS event_type, e.occurred_at AS occurred_at
    FROM public.business_view_events e
    WHERE e.occurred_at >= _from AND e.grant_id IS NOT NULL
  ),
  agg AS (
    SELECT ev.g AS g,
           count(*) FILTER (WHERE ev.event_type = 'impression') AS imp,
           count(*) FILTER (WHERE ev.event_type <> 'impression') AS clk,
           max(ev.occurred_at) AS seen
    FROM ev GROUP BY ev.g
  ),
  persurface AS (
    SELECT ev.g AS g,
           coalesce(ev.surface, 'sin-superficie') AS surface,
           count(*) FILTER (WHERE ev.event_type = 'impression') AS imp,
           count(*) FILTER (WHERE ev.event_type <> 'impression') AS clk
    FROM ev GROUP BY ev.g, coalesce(ev.surface, 'sin-superficie')
  ),
  bysurface AS (
    SELECT persurface.g AS g,
           jsonb_agg(jsonb_build_object(
             'surface', persurface.surface,
             'impressions', persurface.imp,
             'clicks', persurface.clk
           ) ORDER BY persurface.imp DESC) AS surfaces
    FROM persurface GROUP BY persurface.g
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
  ORDER BY coalesce(a.imp, 0) DESC, gr.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_visibility_performance(integer) TO authenticated, service_role;