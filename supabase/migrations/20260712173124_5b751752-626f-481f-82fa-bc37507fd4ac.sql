
-- 1) Ampliar visibility de concierge_case_notes con 'traveler'
ALTER TABLE public.concierge_case_notes
  DROP CONSTRAINT IF EXISTS concierge_case_notes_visibility_check;
ALTER TABLE public.concierge_case_notes
  ADD CONSTRAINT concierge_case_notes_visibility_check
  CHECK (visibility IN ('internal','internal_lead_only','traveler'));

-- 2) Permitir al viajero dueño del caso leer notas marcadas como visibles
DROP POLICY IF EXISTS "ccn_select_traveler" ON public.concierge_case_notes;
CREATE POLICY "ccn_select_traveler" ON public.concierge_case_notes
  FOR SELECT TO authenticated
  USING (
    visibility = 'traveler'
    AND EXISTS (
      SELECT 1 FROM public.concierge_cases c
      WHERE c.id = concierge_case_notes.case_id
        AND c.traveler_user_id = auth.uid()
    )
  );

-- 3) RPC SECURITY DEFINER: contexto concierge para Alux (traveler-scope)
CREATE OR REPLACE FUNCTION public.alux_get_concierge_context_for_user(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  active_case_ids UUID[];
  reserved_business_ids UUID[] := ARRAY[]::UUID[];
  reserved_business_slugs TEXT[] := ARRAY[]::TEXT[];
  reserved_business_names TEXT[] := ARRAY[]::TEXT[];
  reserved_product_ids UUID[] := ARRAY[]::UUID[];
  reserved_event_ids UUID[] := ARRAY[]::UUID[];
  reserved_destination_ids UUID[] := ARRAY[]::UUID[];
  active_proposals_count INT := 0;
  latest_proposal_summary TEXT := NULL;
  shared_notes JSONB := '[]'::JSONB;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('has_concierge', false);
  END IF;

  -- Cases activos del viajero (no cerrados)
  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO active_case_ids
  FROM public.concierge_cases
  WHERE traveler_user_id = _user_id
    AND status NOT IN ('closed','cancelled','won','lost');

  IF array_length(active_case_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('has_concierge', false);
  END IF;

  -- Entidades reservadas vía case_links
  SELECT
    COALESCE(array_agg(target_id) FILTER (WHERE link_type = 'business'), ARRAY[]::UUID[]),
    COALESCE(array_agg(target_id) FILTER (WHERE link_type = 'product'), ARRAY[]::UUID[]),
    COALESCE(array_agg(target_id) FILTER (WHERE link_type = 'event'), ARRAY[]::UUID[]),
    COALESCE(array_agg(target_id) FILTER (WHERE link_type = 'destination'), ARRAY[]::UUID[])
    INTO reserved_business_ids, reserved_product_ids, reserved_event_ids, reserved_destination_ids
  FROM public.concierge_case_links
  WHERE case_id = ANY(active_case_ids);

  -- Enriquecer con business_ids desde presupuestos activos (concierge_quotes)
  SELECT COALESCE(array_agg(DISTINCT q.business_id), ARRAY[]::UUID[])
    INTO reserved_business_ids
  FROM (
    SELECT unnest(reserved_business_ids) AS business_id
    UNION
    SELECT business_id
      FROM public.concierge_quotes
      WHERE case_id = ANY(active_case_ids)
        AND status NOT IN ('rejected','cancelled','expired')
        AND business_id IS NOT NULL
  ) q
  WHERE q.business_id IS NOT NULL;

  -- Slugs + nombres legibles para prompt y UI
  IF array_length(reserved_business_ids, 1) IS NOT NULL THEN
    SELECT
      COALESCE(array_agg(slug), ARRAY[]::TEXT[]),
      COALESCE(array_agg(display_name), ARRAY[]::TEXT[])
      INTO reserved_business_slugs, reserved_business_names
    FROM public.businesses
    WHERE id = ANY(reserved_business_ids);
  END IF;

  -- Propuestas activas
  SELECT COUNT(*), (
    SELECT summary FROM public.concierge_proposals
     WHERE case_id = ANY(active_case_ids)
       AND status IN ('draft','sent','viewed','accepted')
     ORDER BY updated_at DESC
     LIMIT 1
  )
    INTO active_proposals_count, latest_proposal_summary
  FROM public.concierge_proposals
  WHERE case_id = ANY(active_case_ids)
    AND status IN ('draft','sent','viewed','accepted');

  -- Notas visibles para el viajero (top 3, más recientes)
  SELECT COALESCE(jsonb_agg(row_to_json(n)), '[]'::jsonb)
    INTO shared_notes
  FROM (
    SELECT LEFT(body, 400) AS body, created_at
    FROM public.concierge_case_notes
    WHERE case_id = ANY(active_case_ids)
      AND visibility = 'traveler'
    ORDER BY created_at DESC
    LIMIT 3
  ) n;

  RETURN jsonb_build_object(
    'has_concierge', true,
    'active_case_count', array_length(active_case_ids, 1),
    'reserved_business_ids', to_jsonb(reserved_business_ids),
    'reserved_business_slugs', to_jsonb(reserved_business_slugs),
    'reserved_business_names', to_jsonb(reserved_business_names),
    'reserved_product_ids', to_jsonb(reserved_product_ids),
    'reserved_event_ids', to_jsonb(reserved_event_ids),
    'reserved_destination_ids', to_jsonb(reserved_destination_ids),
    'active_proposals_count', active_proposals_count,
    'latest_proposal_summary', latest_proposal_summary,
    'shared_notes', shared_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.alux_get_concierge_context_for_user(UUID) TO authenticated, service_role;
