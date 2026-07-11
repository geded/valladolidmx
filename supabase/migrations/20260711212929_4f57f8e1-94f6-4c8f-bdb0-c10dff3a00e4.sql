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
  _active_coupons jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

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

  SELECT id INTO _active_plan_id
  FROM public.travel_plans
  WHERE user_id = _uid AND status <> 'archived'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF _active_plan_id IS NOT NULL THEN
    _active_plan := public.travel_plan_build_snapshot(_active_plan_id);
  END IF;

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

  -- Cupones vigentes del viajero (Ola 4 · Alux conversacional con cupones).
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', tc.id,
        'code', tc.code,
        'title', tc.title,
        'discount_percent', tc.discount_percent,
        'valid_until', tc.valid_until,
        'promotion_slug', tc.promotion_slug,
        'business_id', tc.business_id,
        'business_name', b.name,
        'business_slug', b.slug
      ) ORDER BY tc.valid_until ASC
    ),
    '[]'::jsonb
  )
  INTO _active_coupons
  FROM public.traveler_coupons tc
  LEFT JOIN public.businesses b ON b.id = tc.business_id
  WHERE tc.user_id = _uid
    AND tc.status = 'active'
    AND tc.valid_until > now();

  RETURN jsonb_build_object(
    'traveler', _traveler,
    'active_plan', _active_plan,
    'plans_summary', COALESCE(_plans_summary, '[]'::jsonb),
    'linked_case', _linked_case,
    'catalog_refs', COALESCE(_catalog_refs, '[]'::jsonb),
    'active_coupons', COALESCE(_active_coupons, '[]'::jsonb),
    'generated_at', now()
  );
END;
$function$;