-- CV4.3-narrativa · Sub-ola parte 2: exponer estado de reservación
-- en el listado admin de travel plans (columna "Reservación").
-- Recrea admin_list_active_travel_plans agregando reservation{folio,status,paid_at,total,currency,days_to_trip}.

CREATE OR REPLACE FUNCTION public.admin_list_active_travel_plans(
  p_kpi_filter text DEFAULT NULL,
  p_plan_status text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_only_mine boolean DEFAULT false,
  p_include_closed boolean DEFAULT false,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_can boolean; v_is_admin boolean;
  v_scope_cases uuid[];
  v_rows jsonb;
  v_total int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT can_view, is_admin INTO v_can, v_is_admin FROM public._cv11_can_view_travel_ops(v_uid);
  IF NOT v_can THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;

  IF NOT v_is_admin OR p_only_mine THEN
    SELECT array_agg(DISTINCT case_id) INTO v_scope_cases
    FROM public.concierge_assignments
    WHERE concierge_user_id = v_uid AND released_at IS NULL;
  END IF;

  p_limit := LEAST(GREATEST(COALESCE(p_limit,25),1),100);
  p_offset := GREATEST(COALESCE(p_offset,0),0);

  WITH base AS (
    SELECT
      tp.id AS plan_id,
      tp.title,
      tp.status AS plan_status,
      tp.start_date,
      tp.end_date,
      tp.party_size,
      tp.updated_at,
      tp.case_id,
      tp.user_id AS traveler_user_id,
      trp.public_display_name,
      trp.public_handle,
      trp.avatar_url,
      trp.preferred_language,
      trp.home_country,
      cc.status AS case_status,
      cc.priority AS case_priority,
      cc.target_response_at,
      cc.last_activity_at,
      cp.id AS latest_proposal_id,
      cp.status AS latest_proposal_status,
      cp.sent_at AS latest_proposal_sent_at,
      cp.valid_until AS latest_proposal_valid_until,
      ap.pending_alux_count,
      it.items_count,
      cor.folio AS reservation_folio,
      cor.status AS reservation_status,
      cor.paid_at AS reservation_paid_at,
      cor.total_amount AS reservation_total,
      cor.currency AS reservation_currency
    FROM public.travel_plans tp
    LEFT JOIN public.traveler_profiles trp ON trp.user_id = tp.user_id
    LEFT JOIN public.concierge_cases cc ON cc.id = tp.case_id
    LEFT JOIN LATERAL (
      SELECT * FROM public.concierge_proposals x
      WHERE x.case_id = tp.case_id ORDER BY x.created_at DESC LIMIT 1
    ) cp ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS pending_alux_count
      FROM public.alux_plan_proposals x WHERE x.plan_id = tp.id AND x.status = 'pending'
    ) ap ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS items_count
      FROM public.travel_plan_items x WHERE x.plan_id = tp.id
    ) it ON true
    LEFT JOIN LATERAL (
      SELECT o.folio, o.status, o.paid_at, o.total_amount, o.currency
      FROM public.concierge_orders o
      WHERE o.status IN ('paid','fulfilled','refunded')
        AND (o.travel_plan_id = tp.id OR o.user_id = tp.user_id)
      ORDER BY
        (o.travel_plan_id = tp.id) DESC,
        COALESCE(o.paid_at, o.updated_at) DESC
      LIMIT 1
    ) cor ON true
    WHERE
      (v_is_admin AND NOT p_only_mine)
      OR (tp.case_id IS NOT NULL AND tp.case_id = ANY(COALESCE(v_scope_cases, ARRAY[]::uuid[])))
      AND (p_include_closed OR (tp.status <> 'archived' AND tp.archived_at IS NULL))
  ),
  enriched AS (
    SELECT
      b.*,
      CASE
        WHEN b.case_status IS NOT NULL AND b.case_status NOT IN ('closed','cancelled','lost') THEN 'high'
        WHEN b.latest_proposal_id IS NOT NULL THEN 'high'
        WHEN b.plan_status = 'shared_with_concierge' THEN 'high'
        WHEN b.items_count >= 5 OR b.pending_alux_count > 0 THEN 'medium'
        WHEN b.items_count > 0 THEN 'low'
        ELSE 'exploring'
      END AS intent_level,
      CASE
        WHEN b.latest_proposal_status = 'sent'
             AND b.latest_proposal_sent_at IS NOT NULL
             AND b.latest_proposal_sent_at < now() - interval '48 hours' THEN 'breached'
        WHEN b.latest_proposal_status = 'sent'
             AND b.latest_proposal_sent_at IS NOT NULL
             AND b.latest_proposal_sent_at < now() - interval '24 hours' THEN 'at_risk'
        WHEN b.target_response_at IS NOT NULL AND b.target_response_at < now() THEN 'breached'
        WHEN b.target_response_at IS NOT NULL AND b.target_response_at < now() + interval '6 hours' THEN 'at_risk'
        ELSE 'ok'
      END AS sla_risk,
      CASE WHEN b.start_date IS NOT NULL THEN (b.start_date - CURRENT_DATE) ELSE NULL END AS days_to_trip
    FROM base b
  ),
  prioritized AS (
    SELECT
      e.*,
      CASE
        WHEN e.reservation_status IN ('paid','fulfilled') THEN 'high'
        WHEN e.sla_risk = 'breached' THEN 'critical'
        WHEN e.sla_risk = 'at_risk' THEN 'high'
        WHEN e.days_to_trip IS NOT NULL AND e.days_to_trip BETWEEN 0 AND 7 THEN 'high'
        WHEN e.intent_level = 'high' THEN 'high'
        WHEN e.latest_proposal_status = 'sent' THEN 'medium'
        WHEN e.case_status IS NOT NULL AND e.case_status NOT IN ('closed','cancelled','lost','won') THEN 'medium'
        WHEN e.days_to_trip IS NOT NULL AND e.days_to_trip BETWEEN 8 AND 30 THEN 'medium'
        WHEN e.intent_level = 'medium' THEN 'medium'
        ELSE 'low'
      END AS priority,
      CASE
        WHEN e.sla_risk = 'breached' THEN 0
        WHEN e.sla_risk = 'at_risk' THEN 1
        WHEN e.days_to_trip IS NOT NULL AND e.days_to_trip BETWEEN 0 AND 7 THEN 2
        WHEN e.intent_level = 'high' THEN 3
        WHEN e.latest_proposal_status = 'sent' THEN 4
        WHEN e.case_status IS NOT NULL AND e.case_status NOT IN ('closed','cancelled','lost','won') THEN 5
        ELSE 6
      END AS priority_order
    FROM enriched e
  ),
  filtered AS (
    SELECT * FROM prioritized p
    WHERE
      (p_kpi_filter IS NULL
        OR (p_kpi_filter='active' AND p.plan_status IN ('draft','active','shared_with_concierge'))
        OR (p_kpi_filter='pending_alux' AND p.pending_alux_count > 0)
        OR (p_kpi_filter='open_case' AND p.case_status IS NOT NULL AND p.case_status NOT IN ('closed','cancelled','won','lost'))
        OR (p_kpi_filter='proposals_sla' AND p.latest_proposal_status='sent' AND p.latest_proposal_sent_at < now() - interval '48 hours')
        OR (p_kpi_filter='closed' AND (p.plan_status='archived' OR p.case_status IN ('closed','cancelled','won','lost')))
        OR (p_kpi_filter='confirmed' AND p.reservation_status IN ('paid','fulfilled'))
      )
      AND (p_plan_status IS NULL OR p.plan_status::text = p_plan_status)
      AND (p_priority IS NULL OR p.priority = p_priority)
      AND (p_search IS NULL OR p_search = '' OR
           p.title ILIKE '%'||p_search||'%' OR
           p.public_display_name ILIKE '%'||p_search||'%' OR
           p.public_handle ILIKE '%'||p_search||'%' OR
           p.reservation_folio ILIKE '%'||p_search||'%')
  )
  SELECT
    coalesce(jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.priority_order, sub.sla_risk_order, sub.days_to_trip NULLS LAST, sub.updated_at DESC), '[]'::jsonb),
    (SELECT count(*) FROM filtered)
  INTO v_rows, v_total
  FROM (
    SELECT
      f.plan_id, f.title, f.plan_status, f.start_date, f.end_date, f.party_size,
      f.updated_at, f.case_id, f.days_to_trip,
      jsonb_build_object(
        'user_id', f.traveler_user_id,
        'display_name', COALESCE(f.public_display_name, 'Viajero'),
        'handle', f.public_handle,
        'avatar_url', f.avatar_url,
        'language', f.preferred_language,
        'country', f.home_country
      ) AS traveler,
      jsonb_build_object(
        'status', f.case_status,
        'priority', f.case_priority,
        'target_response_at', f.target_response_at,
        'last_activity_at', f.last_activity_at
      ) AS concierge,
      jsonb_build_object(
        'id', f.latest_proposal_id,
        'status', f.latest_proposal_status,
        'sent_at', f.latest_proposal_sent_at,
        'valid_until', f.latest_proposal_valid_until
      ) AS proposal,
      jsonb_build_object(
        'folio', f.reservation_folio,
        'status', f.reservation_status,
        'paid_at', f.reservation_paid_at,
        'total', f.reservation_total,
        'currency', f.reservation_currency,
        'is_confirmed', (f.reservation_status IN ('paid','fulfilled'))
      ) AS reservation,
      f.pending_alux_count,
      f.items_count,
      f.intent_level,
      f.sla_risk,
      f.priority,
      f.priority_order,
      CASE f.sla_risk WHEN 'breached' THEN 0 WHEN 'at_risk' THEN 1 ELSE 2 END AS sla_risk_order
    FROM filtered f
    ORDER BY priority_order, sla_risk_order, days_to_trip NULLS LAST, updated_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset,
    'is_admin', v_is_admin
  );
END; $$;

REVOKE ALL ON FUNCTION public.admin_list_active_travel_plans(text,text,text,boolean,boolean,text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_active_travel_plans(text,text,text,boolean,boolean,text,int,int) TO authenticated;