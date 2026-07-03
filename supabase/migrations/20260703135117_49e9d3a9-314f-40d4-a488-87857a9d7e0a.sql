
-- ============================================================
-- Sub-ola 2.4a · Portal editando productos (Fase B + D)
-- ============================================================

-- 1) Bandera de autopublicación (independiente del plan)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS can_self_publish boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.can_self_publish IS
  'Sub-ola 2.4a · Modelo C híbrido: habilita autopublicación de productos sin pasar por revisión Founder. Independiente del plan comercial.';

-- ============================================================
-- 2) FAQ RPCs (product-scoped, SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_business_product_faq(
  _product_id uuid,
  _question text,
  _answer text,
  _position integer DEFAULT NULL,
  _publish boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bid uuid;
  _uid uuid := auth.uid();
  _pos integer;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _question IS NULL OR btrim(_question) = '' OR char_length(_question) > 300 THEN
    RAISE EXCEPTION 'invalid_question';
  END IF;
  IF _answer IS NULL OR btrim(_answer) = '' OR char_length(_answer) > 4000 THEN
    RAISE EXCEPTION 'invalid_answer';
  END IF;

  SELECT business_id INTO _bid FROM public.products
    WHERE id = _product_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF NOT public.has_business_access(_uid, _bid, 'editor') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _position IS NULL THEN
    SELECT COALESCE(MAX(position), -1) + 1 INTO _pos
    FROM public.faqs
    WHERE entity_kind = 'product' AND entity_id = _product_id AND deleted_at IS NULL;
  ELSE
    _pos := _position;
  END IF;

  INSERT INTO public.faqs(
    question, answer, entity_kind, entity_id, position,
    status, published_at, created_by, updated_by
  ) VALUES (
    _question, _answer, 'product'::entity_kind, _product_id, _pos,
    CASE WHEN _publish THEN 'published'::content_status ELSE 'draft'::content_status END,
    CASE WHEN _publish THEN now() ELSE NULL END,
    _uid, _uid
  )
  RETURNING id INTO _new_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_id, metadata)
  VALUES ('faq'::entity_kind, _new_id, 'create',
          _uid, jsonb_build_object('product_id', _product_id, 'via', 'portal'));

  RETURN _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_business_product_faq(
  _faq_id uuid,
  _question text DEFAULT NULL,
  _answer text DEFAULT NULL,
  _publish boolean DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bid uuid;
  _uid uuid := auth.uid();
  _entity_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT p.business_id, f.entity_id
    INTO _bid, _entity_id
  FROM public.faqs f
  JOIN public.products p ON p.id = f.entity_id
  WHERE f.id = _faq_id
    AND f.entity_kind = 'product'
    AND f.deleted_at IS NULL
    AND p.deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'faq_not_found'; END IF;
  IF NOT public.has_business_access(_uid, _bid, 'editor') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _question IS NOT NULL AND (btrim(_question) = '' OR char_length(_question) > 300) THEN
    RAISE EXCEPTION 'invalid_question';
  END IF;
  IF _answer IS NOT NULL AND (btrim(_answer) = '' OR char_length(_answer) > 4000) THEN
    RAISE EXCEPTION 'invalid_answer';
  END IF;

  UPDATE public.faqs SET
    question = COALESCE(_question, question),
    answer = COALESCE(_answer, answer),
    status = CASE
      WHEN _publish IS NULL THEN status
      WHEN _publish THEN 'published'::content_status
      ELSE 'draft'::content_status
    END,
    published_at = CASE
      WHEN _publish IS TRUE AND published_at IS NULL THEN now()
      WHEN _publish IS FALSE THEN NULL
      ELSE published_at
    END,
    updated_by = _uid
  WHERE id = _faq_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_id, metadata)
  VALUES ('faq'::entity_kind, _faq_id, 'update', _uid,
          jsonb_build_object('product_id', _entity_id, 'via', 'portal'));
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_business_product_faq(_faq_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bid uuid;
  _uid uuid := auth.uid();
  _entity_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT p.business_id, f.entity_id INTO _bid, _entity_id
  FROM public.faqs f
  JOIN public.products p ON p.id = f.entity_id
  WHERE f.id = _faq_id AND f.entity_kind = 'product'
    AND f.deleted_at IS NULL AND p.deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'faq_not_found'; END IF;
  IF NOT public.has_business_access(_uid, _bid, 'editor') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.faqs
    SET deleted_at = now(), deleted_by = _uid, updated_by = _uid
    WHERE id = _faq_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_id, metadata)
  VALUES ('faq'::entity_kind, _faq_id, 'delete', _uid,
          jsonb_build_object('product_id', _entity_id, 'via', 'portal'));
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_business_product_faqs(
  _product_id uuid,
  _ordered_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bid uuid;
  _uid uuid := auth.uid();
  _i integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT business_id INTO _bid FROM public.products
    WHERE id = _product_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF NOT public.has_business_access(_uid, _bid, 'editor') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _i IN 1..array_length(_ordered_ids, 1) LOOP
    UPDATE public.faqs
      SET position = _i - 1, updated_by = _uid
      WHERE id = _ordered_ids[_i]
        AND entity_kind = 'product'
        AND entity_id = _product_id
        AND deleted_at IS NULL;
  END LOOP;
END;
$$;

-- ============================================================
-- 3) Publish / Unpublish RPCs — Modelo C híbrido
-- ============================================================

CREATE OR REPLACE FUNCTION public.publish_business_product(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _p RECORD;
  _b RECORD;
  _has_cover boolean;
  _errors text[] := ARRAY[]::text[];
  _requires_price boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO _p FROM public.products
    WHERE id = _product_id AND deleted_at IS NULL;
  IF _p IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;

  IF NOT public.has_business_access(_uid, _p.business_id, 'editor') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT verified, can_self_publish, status INTO _b
    FROM public.businesses
    WHERE id = _p.business_id AND deleted_at IS NULL;
  IF _b IS NULL THEN RAISE EXCEPTION 'business_not_found'; END IF;

  -- Gate de autopublicación (Modelo C)
  IF NOT (_b.verified OR _b.can_self_publish) THEN
    RETURN jsonb_build_object(
      'published', false,
      'reason', 'not_authorized_to_self_publish',
      'message', 'Empresa no autorizada para autopublicar. Solicita revisión Founder.'
    );
  END IF;

  -- Empresa debe estar publicada
  IF _b.status <> 'published' THEN
    RETURN jsonb_build_object(
      'published', false,
      'reason', 'business_not_published',
      'message', 'La empresa aún no está publicada.'
    );
  END IF;

  -- Validaciones duras (server-side hard rules)
  SELECT EXISTS(
    SELECT 1 FROM public.product_media
    WHERE product_id = _product_id AND role = 'cover'
  ) OR _p.cover_media_id IS NOT NULL
  INTO _has_cover;
  IF NOT _has_cover THEN _errors := _errors || 'missing_cover'; END IF;

  IF _p.description IS NULL OR char_length(btrim(_p.description)) < 40 THEN
    _errors := _errors || 'description_too_short';
  END IF;

  _requires_price := _p.product_type IN ('experiencia','hotel','tour','transporte','evento');
  IF _requires_price AND _p.price_amount IS NULL THEN
    _errors := _errors || 'missing_price';
  END IF;

  IF array_length(_errors, 1) IS NOT NULL THEN
    RETURN jsonb_build_object(
      'published', false,
      'reason', 'validation_failed',
      'errors', to_jsonb(_errors)
    );
  END IF;

  UPDATE public.products
    SET status = 'published'::content_status,
        published_at = COALESCE(published_at, now()),
        updated_by = _uid,
        updated_at = now()
    WHERE id = _product_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_id, metadata)
  VALUES ('product'::entity_kind, _product_id, 'publish', _uid,
          jsonb_build_object('via', 'portal_self_publish',
                             'verified', _b.verified,
                             'can_self_publish', _b.can_self_publish));

  RETURN jsonb_build_object('published', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_business_product(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT business_id INTO _bid FROM public.products
    WHERE id = _product_id AND deleted_at IS NULL;
  IF _bid IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;
  IF NOT public.has_business_access(_uid, _bid, 'editor') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.products
    SET status = 'draft'::content_status,
        updated_by = _uid,
        updated_at = now()
    WHERE id = _product_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_id, metadata)
  VALUES ('product'::entity_kind, _product_id, 'unpublish', _uid,
          jsonb_build_object('via', 'portal'));
END;
$$;

-- Grants (SECURITY DEFINER funcs sólo necesitan EXECUTE)
GRANT EXECUTE ON FUNCTION public.create_business_product_faq(uuid, text, text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_product_faq(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_business_product_faq(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_business_product_faqs(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_business_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_business_product(uuid) TO authenticated;
