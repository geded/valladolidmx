DROP FUNCTION IF EXISTS public.alux_traveler_log_suggestion(text, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.alux_traveler_log_suggestion(
  _capability text,
  _plan_id uuid,
  _meta jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _id  uuid;
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
    'draft_concierge_message',
    'suggest_from_coupons',
    'discover_promotions'
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