
-- =========================================================
-- 15.10.4 · ETAPA 1 — Operational Platform Foundations
-- =========================================================
-- - Auto-asignación de rol 'traveler' al confirmar correo.
-- - Extensión del Perfil Inteligente del Turista.
-- - RPC agregada para Founder Dashboard (KPIs globales).
-- - Mapeo de nomenclatura: founder = super_admin, business = business_owner.
-- =========================================================

-- 1) Extender traveler_profiles -------------------------------------------------

ALTER TABLE public.traveler_profiles
  ADD COLUMN IF NOT EXISTS travel_party        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS home_country        TEXT,
  ADD COLUMN IF NOT EXISTS consent_personalize BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_share_alux  BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signals             JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS languages           TEXT[]       NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS travel_style_tags   TEXT[]       NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS dietary             TEXT[]       NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS accessibility       TEXT[]       NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS budget_band         TEXT;

ALTER TABLE public.traveler_profiles
  DROP CONSTRAINT IF EXISTS traveler_profiles_budget_band_check;
ALTER TABLE public.traveler_profiles
  ADD CONSTRAINT traveler_profiles_budget_band_check
  CHECK (budget_band IS NULL OR budget_band IN ('economy','comfort','premium','luxury'));

-- Nota: 'signals' jamás se escribe desde el cliente. RLS ya está activa en
-- traveler_profiles desde la Etapa 11.2; no se relaja ninguna policy.

-- 2) Auto-asignación de rol 'traveler' a nuevos usuarios -----------------------

CREATE OR REPLACE FUNCTION public.handle_new_traveler_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sólo cuando el correo queda confirmado (evita asignar a sign-ups falsos).
  IF NEW.email_confirmed_at IS NOT NULL AND
     (OLD.email_confirmed_at IS NULL OR TG_OP = 'INSERT')
  THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'traveler'::public.app_role)
    ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;

    -- Crear perfil base si no existe.
    INSERT INTO public.profiles (user_id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;

    -- Crear traveler_profile vacío para que el panel /mi-viaje funcione de inmediato.
    INSERT INTO public.traveler_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_traveler_role ON auth.users;
CREATE TRIGGER trg_auth_user_traveler_role
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_traveler_role();

-- 3) Founder Dashboard KPIs ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.founder_dashboard_kpis()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_founder boolean;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  v_is_founder := public.has_role(v_uid, 'super_admin'::public.app_role)
               OR public.has_role(v_uid, 'admin'::public.app_role);
  IF NOT v_is_founder THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'businesses', jsonb_build_object(
      'total',  (SELECT count(*) FROM public.businesses WHERE deleted_at IS NULL),
      'active', (SELECT count(*) FROM public.businesses WHERE deleted_at IS NULL AND status = 'active')
    ),
    'travelers', jsonb_build_object(
      'total', (SELECT count(*) FROM public.user_roles WHERE role = 'traveler')
    ),
    'concierges', jsonb_build_object(
      'total',  (SELECT count(*) FROM public.user_roles WHERE role IN ('concierge','concierge_lead')),
      'active', (SELECT count(*) FROM public.concierge_profiles WHERE COALESCE(active, true))
    ),
    'cases', jsonb_build_object(
      'total',  (SELECT count(*) FROM public.concierge_cases),
      'open',   (SELECT count(*) FROM public.concierge_cases WHERE status NOT IN ('closed','cancelled')),
      'overdue',(SELECT count(*) FROM public.concierge_cases
                 WHERE status NOT IN ('closed','cancelled')
                   AND target_response_at IS NOT NULL
                   AND target_response_at < now())
    ),
    'proposals', jsonb_build_object(
      'total',    (SELECT count(*) FROM public.concierge_proposals),
      'sent',     (SELECT count(*) FROM public.concierge_proposals WHERE status = 'sent'),
      'accepted', (SELECT count(*) FROM public.concierge_proposals WHERE status = 'accepted')
    ),
    'quotes', jsonb_build_object(
      'total',     (SELECT count(*) FROM public.concierge_quotes),
      'submitted', (SELECT count(*) FROM public.concierge_quotes WHERE status = 'submitted')
    ),
    'orders', jsonb_build_object(
      'total', (SELECT count(*) FROM public.orders),
      'paid',  (SELECT count(*) FROM public.orders WHERE status IN ('paid','fulfilled','completed'))
    ),
    'revenue', jsonb_build_object(
      'gross_cents', COALESCE((SELECT sum(total_amount_cents) FROM public.orders
                                WHERE status IN ('paid','fulfilled','completed')), 0),
      'currency', 'MXN'
    ),
    'system', jsonb_build_object(
      'alerts_open',
        CASE WHEN to_regclass('public.system_alerts') IS NULL THEN 0
             ELSE (SELECT count(*) FROM public.system_alerts WHERE COALESCE(resolved_at IS NULL, true)) END
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.founder_dashboard_kpis() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founder_dashboard_kpis() TO authenticated;
