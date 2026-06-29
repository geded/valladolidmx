
-- Ola 3 · Etapa 6 — Productos + Promociones (Portal Empresarial)
-- Aditiva. Sin cambios a RLS de public.* ni al modelo de dominio.

-- 1) Garantía de unicidad de logo activo por empresa (QA concurrencia).
--    Índice parcial: a lo sumo 1 fila con role='logo' por business_id.
CREATE UNIQUE INDEX IF NOT EXISTS business_media_one_logo_per_business
  ON public.business_media(business_id)
  WHERE role = 'logo';

-- 2) Extender transition_content_status para soportar 'product'.
CREATE OR REPLACE FUNCTION public.transition_content_status(
  _entity_kind public.entity_kind,
  _entity_id uuid,
  _to_status public.content_status,
  _notes text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _from public.content_status;
  _table TEXT;
  _allowed BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_editor_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  _table := CASE _entity_kind
    WHEN 'article'   THEN 'articles'
    WHEN 'page'      THEN 'pages'
    WHEN 'event'     THEN 'events'
    WHEN 'route'     THEN 'editorial_routes'
    WHEN 'faq'       THEN 'faqs'
    WHEN 'banner'    THEN 'banners'
    WHEN 'promotion' THEN 'promotions'
    WHEN 'business'  THEN 'businesses'
    WHEN 'product'   THEN 'products'
    ELSE NULL
  END;

  IF _table IS NULL THEN
    RAISE EXCEPTION 'entity_kind % is not editable via this function', _entity_kind;
  END IF;

  EXECUTE format('SELECT status FROM public.%I WHERE id = $1', _table)
    INTO _from USING _entity_id;

  IF _from IS NULL THEN
    RAISE EXCEPTION 'entity not found';
  END IF;

  _allowed := (
    (_from = 'draft'     AND _to_status IN ('in_review','archived'))
    OR (_from = 'in_review' AND _to_status IN ('approved','draft','archived'))
    OR (_from = 'approved'  AND _to_status IN ('published','draft','archived'))
    OR (_from = 'published' AND _to_status IN ('archived','draft'))
    OR (_from = 'archived'  AND _to_status IN ('draft'))
  );

  IF NOT _allowed THEN
    RAISE EXCEPTION 'invalid transition % -> %', _from, _to_status;
  END IF;

  IF _to_status = 'published' THEN
    EXECUTE format('UPDATE public.%I SET status = $1, published_at = COALESCE(published_at, now()), updated_by = auth.uid() WHERE id = $2', _table)
      USING _to_status, _entity_id;
  ELSE
    EXECUTE format('UPDATE public.%I SET status = $1, updated_by = auth.uid() WHERE id = $2', _table)
      USING _to_status, _entity_id;
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  VALUES (_entity_kind, _entity_id, 'transition', _from, _to_status, auth.uid(), _notes);
END;
$function$;

-- 3) RPCs Portal: Productos
CREATE OR REPLACE FUNCTION public.create_business_product(
  _business_id uuid,
  _name text,
  _slug text,
  _product_type public.product_type,
  _tagline text DEFAULT NULL,
  _description text DEFAULT NULL,
  _price_amount numeric DEFAULT NULL,
  _price_currency text DEFAULT 'MXN',
  _duration_minutes integer DEFAULT NULL,
  _capacity integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.has_business_access(_uid, _business_id, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501';
  END IF;
  IF _name IS NULL OR length(trim(_name))=0 OR length(_name)>200 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE='22023';
  END IF;
  IF _slug IS NULL OR _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR length(_slug)>120 THEN
    RAISE EXCEPTION 'invalid_slug' USING ERRCODE='22023';
  END IF;
  IF _price_amount IS NOT NULL AND _price_amount < 0 THEN
    RAISE EXCEPTION 'invalid_price' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.products(
    business_id, name, slug, product_type, tagline, description,
    price_amount, price_currency, duration_minutes, capacity,
    status, created_by, updated_by
  ) VALUES (
    _business_id, _name, _slug, _product_type,
    NULLIF(left(coalesce(_tagline,''),200),''),
    NULLIF(_description,''),
    _price_amount, COALESCE(_price_currency,'MXN'),
    _duration_minutes, _capacity,
    'draft'::public.content_status, _uid, _uid
  )
  RETURNING id INTO _id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('product', _id, 'product.create', _uid, format('business_id=%s', _business_id));
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_business_product(
  _product_id uuid,
  _name text DEFAULT NULL,
  _tagline text DEFAULT NULL,
  _description text DEFAULT NULL,
  _price_amount numeric DEFAULT NULL,
  _price_currency text DEFAULT NULL,
  _duration_minutes integer DEFAULT NULL,
  _capacity integer DEFAULT NULL,
  _clear_price boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT business_id INTO _bid FROM public.products WHERE id=_product_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_business_access(_uid, _bid, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501';
  END IF;
  IF _name IS NOT NULL AND (length(trim(_name))=0 OR length(_name)>200) THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE='22023';
  END IF;
  IF _price_amount IS NOT NULL AND _price_amount < 0 THEN
    RAISE EXCEPTION 'invalid_price' USING ERRCODE='22023';
  END IF;

  UPDATE public.products SET
    name = COALESCE(_name, name),
    tagline = CASE WHEN _tagline IS NULL THEN tagline ELSE NULLIF(left(_tagline,200),'') END,
    description = CASE WHEN _description IS NULL THEN description ELSE NULLIF(_description,'') END,
    price_amount = CASE WHEN _clear_price THEN NULL WHEN _price_amount IS NOT NULL THEN _price_amount ELSE price_amount END,
    price_currency = COALESCE(_price_currency, price_currency),
    duration_minutes = COALESCE(_duration_minutes, duration_minutes),
    capacity = COALESCE(_capacity, capacity),
    updated_by = _uid,
    updated_at = now()
  WHERE id = _product_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id)
  VALUES ('product', _product_id, 'product.update', _uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_business_product(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT business_id INTO _bid FROM public.products WHERE id=_product_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_business_access(_uid, _bid, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501';
  END IF;

  UPDATE public.products SET
    status='archived'::public.content_status,
    deleted_at=now(), deleted_by=_uid, updated_by=_uid, updated_at=now()
  WHERE id=_product_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id)
  VALUES ('product', _product_id, 'product.archive', _uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_product_review(_product_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _bid uuid; _from public.content_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT business_id, status INTO _bid, _from FROM public.products WHERE id=_product_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_business_access(_uid,_bid,'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501'; END IF;
  IF _from <> 'draft' THEN RAISE EXCEPTION 'invalid_transition_request_review' USING ERRCODE='22023'; END IF;
  UPDATE public.products SET status='in_review', updated_by=_uid, updated_at=now() WHERE id=_product_id;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  VALUES ('product', _product_id, 'transition', _from, 'in_review', _uid, _notes);
END;$$;

CREATE OR REPLACE FUNCTION public.withdraw_product_review(_product_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _bid uuid; _from public.content_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT business_id, status INTO _bid, _from FROM public.products WHERE id=_product_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_business_access(_uid,_bid,'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501'; END IF;
  IF _from <> 'in_review' THEN RAISE EXCEPTION 'invalid_transition_withdraw_review' USING ERRCODE='22023'; END IF;
  UPDATE public.products SET status='draft', updated_by=_uid, updated_at=now() WHERE id=_product_id;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  VALUES ('product', _product_id, 'transition', _from, 'draft', _uid, _notes);
END;$$;

-- 4) RPCs Portal: Promociones
CREATE OR REPLACE FUNCTION public.create_business_promotion(
  _business_id uuid,
  _title text,
  _slug text,
  _description text DEFAULT NULL,
  _terms text DEFAULT NULL,
  _discount_percent numeric DEFAULT NULL,
  _starts_at timestamptz DEFAULT NULL,
  _ends_at timestamptz DEFAULT NULL,
  _product_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _id uuid; _pbid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.has_business_access(_uid,_business_id,'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501'; END IF;
  IF _title IS NULL OR length(trim(_title))=0 OR length(_title)>200 THEN
    RAISE EXCEPTION 'invalid_title' USING ERRCODE='22023'; END IF;
  IF _slug IS NULL OR _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR length(_slug)>120 THEN
    RAISE EXCEPTION 'invalid_slug' USING ERRCODE='22023'; END IF;
  IF _discount_percent IS NOT NULL AND (_discount_percent < 0 OR _discount_percent > 100) THEN
    RAISE EXCEPTION 'invalid_discount' USING ERRCODE='22023'; END IF;
  IF _starts_at IS NOT NULL AND _ends_at IS NOT NULL AND _ends_at <= _starts_at THEN
    RAISE EXCEPTION 'invalid_date_range' USING ERRCODE='22023'; END IF;
  IF _product_id IS NOT NULL THEN
    SELECT business_id INTO _pbid FROM public.products WHERE id=_product_id AND deleted_at IS NULL;
    IF _pbid IS DISTINCT FROM _business_id THEN
      RAISE EXCEPTION 'product_outside_business' USING ERRCODE='22023'; END IF;
  END IF;

  INSERT INTO public.promotions(
    business_id, product_id, title, slug, description, terms,
    discount_percent, starts_at, ends_at, status, created_by, updated_by
  ) VALUES (
    _business_id, _product_id, _title, _slug,
    NULLIF(_description,''), NULLIF(_terms,''),
    _discount_percent, _starts_at, _ends_at,
    'draft'::public.content_status, _uid, _uid
  ) RETURNING id INTO _id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('promotion', _id, 'promotion.create', _uid, format('business_id=%s', _business_id));
  RETURN _id;
END;$$;

CREATE OR REPLACE FUNCTION public.update_business_promotion(
  _promotion_id uuid,
  _title text DEFAULT NULL,
  _description text DEFAULT NULL,
  _terms text DEFAULT NULL,
  _discount_percent numeric DEFAULT NULL,
  _starts_at timestamptz DEFAULT NULL,
  _ends_at timestamptz DEFAULT NULL,
  _clear_discount boolean DEFAULT false,
  _clear_dates boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _bid uuid; _s timestamptz; _e timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT business_id INTO _bid FROM public.promotions WHERE id=_promotion_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'promotion_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_business_access(_uid,_bid,'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501'; END IF;
  IF _discount_percent IS NOT NULL AND (_discount_percent<0 OR _discount_percent>100) THEN
    RAISE EXCEPTION 'invalid_discount' USING ERRCODE='22023'; END IF;
  IF _title IS NOT NULL AND (length(trim(_title))=0 OR length(_title)>200) THEN
    RAISE EXCEPTION 'invalid_title' USING ERRCODE='22023'; END IF;

  -- Validar rango si se aporta cualquier extremo
  _s := CASE WHEN _clear_dates THEN NULL WHEN _starts_at IS NOT NULL THEN _starts_at ELSE (SELECT starts_at FROM public.promotions WHERE id=_promotion_id) END;
  _e := CASE WHEN _clear_dates THEN NULL WHEN _ends_at IS NOT NULL THEN _ends_at ELSE (SELECT ends_at FROM public.promotions WHERE id=_promotion_id) END;
  IF _s IS NOT NULL AND _e IS NOT NULL AND _e <= _s THEN
    RAISE EXCEPTION 'invalid_date_range' USING ERRCODE='22023'; END IF;

  UPDATE public.promotions SET
    title = COALESCE(_title, title),
    description = CASE WHEN _description IS NULL THEN description ELSE NULLIF(_description,'') END,
    terms = CASE WHEN _terms IS NULL THEN terms ELSE NULLIF(_terms,'') END,
    discount_percent = CASE WHEN _clear_discount THEN NULL WHEN _discount_percent IS NOT NULL THEN _discount_percent ELSE discount_percent END,
    starts_at = _s,
    ends_at = _e,
    updated_by=_uid, updated_at=now()
  WHERE id=_promotion_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id)
  VALUES ('promotion', _promotion_id, 'promotion.update', _uid);
END;$$;

CREATE OR REPLACE FUNCTION public.archive_business_promotion(_promotion_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _bid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT business_id INTO _bid FROM public.promotions WHERE id=_promotion_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'promotion_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_business_access(_uid,_bid,'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501'; END IF;
  UPDATE public.promotions SET status='archived'::public.content_status,
    deleted_at=now(), deleted_by=_uid, updated_by=_uid, updated_at=now()
  WHERE id=_promotion_id;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id)
  VALUES ('promotion', _promotion_id, 'promotion.archive', _uid);
END;$$;

CREATE OR REPLACE FUNCTION public.request_promotion_review(_promotion_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _bid uuid; _from public.content_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT business_id,status INTO _bid,_from FROM public.promotions WHERE id=_promotion_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'promotion_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_business_access(_uid,_bid,'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501'; END IF;
  IF _from <> 'draft' THEN RAISE EXCEPTION 'invalid_transition_request_review' USING ERRCODE='22023'; END IF;
  UPDATE public.promotions SET status='in_review', updated_by=_uid, updated_at=now() WHERE id=_promotion_id;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  VALUES ('promotion', _promotion_id, 'transition', _from, 'in_review', _uid, _notes);
END;$$;

CREATE OR REPLACE FUNCTION public.withdraw_promotion_review(_promotion_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _bid uuid; _from public.content_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT business_id,status INTO _bid,_from FROM public.promotions WHERE id=_promotion_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'promotion_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.has_business_access(_uid,_bid,'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501'; END IF;
  IF _from <> 'in_review' THEN RAISE EXCEPTION 'invalid_transition_withdraw_review' USING ERRCODE='22023'; END IF;
  UPDATE public.promotions SET status='draft', updated_by=_uid, updated_at=now() WHERE id=_promotion_id;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  VALUES ('promotion', _promotion_id, 'transition', _from, 'draft', _uid, _notes);
END;$$;

-- 5) Permisos EXECUTE: restringido a authenticated.
REVOKE ALL ON FUNCTION public.create_business_product(uuid,text,text,public.product_type,text,text,numeric,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_business_product(uuid,text,text,text,numeric,text,integer,integer,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_business_product(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_product_review(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_product_review(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_business_promotion(uuid,text,text,text,text,numeric,timestamptz,timestamptz,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_business_promotion(uuid,text,text,text,numeric,timestamptz,timestamptz,boolean,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_business_promotion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_promotion_review(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_promotion_review(uuid,text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_business_product(uuid,text,text,public.product_type,text,text,numeric,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_product(uuid,text,text,text,numeric,text,integer,integer,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_business_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_product_review(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_product_review(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_promotion(uuid,text,text,text,text,numeric,timestamptz,timestamptz,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_promotion(uuid,text,text,text,numeric,timestamptz,timestamptz,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_business_promotion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_promotion_review(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_promotion_review(uuid,text) TO authenticated;
