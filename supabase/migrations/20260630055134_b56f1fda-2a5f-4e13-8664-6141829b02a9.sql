
-- 14.60.2 — Customer Case File + conversión desde travel plan y marketplace
-- Tabla concierge_case_requests
CREATE TABLE IF NOT EXISTS public.concierge_case_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('travel_plan_item','marketplace_product','manual')),
  source_ref UUID,
  kind TEXT NOT NULL DEFAULT 'non_reservable'
    CHECK (kind IN ('reservable','non_reservable')),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','quoting','quoted','accepted','rejected','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.concierge_case_requests TO authenticated;
GRANT ALL ON public.concierge_case_requests TO service_role;
ALTER TABLE public.concierge_case_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ccr_case ON public.concierge_case_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_ccr_status ON public.concierge_case_requests(status);
DROP TRIGGER IF EXISTS trg_ccr_updated_at ON public.concierge_case_requests;
CREATE TRIGGER trg_ccr_updated_at
  BEFORE UPDATE ON public.concierge_case_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "ccr_select" ON public.concierge_case_requests;
CREATE POLICY "ccr_select" ON public.concierge_case_requests
  FOR SELECT TO authenticated
  USING (public.concierge_can_view_case(case_id, auth.uid()));

-- Helper: traveler self-create authorization
CREATE OR REPLACE FUNCTION public.concierge_assert_can_create_for(_traveler UUID)
RETURNS VOID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF v_uid = _traveler THEN RETURN; END IF;
  IF public.has_role(v_uid,'concierge_lead')
     OR public.has_role(v_uid,'admin')
     OR public.has_role(v_uid,'super_admin') THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'forbidden' USING errcode='42501';
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_assert_can_create_for(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_assert_can_create_for(uuid) TO authenticated;

-- Helper: publish Case.Created and Request.Created events via UNC
CREATE OR REPLACE FUNCTION public._concierge_publish_case_created(_case_id UUID, _traveler UUID, _source TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event_id TEXT := 'concierge.case.created:' || _case_id::text;
  v_lead RECORD;
BEGIN
  PERFORM public.unc_publish_in_app(
    v_event_id, 'Concierge.Case.Created', _traveler, 'traveler',
    'transactional'::public.notification_category,
    jsonb_build_object('case_id', _case_id, 'source', _source)
  );
  FOR v_lead IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'concierge_lead'
  LOOP
    PERFORM public.unc_publish_in_app(
      v_event_id || ':lead:' || v_lead.user_id::text,
      'Concierge.Case.Created', v_lead.user_id, 'concierge_lead',
      'operational'::public.notification_category,
      jsonb_build_object('case_id', _case_id, 'source', _source, 'traveler_user_id', _traveler)
    );
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public._concierge_publish_case_created(uuid, uuid, text) FROM public, anon;

CREATE OR REPLACE FUNCTION public._concierge_publish_request_created(_case_id UUID, _request_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_lead RECORD;
  v_event_id TEXT := 'concierge.request.created:' || _request_id::text;
BEGIN
  FOR v_lead IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'concierge_lead'
  LOOP
    PERFORM public.unc_publish_in_app(
      v_event_id || ':lead:' || v_lead.user_id::text,
      'Concierge.Request.Created', v_lead.user_id, 'concierge_lead',
      'operational'::public.notification_category,
      jsonb_build_object('case_id', _case_id, 'request_id', _request_id)
    );
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public._concierge_publish_request_created(uuid, uuid) FROM public, anon;

-- RPC: conversión desde travel plan
CREATE OR REPLACE FUNCTION public.concierge_case_from_travel_plan(
  _traveler_user_id UUID,
  _travel_plan_id UUID,
  _summary TEXT,
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
REVOKE ALL ON FUNCTION public.concierge_case_from_travel_plan(uuid, uuid, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_from_travel_plan(uuid, uuid, text, jsonb) TO authenticated;

-- RPC: conversión desde marketplace product
CREATE OR REPLACE FUNCTION public.concierge_case_from_marketplace_product(
  _traveler_user_id UUID,
  _product_id UUID,
  _summary TEXT,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_case_id UUID;
  v_req_id UUID;
  v_business UUID;
  v_title TEXT;
  v_kind TEXT;
  v_conv TEXT;
BEGIN
  PERFORM public.concierge_assert_can_create_for(_traveler_user_id);
  IF _product_id IS NULL THEN
    RAISE EXCEPTION 'product_id requerido' USING errcode='22023';
  END IF;

  SELECT p.business_id, p.name, p.conversion_mode
    INTO v_business, v_title, v_conv
    FROM public.products p WHERE p.id = _product_id;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'product_not_found' USING errcode='P0002';
  END IF;
  v_kind := CASE WHEN v_conv = 'reservar_en_linea' THEN 'reservable' ELSE 'non_reservable' END;

  INSERT INTO public.concierge_cases (traveler_user_id, source, summary, created_by)
  VALUES (_traveler_user_id, 'marketplace_product', COALESCE(_summary, v_title), v_uid)
  RETURNING id INTO v_case_id;

  INSERT INTO public.concierge_case_participants (case_id, user_id, role)
  VALUES (v_case_id, _traveler_user_id, 'traveler')
  ON CONFLICT DO NOTHING;

  IF v_business IS NOT NULL THEN
    INSERT INTO public.concierge_case_links (case_id, link_type, target_id)
    VALUES (v_case_id, 'business', v_business) ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.concierge_case_requests
    (case_id, source_type, source_ref, kind, product_id, business_id, title, notes)
  VALUES (v_case_id, 'marketplace_product', _product_id, v_kind, _product_id, v_business, v_title, _notes)
  RETURNING id INTO v_req_id;

  INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_case_id, 'Concierge.Case.Created', 'info', v_uid,
          'Expediente creado desde Marketplace',
          jsonb_build_object('source','marketplace_product','product_id', _product_id));
  INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_case_id, 'Concierge.Request.Created', 'info', v_uid,
          'Solicitud creada', jsonb_build_object('request_id', v_req_id));

  PERFORM public._concierge_publish_case_created(v_case_id, _traveler_user_id, 'marketplace_product');
  PERFORM public._concierge_publish_request_created(v_case_id, v_req_id);

  RETURN v_case_id;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_from_marketplace_product(uuid, uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_from_marketplace_product(uuid, uuid, text, text) TO authenticated;

-- RPC: Customer Case File compuesto
CREATE OR REPLACE FUNCTION public.concierge_case_file_v1(_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
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
  v_travel_plan_id UUID;
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

  v_result := jsonb_build_object(
    'case', to_jsonb(v_case),
    'viewer', jsonb_build_object('user_id', v_uid, 'is_internal', v_internal),
    'traveler', COALESCE(v_traveler, jsonb_build_object('user_id', v_case.traveler_user_id)),
    'travel_plan', CASE WHEN v_travel_plan_id IS NOT NULL
                         THEN jsonb_build_object('id', v_travel_plan_id) ELSE NULL END,
    'requests', v_requests,
    'quotes', '[]'::jsonb,
    'proposals', '[]'::jsonb,
    'orders', '[]'::jsonb,
    'reservations', '[]'::jsonb,
    'payments', '[]'::jsonb,
    'links', v_links,
    'businesses', v_businesses,
    'timeline', v_timeline
  );

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_file_v1(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_file_v1(uuid) TO authenticated;
