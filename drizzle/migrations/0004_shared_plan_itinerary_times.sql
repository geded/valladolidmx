CREATE OR REPLACE FUNCTION public.travel_plan_get_shared(_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan_id uuid;
  _plan jsonb;
  _items jsonb;
BEGIN
  IF _token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO _plan_id
  FROM public.travel_plans
  WHERE share_token = _token
  LIMIT 1;

  IF _plan_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'status', p.status,
    'party_size', p.party_size,
    'start_date', p.start_date,
    'end_date', p.end_date,
    'cover_image_url', p.cover_image_url,
    'shared_at', p.shared_at,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  INTO _plan
  FROM public.travel_plans p
  WHERE p.id = _plan_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'item_kind', i.item_kind,
      'target_id', i.target_id,
      'position', i.position,
      'day_index', i.day_index,
      'starts_at_local', i.starts_at_local,
      'duration_minutes', i.duration_minutes,
      'snapshot', i.snapshot
    )
    ORDER BY i.position ASC, i.created_at ASC
  ), '[]'::jsonb)
  INTO _items
  FROM public.travel_plan_items i
  WHERE i.plan_id = _plan_id;

  RETURN jsonb_build_object('plan', _plan, 'items', _items);
END;
$function$;