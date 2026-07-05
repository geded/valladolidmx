-- US-EPS.1 · Profile Switcher · Migración + RPC de modos disponibles + set active_mode
-- Base: profiles.active_mode (profile_mode enum: traveler|business|concierge|staff) YA existe.
-- Aporta: RPCs SECURITY DEFINER para leer modos disponibles del usuario actual y cambiar el modo activo,
-- sin exponer tablas privilegiadas y sin infraestructura nueva.

-- 1) RPC: modos disponibles del usuario autenticado
CREATE OR REPLACE FUNCTION public.profile_get_available_modes()
RETURNS TABLE (
  mode public.profile_mode,
  available boolean,
  primary_label text,
  secondary_label text,
  entity_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  -- traveler: existe traveler_profile
  RETURN QUERY
  SELECT
    'traveler'::public.profile_mode,
    EXISTS (SELECT 1 FROM public.traveler_profiles tp WHERE tp.user_id = uid),
    'Viajero'::text,
    'Explora, planea y guarda'::text,
    COALESCE((SELECT 1 FROM public.traveler_profiles tp WHERE tp.user_id = uid LIMIT 1), 0);

  -- business: pertenece a al menos un business_users activo
  RETURN QUERY
  SELECT
    'business'::public.profile_mode,
    EXISTS (SELECT 1 FROM public.business_users bu WHERE bu.user_id = uid),
    'Empresa'::text,
    'Administra tu negocio'::text,
    COALESCE((SELECT COUNT(DISTINCT bu.business_id)::int FROM public.business_users bu WHERE bu.user_id = uid), 0);

  -- concierge: existe concierge_profile
  RETURN QUERY
  SELECT
    'concierge'::public.profile_mode,
    EXISTS (SELECT 1 FROM public.concierge_profiles cp WHERE cp.user_id = uid),
    'Concierge'::text,
    'Atiende viajeros asignados'::text,
    COALESCE((SELECT 1 FROM public.concierge_profiles cp WHERE cp.user_id = uid LIMIT 1), 0);

  -- staff: tiene rol admin/super_admin/editor
  RETURN QUERY
  SELECT
    'staff'::public.profile_mode,
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = uid
        AND ur.role IN ('super_admin','admin','editor')
    ),
    'Staff'::text,
    'Operación de plataforma'::text,
    COALESCE((SELECT COUNT(*)::int FROM public.user_roles ur
              WHERE ur.user_id = uid
                AND ur.role IN ('super_admin','admin','editor')), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.profile_get_available_modes() TO authenticated;

-- 2) RPC: establecer modo activo, validando disponibilidad
CREATE OR REPLACE FUNCTION public.profile_set_active_mode(_mode public.profile_mode)
RETURNS public.profile_mode
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ok boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Validar disponibilidad del modo solicitado
  CASE _mode
    WHEN 'traveler' THEN
      ok := EXISTS (SELECT 1 FROM public.traveler_profiles tp WHERE tp.user_id = uid);
    WHEN 'business' THEN
      ok := EXISTS (SELECT 1 FROM public.business_users bu WHERE bu.user_id = uid);
    WHEN 'concierge' THEN
      ok := EXISTS (SELECT 1 FROM public.concierge_profiles cp WHERE cp.user_id = uid);
    WHEN 'staff' THEN
      ok := EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid
          AND ur.role IN ('super_admin','admin','editor')
      );
  END CASE;

  IF NOT ok THEN
    RAISE EXCEPTION 'mode_not_available' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET active_mode = _mode, updated_at = now()
  WHERE user_id = uid;

  RETURN _mode;
END;
$$;

GRANT EXECUTE ON FUNCTION public.profile_set_active_mode(public.profile_mode) TO authenticated;