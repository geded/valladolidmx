-- 1) Campos de itinerario en las partidas de propuesta (aditivo)
ALTER TABLE public.concierge_proposal_items
  ADD COLUMN IF NOT EXISTS day_index integer,
  ADD COLUMN IF NOT EXISTS starts_at_local time,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS is_suggestion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS target_kind text,
  ADD COLUMN IF NOT EXISTS target_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cpi_duration_chk') THEN
    ALTER TABLE public.concierge_proposal_items
      ADD CONSTRAINT cpi_duration_chk
      CHECK (duration_minutes IS NULL OR (duration_minutes BETWEEN 1 AND 1440));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cpi_day_chk') THEN
    ALTER TABLE public.concierge_proposal_items
      ADD CONSTRAINT cpi_day_chk
      CHECK (day_index IS NULL OR (day_index BETWEEN 0 AND 365));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cpi_source_chk') THEN
    ALTER TABLE public.concierge_proposal_items
      ADD CONSTRAINT cpi_source_chk
      CHECK (source IN ('quote','manual','alux'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cpi_target_kind_chk') THEN
    ALTER TABLE public.concierge_proposal_items
      ADD CONSTRAINT cpi_target_kind_chk
      CHECK (target_kind IS NULL OR target_kind IN ('destination','business','product','event','route','place','note'));
  END IF;
END $$;

COMMENT ON COLUMN public.concierge_proposal_items.starts_at_local IS
  'Hora local del destino (America/Merida). Nunca zona del dispositivo.';

-- 2) Creación de propuesta con datos de itinerario
CREATE OR REPLACE FUNCTION public.concierge_proposal_create(_case_id uuid, _items jsonb, _summary text DEFAULT NULL::text, _terms text DEFAULT NULL::text, _valid_until timestamp with time zone DEFAULT NULL::timestamp with time zone, _supersedes_proposal_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_pid UUID;
  v_item JSONB;
  v_quote public.concierge_quotes;
  v_total INTEGER := 0;
  v_currency TEXT := 'MXN';
  v_pos INTEGER := 0;
  v_version INTEGER := 1;
  v_title TEXT;
  v_amount INTEGER;
  v_item_currency TEXT;
  v_request_id UUID;
  v_day INTEGER;
  v_start TIME;
  v_dur INTEGER;
  v_sugg BOOLEAN;
  v_source TEXT;
  v_tkind TEXT;
  v_tid UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_is_internal(v_uid) OR NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'items_required' USING errcode='22023';
  END IF;

  IF _supersedes_proposal_id IS NOT NULL THEN
    SELECT version + 1 INTO v_version FROM public.concierge_proposals
     WHERE id = _supersedes_proposal_id AND case_id = _case_id;
    IF v_version IS NULL THEN
      RAISE EXCEPTION 'supersedes_not_found' USING errcode='P0002';
    END IF;
  END IF;

  INSERT INTO public.concierge_proposals
    (case_id, created_by_user_id, status, version, supersedes_proposal_id,
     summary, terms, valid_until)
  VALUES (_case_id, v_uid, 'draft', v_version, _supersedes_proposal_id,
          _summary, _terms, _valid_until)
  RETURNING id INTO v_pid;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_day := NULLIF(v_item->>'day_index','')::integer;
    v_start := NULLIF(v_item->>'starts_at_local','')::time;
    v_dur := NULLIF(v_item->>'duration_minutes','')::integer;
    v_sugg := COALESCE((v_item->>'is_suggestion')::boolean, false);
    v_tkind := NULLIF(v_item->>'target_kind','');
    v_tid := NULLIF(v_item->>'target_id','')::uuid;

    IF NULLIF(v_item->>'quote_id','') IS NOT NULL THEN
      SELECT * INTO v_quote FROM public.concierge_quotes
       WHERE id = (v_item->>'quote_id')::uuid AND case_id = _case_id;
      IF v_quote.id IS NULL THEN
        RAISE EXCEPTION 'quote_not_in_case' USING errcode='22023';
      END IF;
      IF v_quote.status <> 'submitted' THEN
        RAISE EXCEPTION 'quote_not_submitted' USING errcode='22023';
      END IF;
      v_currency := v_quote.currency;
      INSERT INTO public.concierge_proposal_items
        (proposal_id, quote_id, request_id, position, amount_cents, currency, notes, title,
         day_index, starts_at_local, duration_minutes, is_suggestion, source, target_kind, target_id)
      VALUES (v_pid, v_quote.id, v_quote.request_id, v_pos,
              COALESCE(v_quote.total_amount_cents, 0), v_quote.currency,
              v_item->>'notes', NULLIF(v_item->>'title',''),
              v_day, v_start, v_dur, false, 'quote', v_tkind, v_tid);
      v_total := v_total + COALESCE(v_quote.total_amount_cents, 0);
    ELSE
      v_title := NULLIF(btrim(COALESCE(v_item->>'title','')), '');
      IF v_title IS NULL THEN
        RAISE EXCEPTION 'item_title_required' USING errcode='22023';
      END IF;
      v_amount := COALESCE((v_item->>'amount_cents')::integer, 0);
      IF v_amount < 0 THEN
        RAISE EXCEPTION 'item_amount_invalid' USING errcode='22023';
      END IF;
      IF v_sugg THEN
        v_amount := 0;
      END IF;
      v_item_currency := COALESCE(NULLIF(v_item->>'currency',''), 'MXN');
      v_request_id := NULL;
      IF NULLIF(v_item->>'request_id','') IS NOT NULL THEN
        SELECT id INTO v_request_id FROM public.concierge_case_requests
         WHERE id = (v_item->>'request_id')::uuid AND case_id = _case_id;
      END IF;
      IF NOT v_sugg THEN
        v_currency := v_item_currency;
      END IF;
      v_source := COALESCE(NULLIF(v_item->>'source',''), CASE WHEN v_sugg THEN 'alux' ELSE 'manual' END);
      IF v_source NOT IN ('quote','manual','alux') THEN
        v_source := 'manual';
      END IF;
      INSERT INTO public.concierge_proposal_items
        (proposal_id, quote_id, request_id, position, amount_cents, currency, notes, title,
         day_index, starts_at_local, duration_minutes, is_suggestion, source, target_kind, target_id)
      VALUES (v_pid, NULL, v_request_id, v_pos, v_amount, v_item_currency,
              NULLIF(v_item->>'notes',''), v_title,
              v_day, v_start, v_dur, v_sugg, v_source, v_tkind, v_tid);
      v_total := v_total + v_amount;
    END IF;
    v_pos := v_pos + 1;
  END LOOP;

  UPDATE public.concierge_proposals
     SET total_amount_cents = v_total, currency = v_currency
   WHERE id = v_pid;

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (_case_id, 'Concierge.Proposal.Created', 'info', v_uid,
          'Propuesta creada (borrador)',
          jsonb_build_object('proposal_id', v_pid, 'version', v_version));

  RETURN v_pid;
END;
$function$;

-- 3) Listado de propuestas incluye los datos de itinerario
CREATE OR REPLACE FUNCTION public.concierge_case_proposals_list(_case_id uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'proposal_id', p.id,
    'status', p.status,
    'version', p.version,
    'supersedes_proposal_id', p.supersedes_proposal_id,
    'currency', p.currency,
    'total_amount_cents', p.total_amount_cents,
    'valid_until', p.valid_until,
    'summary', p.summary,
    'terms', p.terms,
    'sent_at', p.sent_at,
    'viewed_at', p.viewed_at,
    'responded_at', p.responded_at,
    'created_at', p.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'quote_id', i.quote_id,
        'request_id', i.request_id,
        'position', i.position,
        'amount_cents', i.amount_cents,
        'currency', i.currency,
        'notes', i.notes,
        'business_id', q.business_id,
        'business_name', b.display_name,
        'request_title', COALESCE(i.title, r.title, 'Servicio del itinerario'),
        'day_index', i.day_index,
        'starts_at_local', i.starts_at_local,
        'duration_minutes', i.duration_minutes,
        'is_suggestion', i.is_suggestion,
        'source', i.source,
        'target_kind', i.target_kind,
        'target_id', i.target_id
      ) ORDER BY i.position)
      FROM public.concierge_proposal_items i
      LEFT JOIN public.concierge_quotes q ON q.id = i.quote_id
      LEFT JOIN public.businesses b ON b.id = q.business_id
      LEFT JOIN public.concierge_case_requests r ON r.id = i.request_id
      WHERE i.proposal_id = p.id
    ), '[]'::jsonb)
  )
  FROM public.concierge_proposals p
  WHERE p.case_id = _case_id
  ORDER BY p.created_at DESC;
END;
$function$;

-- 4) Copiar el itinerario de la propuesta al viaje del viajero
CREATE OR REPLACE FUNCTION public.concierge_proposal_apply_schedule_to_plan(_proposal_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_proposal record;
  v_case record;
  v_plan_id uuid;
  v_item record;
  v_existing uuid;
  v_pos integer;
  v_applied integer := 0;
  v_is_ops boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;

  SELECT * INTO v_proposal FROM public.concierge_proposals WHERE id = _proposal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal_not_found' USING errcode='P0002'; END IF;

  SELECT * INTO v_case FROM public.concierge_cases WHERE id = v_proposal.case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'case_not_found' USING errcode='P0002'; END IF;

  v_is_ops := public.concierge_is_internal(v_uid);
  IF v_case.traveler_user_id <> v_uid AND NOT v_is_ops THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  IF v_proposal.status NOT IN ('accepted','sent','viewed') THEN
    RETURN 0;
  END IF;

  SELECT l.target_id INTO v_plan_id
  FROM public.concierge_case_links l
  WHERE l.case_id = v_case.id AND l.link_type = 'travel_plan'
  ORDER BY l.created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT p.id INTO v_plan_id FROM public.travel_plans p
    WHERE p.case_id = v_case.id ORDER BY p.updated_at DESC LIMIT 1;
  END IF;

  IF v_plan_id IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE(MAX(position), -1) + 1 INTO v_pos
  FROM public.travel_plan_items WHERE plan_id = v_plan_id;

  FOR v_item IN
    SELECT * FROM public.concierge_proposal_items
    WHERE proposal_id = _proposal_id AND day_index IS NOT NULL
    ORDER BY position
  LOOP
    v_existing := NULL;
    IF v_item.target_id IS NOT NULL AND v_item.target_kind IS NOT NULL
       AND v_item.target_kind <> 'note' THEN
      SELECT id INTO v_existing FROM public.travel_plan_items
      WHERE plan_id = v_plan_id
        AND target_id = v_item.target_id
        AND item_kind = v_item.target_kind::public.travel_item_kind
      LIMIT 1;
    END IF;

    IF v_existing IS NOT NULL THEN
      UPDATE public.travel_plan_items
         SET day_index = v_item.day_index,
             starts_at_local = COALESCE(v_item.starts_at_local, starts_at_local),
             duration_minutes = COALESCE(v_item.duration_minutes, duration_minutes),
             schedule_source = 'concierge',
             updated_at = now()
       WHERE id = v_existing;
    ELSIF v_item.target_id IS NOT NULL AND v_item.target_kind IS NOT NULL
          AND v_item.target_kind <> 'note' THEN
      INSERT INTO public.travel_plan_items
        (plan_id, item_kind, target_id, position, day_index, notes, snapshot,
         starts_at_local, duration_minutes, schedule_source)
      VALUES (v_plan_id, v_item.target_kind::public.travel_item_kind, v_item.target_id,
              v_pos, v_item.day_index, v_item.notes,
              jsonb_build_object('title', COALESCE(v_item.title, 'Servicio del itinerario')),
              v_item.starts_at_local, v_item.duration_minutes, 'concierge');
      v_pos := v_pos + 1;
    ELSE
      INSERT INTO public.travel_plan_items
        (plan_id, item_kind, target_id, position, day_index, notes, snapshot,
         starts_at_local, duration_minutes, schedule_source)
      VALUES (v_plan_id, 'note', NULL, v_pos, v_item.day_index,
              COALESCE(v_item.notes, v_item.title),
              jsonb_build_object('title', COALESCE(v_item.title, 'Servicio del itinerario')),
              v_item.starts_at_local, v_item.duration_minutes, 'concierge');
      v_pos := v_pos + 1;
    END IF;

    v_applied := v_applied + 1;
  END LOOP;

  RETURN v_applied;
END;
$function$;

REVOKE ALL ON FUNCTION public.concierge_proposal_apply_schedule_to_plan(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_apply_schedule_to_plan(uuid) TO authenticated;

-- 5) Plantillas de propuesta reutilizables (personal interno)
CREATE TABLE IF NOT EXISTS public.concierge_proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.concierge_proposal_templates TO authenticated;
GRANT ALL ON public.concierge_proposal_templates TO service_role;

ALTER TABLE public.concierge_proposal_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpt_select_internal" ON public.concierge_proposal_templates;
CREATE POLICY "cpt_select_internal" ON public.concierge_proposal_templates
  FOR SELECT TO authenticated
  USING (public.concierge_is_internal(auth.uid()));

DROP POLICY IF EXISTS "cpt_insert_own" ON public.concierge_proposal_templates;
CREATE POLICY "cpt_insert_own" ON public.concierge_proposal_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.concierge_is_internal(auth.uid()) AND owner_user_id = auth.uid());

DROP POLICY IF EXISTS "cpt_update_own" ON public.concierge_proposal_templates;
CREATE POLICY "cpt_update_own" ON public.concierge_proposal_templates
  FOR UPDATE TO authenticated
  USING (public.concierge_is_internal(auth.uid()) AND owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "cpt_delete_own" ON public.concierge_proposal_templates;
CREATE POLICY "cpt_delete_own" ON public.concierge_proposal_templates
  FOR DELETE TO authenticated
  USING (public.concierge_is_internal(auth.uid()) AND owner_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS cpt_owner_idx ON public.concierge_proposal_templates(owner_user_id);

CREATE TRIGGER cpt_touch_updated_at
  BEFORE UPDATE ON public.concierge_proposal_templates
  FOR EACH ROW EXECUTE FUNCTION public._cv41_touch_updated_at();