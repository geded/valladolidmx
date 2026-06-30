
-- =====================================================================
-- 14.60.5 — Asignaciones, Prioridad y SLA por expediente
-- =====================================================================

-- 1) Columnas aditivas sobre concierge_cases ---------------------------
ALTER TABLE public.concierge_cases
  ADD COLUMN IF NOT EXISTS target_response_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_activity_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS priority_source    text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS priority_reason    text NULL;

-- Backfill: normaliza prioridad y last_activity_at
UPDATE public.concierge_cases
   SET priority = 'normal'
 WHERE priority IS NULL OR priority NOT IN ('low','normal','high','urgent');

UPDATE public.concierge_cases
   SET last_activity_at = COALESCE(updated_at, created_at, now())
 WHERE last_activity_at IS NULL;

-- CHECKs (idempotentes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='concierge_cases_priority_chk') THEN
    ALTER TABLE public.concierge_cases
      ADD CONSTRAINT concierge_cases_priority_chk
      CHECK (priority IN ('low','normal','high','urgent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='concierge_cases_priority_source_chk') THEN
    ALTER TABLE public.concierge_cases
      ADD CONSTRAINT concierge_cases_priority_source_chk
      CHECK (priority_source IN ('manual','sla','trip_date','payment','system','alux','other'));
  END IF;
END $$;

ALTER TABLE public.concierge_cases ALTER COLUMN priority SET DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS concierge_cases_priority_idx       ON public.concierge_cases(priority);
CREATE INDEX IF NOT EXISTS concierge_cases_target_resp_idx    ON public.concierge_cases(target_response_at);
CREATE INDEX IF NOT EXISTS concierge_cases_last_activity_idx  ON public.concierge_cases(last_activity_at DESC);

-- Helper: intervalo objetivo por prioridad
CREATE OR REPLACE FUNCTION public._concierge_target_for_priority(_priority text)
RETURNS interval
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(_priority,'normal'))
    WHEN 'urgent' THEN interval '2 hours'
    WHEN 'high'   THEN interval '8 hours'
    WHEN 'low'    THEN interval '72 hours'
    ELSE              interval '24 hours'
  END;
$$;

-- Helper: first_response_at (primera nota visible al viajero por interno o primera propuesta enviada)
CREATE OR REPLACE FUNCTION public._concierge_first_response_at(_case_id uuid)
RETURNS timestamptz
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT LEAST(
    (SELECT min(sent_at) FROM public.concierge_proposals
       WHERE case_id = _case_id AND sent_at IS NOT NULL),
    (SELECT min(n.created_at) FROM public.concierge_case_notes n
       JOIN public.concierge_cases c ON c.id = n.case_id
      WHERE n.case_id = _case_id
        AND n.visibility = 'traveler'
        AND n.author_user_id <> c.traveler_user_id)
  );
$$;

-- Helper: sla_status calculado (on_time si ya hubo primera respuesta o si faltan > 15% del margen)
CREATE OR REPLACE FUNCTION public._concierge_sla_status(
  _target_response_at timestamptz,
  _created_at         timestamptz,
  _first_response_at  timestamptz
) RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _target_response_at IS NULL THEN NULL
    WHEN _first_response_at IS NOT NULL THEN 'on_time'
    WHEN now() > _target_response_at THEN 'overdue'
    WHEN now() >= _target_response_at
         - GREATEST(
             (extract(epoch from (_target_response_at - coalesce(_created_at, _target_response_at - interval '24 hours'))) * 0.15) * interval '1 second',
             interval '1 hour'
           )
         THEN 'due_soon'
    ELSE 'on_time'
  END;
$$;

-- Inicializa target_response_at en filas existentes según prioridad
UPDATE public.concierge_cases
   SET target_response_at = created_at + public._concierge_target_for_priority(priority)
 WHERE target_response_at IS NULL;

-- 2) Tabla concierge_assignments ---------------------------------------
CREATE TABLE IF NOT EXISTS public.concierge_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             uuid NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  concierge_user_id   uuid NOT NULL REFERENCES auth.users(id),
  assigned_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','released','reassigned')),
  assigned_at         timestamptz NOT NULL DEFAULT now(),
  released_at         timestamptz NULL,
  reason              text NULL,
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS concierge_assignments_one_active_per_case
  ON public.concierge_assignments(case_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS concierge_assignments_user_status_idx
  ON public.concierge_assignments(concierge_user_id, status);
CREATE INDEX IF NOT EXISTS concierge_assignments_case_time_idx
  ON public.concierge_assignments(case_id, assigned_at DESC);

GRANT SELECT ON public.concierge_assignments TO authenticated;
GRANT ALL    ON public.concierge_assignments TO service_role;

ALTER TABLE public.concierge_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS concierge_assignments_select ON public.concierge_assignments;
CREATE POLICY concierge_assignments_select
  ON public.concierge_assignments
  FOR SELECT TO authenticated
  USING (public.concierge_can_view_case(case_id, auth.uid()));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public._concierge_assignments_touch_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_concierge_assignments_updated ON public.concierge_assignments;
CREATE TRIGGER trg_concierge_assignments_updated
  BEFORE UPDATE ON public.concierge_assignments
  FOR EACH ROW EXECUTE FUNCTION public._concierge_assignments_touch_updated();

-- 3) Triggers de actividad ---------------------------------------------
CREATE OR REPLACE FUNCTION public._concierge_touch_activity_from_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_case uuid;
BEGIN
  v_case := COALESCE(NEW.case_id, OLD.case_id);
  IF v_case IS NOT NULL THEN
    UPDATE public.concierge_cases
       SET last_activity_at = now()
     WHERE id = v_case AND last_activity_at < now();
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'concierge_case_notes',
    'concierge_case_timeline',
    'concierge_case_requests',
    'concierge_proposals',
    'concierge_quotes',
    'concierge_assignments'
  ]) AS t
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_concierge_touch_activity ON public.%I', r.t);
    EXECUTE format(
      'CREATE TRIGGER trg_concierge_touch_activity AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public._concierge_touch_activity_from_child()',
      r.t
    );
  END LOOP;
END $$;

-- 4) RPC: concierge_case_touch_activity (helper público idempotente) ----
CREATE OR REPLACE FUNCTION public.concierge_case_touch_activity(_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  UPDATE public.concierge_cases SET last_activity_at = now() WHERE id = _case_id;
END $$;

REVOKE ALL ON FUNCTION public.concierge_case_touch_activity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_touch_activity(uuid) TO authenticated;

-- 5) RPC: concierge_case_set_priority ----------------------------------
CREATE OR REPLACE FUNCTION public.concierge_case_set_priority(
  _case_id uuid,
  _priority text,
  _source   text DEFAULT 'manual',
  _reason   text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_can boolean;
  v_old text;
  v_target_manual boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF _priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'invalid_priority' USING errcode='22023';
  END IF;
  IF coalesce(_source,'manual') NOT IN ('manual','sla','trip_date','payment','system','alux','other') THEN
    RAISE EXCEPTION 'invalid_priority_source' USING errcode='22023';
  END IF;

  v_can := public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
        OR public.has_role(v_uid,'concierge_lead')
        OR EXISTS (SELECT 1 FROM public.concierge_assignments
                    WHERE case_id = _case_id AND status='active'
                      AND concierge_user_id = v_uid);
  IF NOT v_can THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;

  SELECT priority INTO v_old FROM public.concierge_cases WHERE id = _case_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'case_not_found' USING errcode='02000'; END IF;

  -- Recalcula target_response_at salvo que haya sido fijado manualmente antes
  SELECT (priority_reason IS NOT NULL AND priority_source = 'manual'
          AND priority_reason LIKE 'target_manual:%')
    INTO v_target_manual FROM public.concierge_cases WHERE id = _case_id;

  UPDATE public.concierge_cases
     SET priority        = _priority,
         priority_source = coalesce(_source,'manual'),
         priority_reason = _reason,
         target_response_at = CASE WHEN COALESCE(v_target_manual,false)
                                   THEN target_response_at
                                   ELSE created_at + public._concierge_target_for_priority(_priority)
                              END,
         updated_at = now()
   WHERE id = _case_id;

  INSERT INTO public.concierge_case_timeline(case_id, event_type, severity, actor_user_id, summary, payload, occurred_at)
  VALUES (_case_id, 'Concierge.Case.PriorityChanged', 'info', v_uid,
          format('Prioridad: %s → %s', v_old, _priority),
          jsonb_build_object('from', v_old, 'to', _priority, 'source', coalesce(_source,'manual'), 'reason', _reason),
          now());
END $$;

REVOKE ALL ON FUNCTION public.concierge_case_set_priority(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_set_priority(uuid,text,text,text) TO authenticated;

-- 6) RPC: concierge_case_set_target_response ---------------------------
CREATE OR REPLACE FUNCTION public.concierge_case_set_target_response(
  _case_id            uuid,
  _target_response_at timestamptz,
  _reason             text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_can boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  v_can := public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
        OR public.has_role(v_uid,'concierge_lead')
        OR EXISTS (SELECT 1 FROM public.concierge_assignments
                    WHERE case_id = _case_id AND status='active'
                      AND concierge_user_id = v_uid);
  IF NOT v_can THEN RAISE EXCEPTION 'forbidden' USING errcode='42501'; END IF;

  UPDATE public.concierge_cases
     SET target_response_at = _target_response_at,
         priority_reason    = CASE WHEN _target_response_at IS NULL THEN priority_reason
                                   ELSE 'target_manual:' || coalesce(_reason,'') END,
         updated_at         = now()
   WHERE id = _case_id;

  INSERT INTO public.concierge_case_timeline(case_id, event_type, severity, actor_user_id, summary, payload, occurred_at)
  VALUES (_case_id, 'Concierge.Case.TargetResponseSet', 'info', v_uid,
          'Target de respuesta actualizado',
          jsonb_build_object('target_response_at', _target_response_at, 'reason', _reason),
          now());
END $$;

REVOKE ALL ON FUNCTION public.concierge_case_set_target_response(uuid,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_set_target_response(uuid,timestamptz,text) TO authenticated;

-- 7) RPC: concierge_case_assign / reassign / release -------------------
CREATE OR REPLACE FUNCTION public.concierge_case_assign(
  _case_id uuid,
  _concierge_user_id uuid,
  _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_lead boolean;
  v_has_active boolean;
  v_self boolean;
  v_assignment_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF _concierge_user_id IS NULL THEN RAISE EXCEPTION 'invalid_concierge' USING errcode='22023'; END IF;

  v_is_lead := public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
            OR public.has_role(v_uid,'concierge_lead');
  v_self    := (_concierge_user_id = v_uid)
            AND (public.has_role(v_uid,'concierge') OR public.has_role(v_uid,'concierge_lead'));
  v_has_active := EXISTS (SELECT 1 FROM public.concierge_assignments
                           WHERE case_id = _case_id AND status='active');

  IF NOT v_is_lead AND NOT (v_self AND NOT v_has_active) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  -- Cierra activos previos como reassigned
  UPDATE public.concierge_assignments
     SET status='reassigned', released_at = now(), updated_at = now()
   WHERE case_id = _case_id AND status='active';

  INSERT INTO public.concierge_assignments(case_id, concierge_user_id, assigned_by_user_id, status, reason)
  VALUES (_case_id, _concierge_user_id, v_uid, 'active', _reason)
  RETURNING id INTO v_assignment_id;

  -- Asegura participante (idempotente)
  INSERT INTO public.concierge_case_participants(case_id, user_id, role, is_active)
  VALUES (_case_id, _concierge_user_id, 'concierge', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.concierge_case_timeline(case_id, event_type, severity, actor_user_id, summary, payload, occurred_at)
  VALUES (_case_id,
          CASE WHEN v_has_active THEN 'Concierge.Case.Reassigned' ELSE 'Concierge.Case.Assigned' END,
          'info', v_uid,
          'Asignación de expediente',
          jsonb_build_object('concierge_user_id', _concierge_user_id, 'reason', _reason),
          now());

  RETURN v_assignment_id;
END $$;

REVOKE ALL ON FUNCTION public.concierge_case_assign(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_assign(uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_case_reassign(
  _case_id uuid,
  _new_concierge_user_id uuid,
  _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
          OR public.has_role(v_uid,'concierge_lead')) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  RETURN public.concierge_case_assign(_case_id, _new_concierge_user_id, _reason);
END $$;

REVOKE ALL ON FUNCTION public.concierge_case_reassign(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_reassign(uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_case_release(
  _case_id uuid,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_assigned uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT concierge_user_id INTO v_assigned
    FROM public.concierge_assignments
   WHERE case_id = _case_id AND status='active';
  IF v_assigned IS NULL THEN
    RAISE EXCEPTION 'no_active_assignment' USING errcode='02000';
  END IF;
  IF v_assigned <> v_uid AND NOT (public.has_role(v_uid,'admin')
       OR public.has_role(v_uid,'super_admin')
       OR public.has_role(v_uid,'concierge_lead')) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  UPDATE public.concierge_assignments
     SET status='released', released_at = now(), reason = coalesce(_reason, reason), updated_at = now()
   WHERE case_id = _case_id AND status='active';

  INSERT INTO public.concierge_case_timeline(case_id, event_type, severity, actor_user_id, summary, payload, occurred_at)
  VALUES (_case_id, 'Concierge.Case.Released', 'info', v_uid,
          'Liberación de expediente',
          jsonb_build_object('reason', _reason), now());
END $$;

REVOKE ALL ON FUNCTION public.concierge_case_release(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_release(uuid,text) TO authenticated;

-- 8) RPCs de listado: assignments / workload ---------------------------
CREATE OR REPLACE FUNCTION public.concierge_assignments_list_for_case(_case_id uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  RETURN QUERY
    SELECT to_jsonb(a.*) FROM public.concierge_assignments a
     WHERE a.case_id = _case_id
     ORDER BY a.assigned_at DESC;
END $$;

REVOKE ALL ON FUNCTION public.concierge_assignments_list_for_case(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_assignments_list_for_case(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_my_workload()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_active int;
  v_overdue int;
  v_due_soon int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;

  SELECT count(*) INTO v_active
    FROM public.concierge_assignments
   WHERE concierge_user_id = v_uid AND status='active';

  SELECT
    count(*) FILTER (WHERE public._concierge_sla_status(c.target_response_at, c.created_at, public._concierge_first_response_at(c.id)) = 'overdue'),
    count(*) FILTER (WHERE public._concierge_sla_status(c.target_response_at, c.created_at, public._concierge_first_response_at(c.id)) = 'due_soon')
  INTO v_overdue, v_due_soon
  FROM public.concierge_cases c
  WHERE EXISTS (SELECT 1 FROM public.concierge_assignments a
                 WHERE a.case_id = c.id AND a.status='active' AND a.concierge_user_id = v_uid);

  RETURN jsonb_build_object(
    'concierge_user_id', v_uid,
    'active_cases',      v_active,
    'overdue',           coalesce(v_overdue,0),
    'due_soon',          coalesce(v_due_soon,0)
  );
END $$;

REVOKE ALL ON FUNCTION public.concierge_my_workload() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_my_workload() TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_workload_for_lead()
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
          OR public.has_role(v_uid,'concierge_lead')) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  RETURN QUERY
    SELECT jsonb_build_object(
      'concierge_user_id', a.concierge_user_id,
      'active_cases',      count(*) FILTER (WHERE a.status='active'),
      'overdue', count(*) FILTER (
        WHERE a.status='active'
          AND public._concierge_sla_status(c.target_response_at, c.created_at, public._concierge_first_response_at(c.id)) = 'overdue'
      ),
      'due_soon', count(*) FILTER (
        WHERE a.status='active'
          AND public._concierge_sla_status(c.target_response_at, c.created_at, public._concierge_first_response_at(c.id)) = 'due_soon'
      )
    )
    FROM public.concierge_assignments a
    JOIN public.concierge_cases c ON c.id = a.case_id
   WHERE a.status='active'
   GROUP BY a.concierge_user_id
   ORDER BY count(*) DESC;
END $$;

REVOKE ALL ON FUNCTION public.concierge_workload_for_lead() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_workload_for_lead() TO authenticated;

-- 9) RPC: concierge_case_file_v1 actualizada ---------------------------
CREATE OR REPLACE FUNCTION public.concierge_case_file_v1(_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    'user_id', tp.user_id,
    'display_name', tp.display_name,
    'preferred_language', tp.preferred_language
  ) INTO v_traveler
  FROM public.traveler_profiles tp WHERE tp.user_id = v_case.traveler_user_id;

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
$$;

-- 10) RPC: concierge_case_list_for_role (extendida, retrocompatible) ----
DROP FUNCTION IF EXISTS public.concierge_case_list_for_role(text, integer);

CREATE OR REPLACE FUNCTION public.concierge_case_list_for_role(
  _scope                       text    DEFAULT 'traveler',
  _limit                       integer DEFAULT 50,
  _sort                        text    DEFAULT 'updated_at',
  _priority                    text[]  DEFAULT NULL,
  _sla_status                  text[]  DEFAULT NULL,
  _assigned_concierge_user_id  uuid    DEFAULT NULL,
  _min_idle_minutes            integer DEFAULT NULL
) RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_scope TEXT := lower(coalesce(_scope,'traveler'));
  v_lim INT := greatest(1, least(coalesce(_limit,50), 200));
  v_sort TEXT := lower(coalesce(_sort,'updated_at'));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;

  IF v_scope IN ('concierge','unassigned') THEN
    IF NOT public.has_role(v_uid,'concierge') AND NOT public.has_role(v_uid,'concierge_lead')
       AND NOT public.has_role(v_uid,'admin') AND NOT public.has_role(v_uid,'super_admin') THEN
      RAISE EXCEPTION 'forbidden' USING errcode='42501';
    END IF;
  ELSIF v_scope = 'lead' THEN
    IF NOT public.has_role(v_uid,'concierge_lead') AND NOT public.has_role(v_uid,'admin')
       AND NOT public.has_role(v_uid,'super_admin') THEN
      RAISE EXCEPTION 'forbidden' USING errcode='42501';
    END IF;
  ELSIF v_scope = 'admin' THEN
    IF NOT public.has_role(v_uid,'admin') AND NOT public.has_role(v_uid,'super_admin') THEN
      RAISE EXCEPTION 'forbidden' USING errcode='42501';
    END IF;
  ELSIF v_scope <> 'traveler' THEN
    RAISE EXCEPTION 'scope inválido: %', v_scope USING errcode='22023';
  END IF;

  RETURN QUERY
    WITH base AS (
      SELECT c.*,
             (SELECT a.concierge_user_id FROM public.concierge_assignments a
               WHERE a.case_id = c.id AND a.status='active' LIMIT 1) AS assigned_concierge_user_id,
             public._concierge_first_response_at(c.id) AS first_response_at
        FROM public.concierge_cases c
       WHERE
         CASE v_scope
           WHEN 'traveler'  THEN c.traveler_user_id = v_uid
           WHEN 'concierge' THEN EXISTS (
             SELECT 1 FROM public.concierge_assignments a
              WHERE a.case_id = c.id AND a.status='active' AND a.concierge_user_id = v_uid
           )
           WHEN 'unassigned' THEN NOT EXISTS (
             SELECT 1 FROM public.concierge_assignments a
              WHERE a.case_id = c.id AND a.status='active'
           )
           ELSE TRUE
         END
    ), enriched AS (
      SELECT b.*,
             public._concierge_sla_status(b.target_response_at, b.created_at, b.first_response_at) AS sla_status,
             extract(epoch from (now() - b.last_activity_at))/60.0 AS idle_minutes
        FROM base b
    ), filtered AS (
      SELECT * FROM enriched
       WHERE (_priority IS NULL OR priority = ANY(_priority))
         AND (_sla_status IS NULL OR sla_status = ANY(_sla_status))
         AND (_assigned_concierge_user_id IS NULL
              OR assigned_concierge_user_id = _assigned_concierge_user_id)
         AND (_min_idle_minutes IS NULL OR idle_minutes >= _min_idle_minutes)
    )
    SELECT to_jsonb(f.*)
      FROM filtered f
     ORDER BY
       CASE WHEN v_sort = 'priority'         THEN CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END END ASC NULLS LAST,
       CASE WHEN v_sort = 'sla_status'       THEN CASE sla_status WHEN 'overdue' THEN 0 WHEN 'due_soon' THEN 1 WHEN 'on_time' THEN 2 ELSE 3 END END ASC NULLS LAST,
       CASE WHEN v_sort = 'idle'             THEN idle_minutes END DESC NULLS LAST,
       CASE WHEN v_sort = 'created_at'       THEN created_at END DESC NULLS LAST,
       CASE WHEN v_sort = 'trip_date'        THEN NULL::timestamptz END DESC NULLS LAST,
       CASE WHEN v_sort = 'assigned_concierge' THEN assigned_concierge_user_id::text END ASC NULLS LAST,
       updated_at DESC
     LIMIT v_lim;
END $$;

REVOKE ALL ON FUNCTION public.concierge_case_list_for_role(text,integer,text,text[],text[],uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_case_list_for_role(text,integer,text,text[],text[],uuid,integer) TO authenticated;
