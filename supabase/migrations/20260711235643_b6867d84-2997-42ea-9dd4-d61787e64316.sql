DROP VIEW IF EXISTS public.business_effective_visibility;
DROP FUNCTION IF EXISTS public.get_business_active_plan(uuid);

CREATE FUNCTION public.get_business_active_plan(_business_id uuid)
RETURNS TABLE (
  grant_id uuid,
  plan_id uuid,
  plan_slug text,
  plan_name text,
  badge_variant text,
  color_token text,
  starts_at timestamptz,
  expires_at timestamptz,
  cycle text,
  levers jsonb,
  limits jsonb,
  base_price_mxn numeric,
  is_default boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, p.id, p.slug, p.name, p.badge_variant, p.color_token,
         g.starts_at, g.expires_at, g.cycle,
         COALESCE(p.visibility_levers, '{}'::jsonb),
         COALESCE(p.limits, '{}'::jsonb),
         p.base_price_mxn, false
  FROM public.business_visibility_grants g
  JOIN public.visibility_plans p ON p.id = g.plan_id
  WHERE g.business_id = _business_id
    AND g.status = 'active'
    AND (g.expires_at IS NULL OR g.expires_at > now())
  ORDER BY p.base_price_mxn DESC NULLS LAST, g.starts_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT NULL::uuid, p.id, p.slug, p.name, p.badge_variant, p.color_token,
           NULL::timestamptz, NULL::timestamptz, NULL::text,
           COALESCE(p.visibility_levers, '{}'::jsonb),
           COALESCE(p.limits, '{}'::jsonb),
           p.base_price_mxn, true
    FROM public.visibility_plans p
    WHERE p.is_active = true
    ORDER BY p.base_price_mxn ASC NULLS LAST, p.display_order ASC
    LIMIT 1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_active_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_active_plan(uuid) TO authenticated, anon, service_role;

CREATE VIEW public.business_effective_visibility
WITH (security_invoker = on)
AS
SELECT b.id AS business_id, b.slug AS business_slug,
       ap.plan_id, ap.plan_slug, ap.plan_name,
       ap.badge_variant, ap.color_token,
       ap.starts_at, ap.expires_at, ap.cycle,
       ap.levers, ap.limits, ap.base_price_mxn,
       ap.is_default, ap.grant_id
FROM public.businesses b
LEFT JOIN LATERAL public.get_business_active_plan(b.id) ap ON true;

GRANT SELECT ON public.business_effective_visibility TO authenticated, anon, service_role;