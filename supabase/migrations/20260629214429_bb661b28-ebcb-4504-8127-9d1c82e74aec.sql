CREATE OR REPLACE FUNCTION public.transition_content_status(
  _entity_kind public.entity_kind,
  _entity_id   uuid,
  _to_status   public.content_status,
  _notes       text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.request_business_review(
  _business_id uuid,
  _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _from public.content_status;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_business_access(_uid, _business_id, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO _from FROM public.businesses WHERE id = _business_id AND deleted_at IS NULL;
  IF _from IS NULL THEN
    RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _from <> 'draft' THEN
    RAISE EXCEPTION 'invalid_transition_request_review' USING ERRCODE = '22023';
  END IF;

  UPDATE public.businesses
     SET status = 'in_review', updated_by = _uid, updated_at = now()
   WHERE id = _business_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  VALUES ('business', _business_id, 'transition', _from, 'in_review', _uid, _notes);
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_business_review(
  _business_id uuid,
  _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _from public.content_status;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_business_access(_uid, _business_id, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO _from FROM public.businesses WHERE id = _business_id AND deleted_at IS NULL;
  IF _from IS NULL THEN
    RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _from <> 'in_review' THEN
    RAISE EXCEPTION 'invalid_transition_withdraw_review' USING ERRCODE = '22023';
  END IF;

  UPDATE public.businesses
     SET status = 'draft', updated_by = _uid, updated_at = now()
   WHERE id = _business_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  VALUES ('business', _business_id, 'transition', _from, 'draft', _uid, _notes);
END;
$$;

REVOKE ALL ON FUNCTION public.request_business_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_business_review(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.withdraw_business_review(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_business_review(uuid, text) TO authenticated;