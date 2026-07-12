
-- CV1.1 · Vista Operativa "Viajes en curso"
-- 3 RPCs SECURITY DEFINER con autorización interna
-- Roles autorizados: super_admin, admin, concierge, concierge_lead
-- concierge/concierge_lead sólo ve casos donde tiene assignment activo

-- Helper interno de autorización (idempotente)
CREATE OR REPLACE FUNCTION public._cv11_can_view_travel_ops(_uid uuid)
RETURNS TABLE(can_view boolean, is_admin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin')
     OR public.has_role(_uid,'concierge') OR public.has_role(_uid,'concierge_lead')) AS can_view,
    (public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin')) AS is_admin;
$$;

REVOKE ALL ON FUNCTION public._cv11_can_view_travel_ops(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._cv11_can_view_travel_ops(uuid) TO authenticated;

-- Índices auxiliares (idempotentes)
CREATE INDEX IF NOT EXISTS idx_travel_plans_status_updated ON public.travel_plans(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_plans_case_id ON public.travel_plans(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alux_plan_proposals_plan_status ON public.alux_plan_proposals(plan_id, status);
CREATE INDEX IF NOT EXISTS idx_concierge_proposals_case_status ON public.concierge_proposals(case_id, status);
CREATE INDEX IF NOT EXISTS idx_concierge_assignments_user_active ON public.concierge_assignments(concierge_user_id) WHERE released_at IS NULL;

-- ============================================================
-- RPC 1: admin_travel_plan_overview
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_travel_plan_overview()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_can boolean;
  v_is_admin boolean;
  v_scope_cases uuid[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT can_view, is_admin INTO v_can, v_is_admin FROM public._cv11_can_view_travel_ops(v_uid);
  IF NOT v_can THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;

  IF NOT v_is_admin THEN
    SELECT array_agg(DISTINCT case_id) INTO v_scope_cases
    FROM public.concierge_assignments
    WHERE concierge_user_id = v_uid AND released_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'active_plans', (
      SELECT count(*) FROM public.travel_plans tp
      WHERE tp.status IN ('draft','active','shared_with_concierge')
        AND tp.archived_at IS NULL
        AND (v_is_admin OR (tp.case_id IS NOT NULL AND tp.case_id = ANY(COALESCE(v_scope_cases, ARRAY[]::uuid[]))))
    ),
    'plans_with_pending_alux', (
      SELECT count(DISTINCT app.plan_id) FROM public.alux_plan_proposals app
      JOIN public.travel_plans tp ON tp.id = app.plan_id
      WHERE app.status = 'pending' AND tp.archived_at IS NULL
        AND (v_is_admin OR (tp.case_id IS NOT NULL AND tp.case_id = ANY(COALESCE(v_scope_cases, ARRAY[]::uuid[]))))
    ),
    'plans_with_open_concierge_case', (
      SELECT count(DISTINCT tp.id) FROM public.travel_plans tp
      JOIN public.concierge_cases cc ON cc.id = tp.case_id
      WHERE cc.status NOT IN ('closed','cancelled','won','lost')
        AND tp.archived_at IS NULL
        AND (v_is_admin OR cc.id = ANY(COALESCE(v_scope_cases, ARRAY[]::uuid[])))
    ),
    'proposals_awaiting_over_48h', (
      SELECT count(*) FROM public.concierge_proposals cp
      WHERE cp.status = 'sent' AND cp.sent_at IS NOT NULL
        AND cp.sent_at < now() - interval '48 hours'
        AND (v_is_admin OR cp.case_id = ANY(COALESCE(v_scope_cases, ARRAY[]::uuid[])))
    ),
    'proposals_acceptance_rate_30d', (
      SELECT CASE
        WHEN count(*) FILTER (WHERE cp.status IN ('accepted','rejected','expired')) = 0 THEN NULL
        ELSE round(
          100.0 * count(*) FILTER (WHERE cp.status = 'accepted')::numeric
          / count(*) FILTER (WHERE cp.status IN ('accepted','rejected','expired'))::numeric,
          1
        )
      END
      FROM public.concierge_proposals cp
      WHERE cp.updated_at >= now() - interval '30 days'
        AND (v_is_admin OR cp.case_id = ANY(COALESCE(v_scope_cases, ARRAY[]::uuid[])))
    ),
    'generated_at', now()
  );
END; $$;

REVOKE ALL ON FUNCTION public.admin_travel_plan_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_travel_plan_overview() TO authenticated;

-- ============================================================
-- RPC 2: admin_list_active_travel_plans
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_active_travel_plans(
  p_kpi_filter text DEFAULT NULL,        -- NULL | 'active' | 'pending_alux' | 'open_case' | 'proposals_sla' | 'closed'
  p_plan_status text DEFAULT NULL,       -- NULL | enum literal
  p_priority text DEFAULT NULL,          -- NULL | 'critical' | 'high' | 'medium' | 'low'
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
      it.items_count
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
    WHERE
      -- Ámbito por rol
      (v_is_admin AND NOT p_only_mine)
      OR (tp.case_id IS NOT NULL AND tp.case_id = ANY(COALESCE(v_scope_cases, ARRAY[]::uuid[])))
      -- Estado
      AND (p_include_closed OR (tp.status <> 'archived' AND tp.archived_at IS NULL))
  ),
  enriched AS (
    SELECT
      b.*,
      -- Intención derivada
      CASE
        WHEN b.case_status IS NOT NULL AND b.case_status NOT IN ('closed','cancelled','lost') THEN 'high'
        WHEN b.latest_proposal_id IS NOT NULL THEN 'high'
        WHEN b.plan_status = 'shared_with_concierge' THEN 'high'
        WHEN b.items_count >= 5 OR b.pending_alux_count > 0 THEN 'medium'
        WHEN b.items_count > 0 THEN 'low'
        ELSE 'exploring'
      END AS intent_level,
      -- SLA riesgo
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
      -- Días hasta viaje
      CASE WHEN b.start_date IS NOT NULL THEN (b.start_date - CURRENT_DATE) ELSE NULL END AS days_to_trip
    FROM base b
  ),
  prioritized AS (
    SELECT
      e.*,
      -- Prioridad derivada
      CASE
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
      )
      AND (p_plan_status IS NULL OR p.plan_status::text = p_plan_status)
      AND (p_priority IS NULL OR p.priority = p_priority)
      AND (p_search IS NULL OR p_search = '' OR
           p.title ILIKE '%'||p_search||'%' OR
           p.public_display_name ILIKE '%'||p_search||'%' OR
           p.public_handle ILIKE '%'||p_search||'%')
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

-- ============================================================
-- RPC 3: admin_get_travel_plan_detail
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_travel_plan_detail(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_can boolean; v_is_admin boolean;
  v_scope boolean;
  v_plan record;
  v_traveler jsonb;
  v_items jsonb;
  v_alux jsonb;
  v_case jsonb;
  v_proposal jsonb;
  v_timeline jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT can_view, is_admin INTO v_can, v_is_admin FROM public._cv11_can_view_travel_ops(v_uid);
  IF NOT v_can THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_plan FROM public.travel_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='02000'; END IF;

  -- Scope: admin ve todo; concierge sólo si tiene assignment activo al caso
  v_scope := v_is_admin;
  IF NOT v_scope AND v_plan.case_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.concierge_assignments
      WHERE case_id = v_plan.case_id AND concierge_user_id = v_uid AND released_at IS NULL
    ) INTO v_scope;
  END IF;
  IF NOT v_scope THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;

  -- Traveler (email/phone omitidos por defecto; sólo admin ve email desde auth.users)
  SELECT jsonb_build_object(
    'user_id', trp.user_id,
    'display_name', COALESCE(trp.public_display_name, 'Viajero'),
    'handle', trp.public_handle,
    'avatar_url', trp.avatar_url,
    'language', trp.preferred_language,
    'country', trp.home_country,
    'email', CASE WHEN v_is_admin THEN (SELECT au.email FROM auth.users au WHERE au.id = v_plan.user_id) ELSE NULL END
  ) INTO v_traveler
  FROM public.traveler_profiles trp WHERE trp.user_id = v_plan.user_id;

  IF v_traveler IS NULL THEN
    v_traveler := jsonb_build_object('user_id', v_plan.user_id, 'display_name', 'Viajero');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.position), '[]'::jsonb) INTO v_items
  FROM (
    SELECT id, item_kind, target_id, position, day_index, notes, snapshot, created_at
    FROM public.travel_plan_items WHERE plan_id = p_plan_id ORDER BY position
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(a)::jsonb ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_alux
  FROM (
    SELECT id, entity_type, entity_id, title, subtitle, rationale, status, created_at, decided_at
    FROM public.alux_plan_proposals
    WHERE plan_id = p_plan_id AND status IN ('pending','accepted')
    ORDER BY created_at DESC LIMIT 20
  ) a;

  IF v_plan.case_id IS NOT NULL THEN
    SELECT to_jsonb(row_to_json(c)) INTO v_case FROM (
      SELECT cc.id, cc.status, cc.priority, cc.summary, cc.target_response_at, cc.last_activity_at,
             (SELECT jsonb_agg(jsonb_build_object('user_id', ca.concierge_user_id, 'assigned_at', ca.assigned_at))
              FROM public.concierge_assignments ca WHERE ca.case_id = cc.id AND ca.released_at IS NULL) AS assignees
      FROM public.concierge_cases cc WHERE cc.id = v_plan.case_id
    ) c;

    SELECT to_jsonb(row_to_json(p)) INTO v_proposal FROM (
      SELECT cp.id, cp.status, cp.version, cp.currency, cp.total_amount_cents,
             cp.valid_until, cp.sent_at, cp.responded_at, cp.summary,
             (SELECT jsonb_agg(jsonb_build_object('id', pi.id, 'position', pi.position,
                 'amount_cents', pi.amount_cents, 'currency', pi.currency, 'notes', pi.notes) ORDER BY pi.position)
              FROM public.concierge_proposal_items pi WHERE pi.proposal_id = cp.id) AS items
      FROM public.concierge_proposals cp
      WHERE cp.case_id = v_plan.case_id
      ORDER BY cp.created_at DESC LIMIT 1
    ) p;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.occurred_at DESC), '[]'::jsonb) INTO v_timeline
    FROM (
      SELECT event_type, severity, summary, occurred_at
      FROM public.concierge_case_timeline
      WHERE case_id = v_plan.case_id
      ORDER BY occurred_at DESC LIMIT 20
    ) t;
  ELSE
    v_case := NULL; v_proposal := NULL; v_timeline := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'plan', jsonb_build_object(
      'id', v_plan.id, 'title', v_plan.title, 'status', v_plan.status,
      'start_date', v_plan.start_date, 'end_date', v_plan.end_date,
      'party_size', v_plan.party_size, 'notes', v_plan.notes,
      'updated_at', v_plan.updated_at, 'created_at', v_plan.created_at,
      'case_id', v_plan.case_id
    ),
    'traveler', v_traveler,
    'items', v_items,
    'alux_proposals', v_alux,
    'concierge_case', v_case,
    'latest_concierge_proposal', v_proposal,
    'timeline', v_timeline,
    'generated_at', now()
  );
END; $$;

REVOKE ALL ON FUNCTION public.admin_get_travel_plan_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_travel_plan_detail(uuid) TO authenticated;
