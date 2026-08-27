CREATE OR REPLACE FUNCTION public.concierge_case_file_v1(_case_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_internal BOOLEAN;
  v_case public.concierge_cases;
  v_result JSONB;
  v_traveler JSONB;
  v_requests JSONB;
  v_links JSONB;
  v_timeline JSONB;
  v_businesses JSONB;
  v_quotes JSONB;
  v_proposals JSONB;
  v_travel_plan_id UUID;
  v_assignment JSONB;
  v_assignments JSONB;
  v_first_resp timestamptz;
  v_sla_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  v_internal := public.concierge_is_internal(v_uid);

  SELECT * INTO v_case FROM public.concierge_cases WHERE id = _case_id;

  SELECT jsonb_build_object(
    'user_id', v_case.traveler_user_id,
    'display_name', COALESCE(tp.public_display_name, pr.display_name),
    'preferred_language', COALESCE(tp.preferred_language, pr.preferred_language)
  ) INTO v_traveler
  FROM (SELECT 1) x
  LEFT JOIN public.traveler_profiles tp ON tp.user_id = v_case.traveler_user_id
  LEFT JOIN public.profiles pr ON pr.user_id = v_case.traveler_user_id;

  SELECT target_id INTO v_travel_plan_id
  FROM public.concierge_case_links
  WHERE case_id = _case_id AND link_type = 'travel_plan' LIMIT 1;

  SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at), '[]'::jsonb)
    INTO v_requests
    FROM public.concierge_case_requests r WHERE r.case_id = _case_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb)
    INTO v_links
    FROM public.concierge_case_links l WHERE l.case_id = _case_id;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.occurred_at DESC), '[]'::jsonb)
    INTO v_timeline
    FROM (
      SELECT * FROM public.concierge_case_timeline
      WHERE case_id = _case_id ORDER BY occurred_at DESC LIMIT 100
    ) t;

  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', b.id, 'display_name', b.display_name, 'slug', b.slug
  )), '[]'::jsonb)
    INTO v_businesses
    FROM public.businesses b
   WHERE b.id IN (
     SELECT business_id FROM public.concierge_case_requests
      WHERE case_id = _case_id AND business_id IS NOT NULL
     UNION
     SELECT target_id FROM public.concierge_case_links
      WHERE case_id = _case_id AND link_type = 'business'
   );

  SELECT COALESCE(jsonb_agg(q ORDER BY (q->>'created_at') DESC), '[]'::jsonb)
    INTO v_quotes
    FROM public.concierge_case_quotes_list(_case_id) q;

  SELECT COALESCE(jsonb_agg(p ORDER BY (p->>'created_at') DESC), '[]'::jsonb)
    INTO v_proposals
    FROM public.concierge_case_proposals_list(_case_id) p;

  SELECT to_jsonb(a.*) INTO v_assignment
    FROM public.concierge_assignments a
   WHERE a.case_id = _case_id AND a.status='active' LIMIT 1;

  SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.assigned_at DESC), '[]'::jsonb)
    INTO v_assignments
    FROM public.concierge_assignments a WHERE a.case_id = _case_id;

  v_first_resp := public._concierge_first_response_at(_case_id);
  v_sla_status := public._concierge_sla_status(v_case.target_response_at, v_case.created_at, v_first_resp);

  v_result := jsonb_build_object(
    'case', to_jsonb(v_case),
    'viewer', jsonb_build_object('user_id', v_uid, 'is_internal', v_internal),
    'traveler', COALESCE(v_traveler, jsonb_build_object('user_id', v_case.traveler_user_id)),
    'travel_plan', CASE WHEN v_travel_plan_id IS NOT NULL
                         THEN jsonb_build_object('id', v_travel_plan_id) ELSE NULL END,
    'requests', v_requests,
    'quotes', v_quotes,
    'proposals', v_proposals,
    'orders', '[]'::jsonb,
    'reservations', '[]'::jsonb,
    'payments', '[]'::jsonb,
    'links', v_links,
    'businesses', v_businesses,
    'timeline', v_timeline,
    'assignment', v_assignment,
    'assignments', v_assignments,
    'sla', jsonb_build_object(
      'priority',           v_case.priority,
      'priority_source',    v_case.priority_source,
      'priority_reason',    v_case.priority_reason,
      'target_response_at', v_case.target_response_at,
      'last_activity_at',   v_case.last_activity_at,
      'first_response_at',  v_first_resp,
      'sla_status',         v_sla_status
    )
  );

  RETURN v_result;
END;
$function$;