-- 1 y 2: sólo el servidor (webhook de pagos con service role) marca pagos.
REVOKE EXECUTE ON FUNCTION public.order_mark_paid(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_mark_payment_failed(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.order_mark_paid(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.order_mark_payment_failed(uuid, text, text, text, text) TO service_role;

-- 3: apartados de cupo sólo vía commerce_booking_start (SECURITY DEFINER) o servidor.
REVOKE EXECUTE ON FUNCTION public.commerce_hold_create(uuid, integer, text, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commerce_hold_create(uuid, integer, text, integer, uuid) TO service_role;

-- 4: zonas asignadas sólo del propio usuario o para admin/super_admin.
CREATE OR REPLACE FUNCTION public.user_zone_scopes_for(_user_id uuid)
 RETURNS TABLE(id uuid, scope_type text, scope_id uuid, role app_role, granted_by uuid, notes text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.scope_type, s.scope_id, s.role, s.granted_by, s.notes, s.created_at
  FROM public.user_zone_scopes s
  WHERE s.user_id = _user_id
    AND (
      auth.uid() IS NULL
      OR _user_id = auth.uid()
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  ORDER BY s.created_at DESC;
$function$;
REVOKE EXECUTE ON FUNCTION public.user_zone_scopes_for(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_zone_scopes_for(uuid) TO authenticated, service_role;

-- 5: contexto concierge de Alux sólo para el propio viajero.
CREATE OR REPLACE FUNCTION public.alux_get_concierge_context_for_user(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Un usuario con sesión sólo puede consultar su propio contexto.
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('has_concierge', false);
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO active_case_ids
  FROM public.concierge_cases
  WHERE traveler_user_id = _user_id
    AND status NOT IN ('closed','cancelled','won','lost');

  IF array_length(active_case_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('has_concierge', false);
  END IF;

  SELECT
    COALESCE(array_agg(target_id) FILTER (WHERE link_type = 'business'), ARRAY[]::UUID[]),
    COALESCE(array_agg(target_id) FILTER (WHERE link_type = 'product'), ARRAY[]::UUID[]),
    COALESCE(array_agg(target_id) FILTER (WHERE link_type = 'event'), ARRAY[]::UUID[]),
    COALESCE(array_agg(target_id) FILTER (WHERE link_type = 'destination'), ARRAY[]::UUID[])
    INTO reserved_business_ids, reserved_product_ids, reserved_event_ids, reserved_destination_ids
  FROM public.concierge_case_links
  WHERE case_id = ANY(active_case_ids);

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

  IF array_length(reserved_business_ids, 1) IS NOT NULL THEN
    SELECT
      COALESCE(array_agg(slug), ARRAY[]::TEXT[]),
      COALESCE(array_agg(display_name), ARRAY[]::TEXT[])
      INTO reserved_business_slugs, reserved_business_names
    FROM public.businesses
    WHERE id = ANY(reserved_business_ids);
  END IF;

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
$function$;
REVOKE EXECUTE ON FUNCTION public.alux_get_concierge_context_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alux_get_concierge_context_for_user(uuid) TO authenticated, service_role;