
DROP FUNCTION IF EXISTS public.concierge_case_from_travel_plan(uuid, uuid, text, jsonb);

CREATE OR REPLACE FUNCTION public.concierge_case_from_travel_plan(
  _traveler_user_id UUID,
  _summary TEXT,
  _travel_plan_id UUID DEFAULT NULL,
  _items JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_case_id UUID;
  v_item JSONB;
  v_req_id UUID;
  v_kind TEXT;
  v_product UUID;
BEGIN
  PERFORM public.concierge_assert_can_create_for(_traveler_user_id);

  INSERT INTO public.concierge_cases (traveler_user_id, source, summary, created_by)
  VALUES (_traveler_user_id, 'travel_plan', _summary, v_uid)
  RETURNING id INTO v_case_id;

  INSERT INTO public.concierge_case_participants (case_id, user_id, role)
  VALUES (v_case_id, _traveler_user_id, 'traveler')
  ON CONFLICT DO NOTHING;

  IF _travel_plan_id IS NOT NULL THEN
    INSERT INTO public.concierge_case_links (case_id, link_type, target_id)
    VALUES (v_case_id, 'travel_plan', _travel_plan_id)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_case_id, 'Concierge.Case.Created', 'info', v_uid,
          'Expediente creado desde Arma tu Viaje',
          jsonb_build_object('source','travel_plan','travel_plan_id', _travel_plan_id));

  IF _items IS NOT NULL AND jsonb_typeof(_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
      v_product := NULLIF(v_item->>'product_id','')::uuid;
      v_kind := COALESCE(NULLIF(v_item->>'kind',''),
                         CASE WHEN v_product IS NOT NULL THEN 'reservable' ELSE 'non_reservable' END);
      INSERT INTO public.concierge_case_requests
        (case_id, source_type, source_ref, kind, product_id, business_id, title, notes)
      VALUES (
        v_case_id, 'travel_plan_item',
        NULLIF(v_item->>'source_ref','')::uuid,
        v_kind,
        v_product,
        NULLIF(v_item->>'business_id','')::uuid,
        COALESCE(NULLIF(v_item->>'title',''), 'Ítem sin título'),
        NULLIF(v_item->>'notes','')
      ) RETURNING id INTO v_req_id;

      INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
      VALUES (v_case_id, 'Concierge.Request.Created', 'info', v_uid,
              'Solicitud creada', jsonb_build_object('request_id', v_req_id));

      PERFORM public._concierge_publish_request_created(v_case_id, v_req_id);
    END LOOP;
  END IF;

  PERFORM public._concierge_publish_case_created(v_case_id, _traveler_user_id, 'travel_plan');
  RETURN v_case_id;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_from_travel_plan(uuid, text, uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_from_travel_plan(uuid, text, uuid, jsonb) TO authenticated;
