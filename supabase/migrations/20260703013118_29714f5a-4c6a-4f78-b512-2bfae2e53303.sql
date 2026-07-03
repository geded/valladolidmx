-- ============================================================
-- 15.10.7.1 · Permisos por zona (esquema + RPCs)
-- ============================================================

-- 1. Tabla user_zone_scopes
CREATE TABLE IF NOT EXISTS public.user_zone_scopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('region', 'destination')),
  scope_id UUID NOT NULL,
  role public.app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope_type, scope_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_zone_scopes_user
  ON public.user_zone_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zone_scopes_scope
  ON public.user_zone_scopes(scope_type, scope_id);

-- 2. GRANTs (auth-only; no anon)
GRANT SELECT ON public.user_zone_scopes TO authenticated;
GRANT ALL ON public.user_zone_scopes TO service_role;

-- 3. RLS
ALTER TABLE public.user_zone_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own zone scopes"
  ON public.user_zone_scopes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Escrituras sólo vía RPCs SECURITY DEFINER (assign/revoke abajo).
-- No policy INSERT/UPDATE/DELETE para authenticated → bloqueado por default.
CREATE POLICY "Service role manages zone scopes"
  ON public.user_zone_scopes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION public.user_zone_scopes_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_zone_scopes_updated_at ON public.user_zone_scopes;
CREATE TRIGGER trg_user_zone_scopes_updated_at
  BEFORE UPDATE ON public.user_zone_scopes
  FOR EACH ROW EXECUTE FUNCTION public.user_zone_scopes_touch_updated_at();

-- 5. has_zone_scope(_user_id, _scope_type, _scope_id, _role)
CREATE OR REPLACE FUNCTION public.has_zone_scope(
  _user_id UUID,
  _scope_type TEXT,
  _scope_id UUID,
  _role public.app_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_zone_scopes
    WHERE user_id = _user_id
      AND scope_type = _scope_type
      AND scope_id = _scope_id
      AND role = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_zone_scope(UUID, TEXT, UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_zone_scope(UUID, TEXT, UUID, public.app_role) TO authenticated, service_role;

-- 6. user_zone_scopes_for(_user_id) — lista scopes activos
CREATE OR REPLACE FUNCTION public.user_zone_scopes_for(_user_id UUID)
RETURNS TABLE (
  id UUID,
  scope_type TEXT,
  scope_id UUID,
  role public.app_role,
  granted_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, scope_type, scope_id, role, granted_by, notes, created_at
  FROM public.user_zone_scopes
  WHERE user_id = _user_id
  ORDER BY created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.user_zone_scopes_for(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_zone_scopes_for(UUID) TO authenticated, service_role;

-- 7. assign_zone_scope — sólo super_admin/admin
CREATE OR REPLACE FUNCTION public.assign_zone_scope(
  _user_id UUID,
  _scope_type TEXT,
  _scope_id UUID,
  _role public.app_role,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.has_role(v_caller, 'super_admin'::public.app_role)
       OR public.has_role(v_caller, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden: super_admin or admin required' USING ERRCODE = '42501';
  END IF;

  IF _scope_type NOT IN ('region', 'destination') THEN
    RAISE EXCEPTION 'invalid scope_type: %', _scope_type USING ERRCODE = '22023';
  END IF;

  -- Validar que scope_id existe
  IF _scope_type = 'region' THEN
    IF NOT EXISTS (SELECT 1 FROM public.tourism_regions WHERE id = _scope_id) THEN
      RAISE EXCEPTION 'region not found: %', _scope_id USING ERRCODE = '23503';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.destinations WHERE id = _scope_id) THEN
      RAISE EXCEPTION 'destination not found: %', _scope_id USING ERRCODE = '23503';
    END IF;
  END IF;

  INSERT INTO public.user_zone_scopes (user_id, scope_type, scope_id, role, granted_by, notes)
  VALUES (_user_id, _scope_type, _scope_id, _role, v_caller, _notes)
  ON CONFLICT (user_id, scope_type, scope_id, role)
  DO UPDATE SET notes = EXCLUDED.notes, granted_by = EXCLUDED.granted_by, updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_zone_scope(UUID, TEXT, UUID, public.app_role, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_zone_scope(UUID, TEXT, UUID, public.app_role, TEXT) TO authenticated, service_role;

-- 8. revoke_zone_scope — sólo super_admin/admin
CREATE OR REPLACE FUNCTION public.revoke_zone_scope(_scope_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.has_role(v_caller, 'super_admin'::public.app_role)
       OR public.has_role(v_caller, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'forbidden: super_admin or admin required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_zone_scopes WHERE id = _scope_id;
  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_zone_scope(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_zone_scope(UUID) TO authenticated, service_role;

COMMENT ON TABLE public.user_zone_scopes IS
  '15.10.7.1 — Permisos acotados a zonas geográficas (regiones/destinos). Complementa user_roles sin sustituirlo.';
