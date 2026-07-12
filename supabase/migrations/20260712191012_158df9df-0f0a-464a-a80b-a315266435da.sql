
-- ============================================================================
-- CV1.2 · Bandeja "Necesita atención" + Señal comercial `sales_opportunity`
-- ----------------------------------------------------------------------------
-- Reutiliza el helper `_cv11_can_view_travel_ops` y las tablas del contrato
-- Travel Plan (travel_plans, concierge_cases, concierge_assignments,
-- concierge_proposals, alux_plan_proposals). Cero mutaciones.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_ops_attention_queue(
  p_only_mine boolean DEFAULT false,
  p_limit integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_can boolean;
  v_signals jsonb;
BEGIN
  v_can := public._cv11_can_view_travel_ops(v_uid);
  IF NOT v_can THEN
    RAISE EXCEPTION 'FORBIDDEN' USING errcode = '42501';
  END IF;

  v_is_admin :=
    public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'super_admin'::app_role)
    OR public.has_role(v_uid, 'concierge_lead'::app_role);

  IF p_limit IS NULL OR p_limit < 1 THEN p_limit := 60; END IF;
  IF p_limit > 200 THEN p_limit := 200; END IF;

  WITH
  -- Universo de planes visibles + snapshot mínimo por plan
  base AS (
    SELECT
      tp.id            AS plan_id,
      tp.title,
      tp.status        AS plan_status,
      tp.start_date,
      tp.updated_at,
      tp.user_id,
      tprof.display_name,
      tprof.handle,
      cc.id            AS case_id,
      cc.status        AS case_status,
      cc.target_response_at,
      cc.last_activity_at,
      (
        SELECT count(*)::int FROM public.travel_plan_items i WHERE i.plan_id = tp.id
      ) AS items_count,
      (
        SELECT count(*)::int FROM public.alux_plan_proposals p
        WHERE p.plan_id = tp.id AND p.status = 'proposed'
      ) AS pending_alux,
      (
        SELECT min(p.created_at) FROM public.alux_plan_proposals p
        WHERE p.plan_id = tp.id AND p.status = 'proposed'
      ) AS oldest_alux_pending,
      (
        SELECT count(*)::int FROM public.alux_plan_proposals p
        WHERE p.plan_id = tp.id AND p.status = 'accepted'
      ) AS accepted_alux,
      cp.id            AS proposal_id,
      cp.status        AS proposal_status,
      cp.sent_at       AS proposal_sent_at
    FROM public.travel_plans tp
    LEFT JOIN public.traveler_profiles tprof ON tprof.user_id = tp.user_id
    LEFT JOIN public.concierge_cases cc ON cc.id = tp.case_id
    LEFT JOIN LATERAL (
      SELECT p.id, p.status, p.sent_at
      FROM public.concierge_proposals p
      WHERE p.case_id = cc.id
      ORDER BY p.version DESC
      LIMIT 1
    ) cp ON true
    WHERE tp.status IN ('draft','active','shared_with_concierge')
      AND (
        NOT p_only_mine
        OR (
          cc.id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.concierge_assignments ca
            WHERE ca.case_id = cc.id
              AND ca.user_id = v_uid
              AND ca.unassigned_at IS NULL
          )
        )
      )
  ),
  -- Enriquecido con intent_level y campos derivados
  enriched AS (
    SELECT
      b.*,
      CASE WHEN b.start_date IS NOT NULL
        THEN (b.start_date - CURRENT_DATE)
        ELSE NULL
      END AS days_to_trip,
      CASE
        WHEN b.case_status IN ('proposal_sent','won','accepted')
          OR b.proposal_status = 'accepted' THEN 'high'
        WHEN b.case_id IS NOT NULL
          OR b.proposal_id IS NOT NULL
          OR (b.items_count >= 3)
          OR (b.start_date IS NOT NULL AND b.start_date <= CURRENT_DATE + INTERVAL '14 days') THEN 'medium'
        WHEN b.items_count >= 1 THEN 'low'
        ELSE 'exploring'
      END AS intent_level
    FROM base b
  ),
  -- ==================== SEÑALES OPERATIVAS ====================
  ops_sla_breach AS (
    SELECT jsonb_build_object(
      'type','sla_breach','category','ops','severity','critical',
      'plan_id', e.plan_id, 'case_id', e.case_id,
      'traveler_display_name', COALESCE(e.display_name, 'Viajero'),
      'age_hours', GREATEST(0, EXTRACT(EPOCH FROM (now() - e.target_response_at))/3600)::int,
      'rationale', 'SLA del caso vencido',
      'deep_link', '/cms/travel-plans',
      'score', 100
    ) AS signal
    FROM enriched e
    WHERE e.case_id IS NOT NULL
      AND e.target_response_at IS NOT NULL
      AND e.target_response_at < now()
      AND (e.case_status IS NULL OR e.case_status NOT IN ('closed','cancelled','won','lost'))
  ),
  ops_sla_at_risk AS (
    SELECT jsonb_build_object(
      'type','sla_at_risk','category','ops','severity','high',
      'plan_id', e.plan_id, 'case_id', e.case_id,
      'traveler_display_name', COALESCE(e.display_name, 'Viajero'),
      'age_hours', 0,
      'rationale', 'SLA del caso vence en menos de 4 horas',
      'deep_link', '/cms/travel-plans',
      'score', 80
    ) AS signal
    FROM enriched e
    WHERE e.case_id IS NOT NULL
      AND e.target_response_at IS NOT NULL
      AND e.target_response_at BETWEEN now() AND now() + INTERVAL '4 hours'
      AND (e.case_status IS NULL OR e.case_status NOT IN ('closed','cancelled','won','lost'))
  ),
  ops_proposal_awaiting AS (
    SELECT jsonb_build_object(
      'type','proposal_awaiting','category','ops','severity','high',
      'plan_id', e.plan_id, 'case_id', e.case_id,
      'traveler_display_name', COALESCE(e.display_name, 'Viajero'),
      'age_hours', GREATEST(0, EXTRACT(EPOCH FROM (now() - e.proposal_sent_at))/3600)::int,
      'rationale', 'Propuesta enviada hace más de 48h sin respuesta',
      'deep_link', '/cms/travel-plans',
      'score', 70
    ) AS signal
    FROM enriched e
    WHERE e.proposal_status = 'sent'
      AND e.proposal_sent_at IS NOT NULL
      AND e.proposal_sent_at < now() - INTERVAL '48 hours'
  ),
  ops_alux_pending AS (
    SELECT jsonb_build_object(
      'type','alux_pending','category','ops','severity','medium',
      'plan_id', e.plan_id, 'case_id', e.case_id,
      'traveler_display_name', COALESCE(e.display_name, 'Viajero'),
      'age_hours', GREATEST(0, EXTRACT(EPOCH FROM (now() - e.oldest_alux_pending))/3600)::int,
      'rationale', e.pending_alux || ' sugerencias de Alux esperando decisión',
      'deep_link', '/cms/travel-plans',
      'score', 50
    ) AS signal
    FROM enriched e
    WHERE e.pending_alux >= 3
      AND e.oldest_alux_pending IS NOT NULL
      AND e.oldest_alux_pending < now() - INTERVAL '24 hours'
  ),
  ops_high_intent_no_case AS (
    SELECT jsonb_build_object(
      'type','high_intent_no_case','category','ops','severity','high',
      'plan_id', e.plan_id, 'case_id', NULL,
      'traveler_display_name', COALESCE(e.display_name, 'Viajero'),
      'age_hours', 0,
      'rationale', 'Viajero con intención alta sin caso concierge asignado',
      'deep_link', '/cms/travel-plans',
      'score', 75
    ) AS signal
    FROM enriched e
    WHERE e.intent_level = 'high' AND e.case_id IS NULL
  ),
  ops_trip_imminent AS (
    SELECT jsonb_build_object(
      'type','trip_imminent','category','ops','severity','high',
      'plan_id', e.plan_id, 'case_id', e.case_id,
      'traveler_display_name', COALESCE(e.display_name, 'Viajero'),
      'age_hours', 0,
      'rationale', 'Viaje inicia en ' || e.days_to_trip || ' días',
      'deep_link', '/cms/travel-plans',
      'score', 65
    ) AS signal
    FROM enriched e
    WHERE e.days_to_trip IS NOT NULL
      AND e.days_to_trip BETWEEN 0 AND 7
      AND e.case_id IS NOT NULL
      AND (e.case_status IS NULL OR e.case_status NOT IN ('closed','cancelled','won','lost'))
  ),
  -- ==================== SEÑAL COMERCIAL ====================
  sales_scored AS (
    SELECT
      e.*,
      (
        CASE e.intent_level
          WHEN 'high' THEN 4
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END
        + CASE WHEN e.items_count >= 3 THEN 2 WHEN e.items_count >= 1 THEN 1 ELSE 0 END
        + CASE WHEN e.accepted_alux >= 1 THEN 1 ELSE 0 END
        + CASE WHEN e.plan_status IN ('active','shared_with_concierge') THEN 1 ELSE 0 END
        + CASE
            WHEN e.days_to_trip IS NOT NULL AND e.days_to_trip BETWEEN 0 AND 14 THEN 2
            WHEN e.days_to_trip IS NOT NULL AND e.days_to_trip BETWEEN 15 AND 30 THEN 1
            ELSE 0
          END
        + CASE
            WHEN e.case_id IS NULL THEN 1  -- oportunidad sin capturar
            WHEN e.case_status IN ('closed','cancelled','lost') THEN -3
            ELSE 0
          END
        + CASE WHEN e.updated_at > now() - INTERVAL '3 days' THEN 1 ELSE 0 END
      ) AS sales_score
    FROM enriched e
  ),
  sales_opportunity AS (
    SELECT jsonb_build_object(
      'type','sales_opportunity','category','sales',
      'severity', CASE WHEN s.sales_score >= 6 THEN 'high' ELSE 'medium' END,
      'plan_id', s.plan_id,
      'case_id', s.case_id,
      'traveler_display_name', COALESCE(s.display_name, 'Viajero'),
      'age_hours', 0,
      'rationale', concat_ws(' · ',
        'Score ' || s.sales_score,
        'Intención ' || s.intent_level,
        CASE WHEN s.items_count > 0 THEN s.items_count || ' ítems' END,
        CASE WHEN s.days_to_trip IS NOT NULL AND s.days_to_trip <= 30 THEN 'Viaje en ' || s.days_to_trip || 'd' END,
        CASE WHEN s.case_id IS NULL THEN 'Sin caso Concierge' END,
        CASE WHEN s.accepted_alux > 0 THEN s.accepted_alux || ' Alux aceptadas' END
      ),
      'deep_link', '/cms/travel-plans',
      'score', LEAST(100, s.sales_score * 10)
    ) AS signal
    FROM sales_scored s
    WHERE s.sales_score >= 4
      AND (s.case_status IS NULL OR s.case_status NOT IN ('closed','cancelled','lost'))
  ),
  all_signals AS (
    SELECT signal FROM ops_sla_breach
    UNION ALL SELECT signal FROM ops_sla_at_risk
    UNION ALL SELECT signal FROM ops_proposal_awaiting
    UNION ALL SELECT signal FROM ops_alux_pending
    UNION ALL SELECT signal FROM ops_high_intent_no_case
    UNION ALL SELECT signal FROM ops_trip_imminent
    UNION ALL SELECT signal FROM sales_opportunity
  ),
  ordered AS (
    SELECT signal
    FROM all_signals
    ORDER BY (signal->>'score')::int DESC
    LIMIT p_limit
  ),
  counts AS (
    SELECT
      count(*) FILTER (WHERE signal->>'category' = 'ops' AND signal->>'severity' = 'critical')::int AS ops_critical,
      count(*) FILTER (WHERE signal->>'category' = 'ops' AND signal->>'severity' = 'high')::int AS ops_high,
      count(*) FILTER (WHERE signal->>'category' = 'ops' AND signal->>'severity' = 'medium')::int AS ops_medium,
      count(*) FILTER (WHERE signal->>'category' = 'sales' AND signal->>'severity' = 'high')::int AS sales_high,
      count(*) FILTER (WHERE signal->>'category' = 'sales' AND signal->>'severity' = 'medium')::int AS sales_medium,
      count(*)::int AS total
    FROM all_signals
  )
  SELECT jsonb_build_object(
    'generated_at', to_jsonb(now()),
    'is_admin', v_is_admin,
    'signals', COALESCE((SELECT jsonb_agg(signal) FROM ordered), '[]'::jsonb),
    'counts', (SELECT to_jsonb(counts) FROM counts)
  )
  INTO v_signals;

  RETURN v_signals;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ops_attention_queue(boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ops_attention_queue(boolean, integer) TO authenticated;

-- Índice de apoyo para el conteo de items por plan (usado también en CV1.1).
CREATE INDEX IF NOT EXISTS idx_travel_plan_items_plan_id
  ON public.travel_plan_items (plan_id);

-- Índice de apoyo para status de propuestas Alux (usado en el ranking comercial).
CREATE INDEX IF NOT EXISTS idx_alux_plan_proposals_plan_status
  ON public.alux_plan_proposals (plan_id, status);

COMMENT ON FUNCTION public.admin_ops_attention_queue(boolean, integer) IS
'CV1.2 · Bandeja de atención priorizada. Devuelve señales operativas (SLA, propuestas, Alux, viajes inminentes) y comerciales (sales_opportunity) para Founder/Admin/Concierge. Autoriza mediante _cv11_can_view_travel_ops. Cero mutaciones.';
