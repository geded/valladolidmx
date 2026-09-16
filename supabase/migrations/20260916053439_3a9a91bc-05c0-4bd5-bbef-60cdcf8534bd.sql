CREATE OR REPLACE FUNCTION public.concierge_plan_apply_schedule(_case_id uuid, _entries jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_plan_id uuid;
  v_entry jsonb;
  v_applied integer := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_is_internal(v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  SELECT p.id INTO v_plan_id FROM public.travel_plans p
  WHERE p.case_id = _case_id ORDER BY p.updated_at DESC LIMIT 1;
  IF v_plan_id IS NULL THEN RETURN 0; END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(COALESCE(_entries, '[]'::jsonb))
  LOOP
    UPDATE public.travel_plan_items
       SET day_index = COALESCE((v_entry->>'day_index')::integer, day_index),
           starts_at_local = COALESCE((v_entry->>'starts_at_local')::time, starts_at_local),
           duration_minutes = COALESCE((v_entry->>'duration_minutes')::integer, duration_minutes),
           schedule_source = 'alux',
           updated_at = now()
     WHERE id = (v_entry->>'item_id')::uuid
       AND plan_id = v_plan_id;
    IF FOUND THEN v_applied := v_applied + 1; END IF;
  END LOOP;

  RETURN v_applied;
END;
$function$;

REVOKE ALL ON FUNCTION public.concierge_plan_apply_schedule(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.concierge_plan_apply_schedule(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.concierge_plan_apply_schedule(uuid, jsonb) TO service_role;