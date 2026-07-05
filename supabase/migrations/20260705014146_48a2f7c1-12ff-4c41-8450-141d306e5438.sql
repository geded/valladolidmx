-- E-PS · US-EPS.1 — Profile Switcher: infraestructura de modos activos
-- Agrega `profiles.active_mode` con enum profile_mode y expone un
-- RPC SECURITY DEFINER `get_available_modes` que devuelve los modos
-- realmente disponibles para un usuario según tablas existentes.

-- 1. Enum profile_mode
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_mode') THEN
    CREATE TYPE public.profile_mode AS ENUM ('traveler', 'business', 'concierge', 'staff');
  END IF;
END $$;

-- 2. Columna active_mode en profiles (default traveler para todos)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_mode public.profile_mode NOT NULL DEFAULT 'traveler';

-- 3. RPC get_available_modes(_user_id uuid) → text[]
-- Reglas:
--   - traveler: siempre disponible
--   - business: >=1 fila activa en business_users
--   - concierge: >=1 fila activa en concierge_profiles
--   - staff: >=1 fila en user_roles con rol admin/super_admin/editor/moderator/concierge
CREATE OR REPLACE FUNCTION public.get_available_modes(_user_id uuid)
RETURNS public.profile_mode[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  modes public.profile_mode[] := ARRAY['traveler']::public.profile_mode[];
BEGIN
  IF _user_id IS NULL THEN
    RETURN modes;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.user_id = _user_id
      AND COALESCE(bu.status, 'active') = 'active'
  ) THEN
    modes := modes || 'business'::public.profile_mode;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.concierge_profiles cp
    WHERE cp.user_id = _user_id
  ) THEN
    modes := modes || 'concierge'::public.profile_mode;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('super_admin', 'admin', 'editor', 'moderator', 'concierge')
  ) THEN
    modes := modes || 'staff'::public.profile_mode;
  END IF;

  RETURN modes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_modes(uuid) TO authenticated, service_role;

-- 4. RPC set_active_mode(_mode profile_mode) → profile_mode
-- Sólo permite cambiar a un modo disponible; valida contra get_available_modes.
CREATE OR REPLACE FUNCTION public.set_active_mode(_mode public.profile_mode)
RETURNS public.profile_mode
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  available public.profile_mode[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  available := public.get_available_modes(uid);
  IF NOT (_mode = ANY(available)) THEN
    RAISE EXCEPTION 'mode_not_available';
  END IF;

  UPDATE public.profiles
    SET active_mode = _mode, updated_at = now()
    WHERE user_id = uid;

  RETURN _mode;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_mode(public.profile_mode) TO authenticated, service_role;