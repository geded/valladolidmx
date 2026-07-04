-- US-E4.3: share link para travel_plans
ALTER TABLE public.travel_plans
  ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz;

CREATE INDEX IF NOT EXISTS travel_plans_share_token_idx
  ON public.travel_plans (share_token)
  WHERE share_token IS NOT NULL;

-- RPC público: sólo devuelve datos si el token existe.
CREATE OR REPLACE FUNCTION public.travel_plan_get_shared(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      'snapshot', i.snapshot
    )
    ORDER BY i.position ASC, i.created_at ASC
  ), '[]'::jsonb)
  INTO _items
  FROM public.travel_plan_items i
  WHERE i.plan_id = _plan_id;

  RETURN jsonb_build_object('plan', _plan, 'items', _items);
END;
$$;

REVOKE ALL ON FUNCTION public.travel_plan_get_shared(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_plan_get_shared(uuid) TO anon, authenticated, service_role;