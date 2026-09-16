CREATE OR REPLACE FUNCTION public.concierge_traveler_interests(_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_traveler uuid;
  v_memory jsonb := NULL;
  v_favorites jsonb := '[]'::jsonb;
  v_planned jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT public.concierge_is_internal(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT traveler_user_id INTO v_traveler
  FROM public.concierge_cases WHERE id = _case_id;

  IF v_traveler IS NULL THEN
    RETURN jsonb_build_object('has_traveler', false);
  END IF;

  SELECT summary INTO v_memory
  FROM public.traveler_memory_projection
  WHERE user_id = v_traveler
    AND personalization = 'active'
    AND (expires_at IS NULL OR expires_at > now());

  SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb) INTO v_favorites
  FROM (
    SELECT tf.entity_kind::text AS kind,
           tf.entity_id,
           tf.created_at,
           COALESCE(b.display_name, p.name, poi.name, e.title, r.name) AS label
    FROM public.traveler_favorites tf
    LEFT JOIN public.businesses b ON tf.entity_kind = 'business' AND b.id = tf.entity_id
    LEFT JOIN public.products p ON tf.entity_kind = 'product' AND p.id = tf.entity_id
    LEFT JOIN public.points_of_interest poi ON tf.entity_kind = 'place' AND poi.id = tf.entity_id
    LEFT JOIN public.events e ON tf.entity_kind = 'event' AND e.id = tf.entity_id
    LEFT JOIN public.editorial_routes r ON tf.entity_kind = 'route' AND r.id = tf.entity_id
    WHERE tf.user_id = v_traveler
    ORDER BY tf.created_at DESC
    LIMIT 30
  ) f;

  SELECT COALESCE(jsonb_agg(row_to_json(i)), '[]'::jsonb) INTO v_planned
  FROM (
    SELECT tpi.item_kind::text AS kind,
           tpi.entity_id,
           COALESCE(tpi.snapshot->>'title', tpi.snapshot->>'name') AS label
    FROM public.travel_plan_items tpi
    JOIN public.travel_plans tp ON tp.id = tpi.plan_id
    WHERE tp.user_id = v_traveler
    LIMIT 80
  ) i;

  RETURN jsonb_build_object(
    'has_traveler', true,
    'memory', v_memory,
    'favorites', v_favorites,
    'planned', v_planned
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.concierge_traveler_interests(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_traveler_interests(uuid) TO authenticated;