-- Sub-ola 7.3.a: Motor de vigencia de grants + get_business_active_plan

-- 1) Función para expirar grants vencidos
CREATE OR REPLACE FUNCTION public.expire_visibility_grants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.business_visibility_grants
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- 2) Función que devuelve el plan activo efectivo (o el básico por defecto)
CREATE OR REPLACE FUNCTION public.get_business_active_plan(_business_id uuid)
RETURNS TABLE (
  grant_id uuid,
  plan_id uuid,
  plan_code text,
  plan_name text,
  tier text,
  starts_at timestamptz,
  expires_at timestamptz,
  cycle_months integer,
  levers jsonb,
  limits jsonb,
  is_default boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Expira los grants vencidos on-the-fly (barato: filtra por expires_at)
  -- No actualizamos aquí para mantener STABLE; el cron lo hace.

  RETURN QUERY
  SELECT
    g.id,
    p.id,
    p.code,
    p.name,
    p.tier,
    g.starts_at,
    g.expires_at,
    g.cycle_months,
    COALESCE(g.levers_override, p.levers, '{}'::jsonb),
    COALESCE(p.limits, '{}'::jsonb),
    false
  FROM public.business_visibility_grants g
  JOIN public.visibility_plans p ON p.id = g.plan_id
  WHERE g.business_id = _business_id
    AND g.status = 'active'
    AND (g.expires_at IS NULL OR g.expires_at > now())
  ORDER BY p.tier_rank DESC NULLS LAST, g.starts_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      NULL::uuid,
      p.id,
      p.code,
      p.name,
      p.tier,
      NULL::timestamptz,
      NULL::timestamptz,
      NULL::integer,
      COALESCE(p.levers, '{}'::jsonb),
      COALESCE(p.limits, '{}'::jsonb),
      true
    FROM public.visibility_plans p
    WHERE p.is_default = true
      AND p.is_active = true
    ORDER BY p.tier_rank ASC NULLS LAST
    LIMIT 1;
  END IF;
END;
$$;

-- 3) Vista de visibilidad efectiva por empresa
CREATE OR REPLACE VIEW public.business_effective_visibility AS
SELECT
  b.id AS business_id,
  b.slug AS business_slug,
  ap.plan_id,
  ap.plan_code,
  ap.plan_name,
  ap.tier,
  ap.starts_at,
  ap.expires_at,
  ap.cycle_months,
  ap.levers,
  ap.limits,
  ap.is_default,
  ap.grant_id
FROM public.businesses b
LEFT JOIN LATERAL public.get_business_active_plan(b.id) ap ON true;

GRANT SELECT ON public.business_effective_visibility TO authenticated, anon, service_role;

-- 4) Cron: expira grants cada hora
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expire-visibility-grants-hourly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-visibility-grants-hourly');

    PERFORM cron.schedule(
      'expire-visibility-grants-hourly',
      '5 * * * *',
      $cron$ SELECT public.expire_visibility_grants(); $cron$
    );
  END IF;
END $$;

-- 5) Permisos de ejecución
REVOKE ALL ON FUNCTION public.expire_visibility_grants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_visibility_grants() TO service_role;

REVOKE ALL ON FUNCTION public.get_business_active_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_active_plan(uuid) TO authenticated, anon, service_role;