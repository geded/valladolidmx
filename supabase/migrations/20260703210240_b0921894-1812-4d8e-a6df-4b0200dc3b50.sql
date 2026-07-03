-- Sub-ola G · Backend Alux Traveler
-- Contexto oficial + auditoría de sugerencias del asistente del viajero.

-- 1. Tabla de auditoría de sugerencias Alux para viajeros.
CREATE TABLE public.alux_traveler_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.travel_plans(id) ON DELETE SET NULL,
  capability text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX alux_traveler_suggestions_user_idx
  ON public.alux_traveler_suggestions(user_id, created_at DESC);
CREATE INDEX alux_traveler_suggestions_plan_idx
  ON public.alux_traveler_suggestions(plan_id, created_at DESC);

GRANT SELECT, INSERT ON public.alux_traveler_suggestions TO authenticated;
GRANT ALL ON public.alux_traveler_suggestions TO service_role;

ALTER TABLE public.alux_traveler_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alux traveler self read"
  ON public.alux_traveler_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "alux traveler self insert"
  ON public.alux_traveler_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. RPC de contexto oficial del Travel Workspace para Alux.
-- Devuelve subset seguro del traveler_profile, plan activo (snapshot),
-- resumen de planes, caso vinculado y refs mínimas de catálogo.
-- No lee page_compositions. No expone contenido interno de expedientes.
CREATE OR REPLACE FUNCTION public.traveler_alux_context_for_user()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _traveler jsonb;
  _active_plan_id uuid;
  _active_plan jsonb;
  _plans_summary jsonb;
  _linked_case jsonb;
  _catalog_refs jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Traveler: subset seguro.
  SELECT jsonb_build_object(
    'preferred_language', preferred_language,
    'home_country', home_country,
    'interests', interests,
    'languages', languages,
    'travel_style_tags', travel_style_tags,
    'dietary', dietary,
    'accessibility', accessibility,
    'budget_band', budget_band,
    'travel_party', travel_party,
    'consent_personalize', consent_personalize,
    'consent_share_alux', consent_share_alux
  )
  INTO _traveler
  FROM public.traveler_profiles
  WHERE user_id = _uid;

  -- Plan activo: el más reciente no archivado.
  SELECT id INTO _active_plan_id
  FROM public.travel_plans
  WHERE user_id = _uid AND status <> 'archived'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _active_plan_id IS NOT NULL THEN
    _active_plan := public.travel_plan_build_snapshot(_active_plan_id);
  END IF;

  -- Historial de planes (resumen).
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'status', status,
        'updated_at', updated_at
      ) ORDER BY updated_at DESC
    ),
    '[]'::jsonb
  )
  INTO _plans_summary
  FROM public.travel_plans
  WHERE user_id = _uid AND status <> 'archived';

  -- Caso vinculado (sólo metadatos).
  IF _active_plan_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', c.id,
      'status', c.status,
      'last_activity_at', c.last_activity_at
    )
    INTO _linked_case
    FROM public.travel_plans tp
    JOIN public.concierge_cases c ON c.id = tp.case_id
    WHERE tp.id = _active_plan_id AND tp.case_id IS NOT NULL;
  END IF;

  -- Catalog refs: sólo IDs/kind/slug/title del snapshot activo.
  IF _active_plan IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'kind', item->>'item_kind',
          'target_id', item->>'target_id',
          'slug', item->'snapshot'->>'slug',
          'title', item->'snapshot'->>'title'
        )
      ),
      '[]'::jsonb
    )
    INTO _catalog_refs
    FROM jsonb_array_elements(COALESCE(_active_plan->'items', '[]'::jsonb)) AS item
    WHERE item->>'target_id' IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'traveler', _traveler,
    'active_plan', _active_plan,
    'plans_summary', COALESCE(_plans_summary, '[]'::jsonb),
    'linked_case', _linked_case,
    'catalog_refs', COALESCE(_catalog_refs, '[]'::jsonb),
    'generated_at', now()
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.traveler_alux_context_for_user() TO authenticated;

-- 3. RPC de auditoría — inserta en alux_traveler_suggestions validando capability.
CREATE OR REPLACE FUNCTION public.alux_traveler_log_suggestion(
  _capability text,
  _plan_id uuid DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF _capability IS NULL OR _capability NOT IN (
    'suggest_experiences',
    'suggest_restaurants',
    'suggest_hotels',
    'improve_trip',
    'detect_gaps',
    'draft_concierge_message'
  ) THEN
    RAISE EXCEPTION 'invalid_capability';
  END IF;
  IF _plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.travel_plans WHERE id = _plan_id AND user_id = _uid
  ) THEN
    RAISE EXCEPTION 'plan_not_visible';
  END IF;

  INSERT INTO public.alux_traveler_suggestions(user_id, plan_id, capability, meta)
  VALUES (_uid, _plan_id, _capability, COALESCE(_meta, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.alux_traveler_log_suggestion(text, uuid, jsonb) TO authenticated;