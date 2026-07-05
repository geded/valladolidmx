-- E-PS · Alta enriquecida + Doble puerta de aprobación
-- 1) Columnas nuevas en businesses para el flujo de dos puertas

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS verification_document_url text,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

-- 2) Extender create_owned_business para recibir datos enriquecidos
CREATE OR REPLACE FUNCTION public.create_owned_business(
  _display_name text,
  _destination_id uuid,
  _primary_category_id uuid DEFAULT NULL::uuid,
  _tagline text DEFAULT NULL::text,
  _description text DEFAULT NULL::text,
  _address_line1 text DEFAULT NULL::text,
  _address_line2 text DEFAULT NULL::text,
  _postal_code text DEFAULT NULL::text,
  _phone text DEFAULT NULL::text,
  _whatsapp text DEFAULT NULL::text,
  _email text DEFAULT NULL::text,
  _website text DEFAULT NULL::text,
  _verification_document_url text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _business_id uuid;
  _base text;
  _slug text;
  _suffix int := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF _display_name IS NULL OR length(btrim(_display_name)) < 2 THEN
    RAISE EXCEPTION 'invalid_display_name' USING ERRCODE = '22023';
  END IF;
  IF _description IS NULL OR length(btrim(_description)) < 80 THEN
    RAISE EXCEPTION 'description_too_short' USING ERRCODE = '22023';
  END IF;
  IF _verification_document_url IS NULL OR length(btrim(_verification_document_url)) = 0 THEN
    RAISE EXCEPTION 'verification_document_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.destinations WHERE id = _destination_id) THEN
    RAISE EXCEPTION 'destination_not_found' USING ERRCODE = 'P0002';
  END IF;

  _base := lower(regexp_replace(btrim(_display_name), '[^a-zA-Z0-9]+', '-', 'g'));
  _base := btrim(_base, '-');
  IF _base = '' THEN _base := 'negocio'; END IF;
  _slug := _base;
  WHILE EXISTS (SELECT 1 FROM public.businesses WHERE slug = _slug::citext) LOOP
    _suffix := _suffix + 1;
    _slug := _base || '-' || _suffix::text;
  END LOOP;

  INSERT INTO public.businesses (
    destination_id, primary_category_id, slug, display_name, tagline, description,
    status, created_by, updated_by, verification_document_url
  ) VALUES (
    _destination_id, _primary_category_id, _slug::citext, btrim(_display_name), _tagline, _description,
    'draft', _uid, _uid, _verification_document_url
  ) RETURNING id INTO _business_id;

  INSERT INTO public.business_users (business_id, user_id, role, status, invited_by)
  VALUES (_business_id, _uid, 'owner', 'pending', _uid);

  IF _address_line1 IS NOT NULL AND length(btrim(_address_line1)) > 0 THEN
    INSERT INTO public.business_locations (
      business_id, address_line1, address_line2, postal_code, is_primary, created_by, updated_by
    ) VALUES (
      _business_id, btrim(_address_line1), NULLIF(btrim(coalesce(_address_line2,'')),''), NULLIF(btrim(coalesce(_postal_code,'')),''),
      true, _uid, _uid
    );
  END IF;

  IF _phone IS NOT NULL AND length(btrim(_phone)) > 0 THEN
    INSERT INTO public.business_contacts (business_id, contact_type, value, is_public, sort_order, created_by, updated_by)
    VALUES (_business_id, 'phone', btrim(_phone), true, 0, _uid, _uid);
  END IF;
  IF _whatsapp IS NOT NULL AND length(btrim(_whatsapp)) > 0 THEN
    INSERT INTO public.business_contacts (business_id, contact_type, value, is_public, sort_order, created_by, updated_by)
    VALUES (_business_id, 'whatsapp', btrim(_whatsapp), true, 1, _uid, _uid);
  END IF;
  IF _email IS NOT NULL AND length(btrim(_email)) > 0 THEN
    INSERT INTO public.business_contacts (business_id, contact_type, value, is_public, sort_order, created_by, updated_by)
    VALUES (_business_id, 'email', btrim(_email), true, 2, _uid, _uid);
  END IF;
  IF _website IS NOT NULL AND length(btrim(_website)) > 0 THEN
    INSERT INTO public.business_contacts (business_id, contact_type, value, is_public, sort_order, created_by, updated_by)
    VALUES (_business_id, 'website', btrim(_website), true, 3, _uid, _uid);
  END IF;

  RETURN _business_id;
END;
$function$;

-- 3) Puerta 2: enviar a revisión (owner)
CREATE OR REPLACE FUNCTION public.submit_business_for_review(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _b public.businesses%ROWTYPE;
  _photo_count int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF NOT public.has_business_access(_uid, _business_id, 'owner'::business_user_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _b FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0002'; END IF;
  IF _b.status NOT IN ('draft','archived') THEN
    RAISE EXCEPTION 'invalid_status_transition' USING ERRCODE = '22023';
  END IF;

  IF _b.logo_media_id IS NULL THEN RAISE EXCEPTION 'missing_logo' USING ERRCODE = '22023'; END IF;
  IF _b.cover_media_id IS NULL THEN RAISE EXCEPTION 'missing_cover' USING ERRCODE = '22023'; END IF;
  IF _b.description IS NULL OR length(btrim(_b.description)) < 80 THEN RAISE EXCEPTION 'missing_description' USING ERRCODE = '22023'; END IF;
  IF _b.primary_category_id IS NULL THEN RAISE EXCEPTION 'missing_category' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_locations WHERE business_id = _business_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'missing_location' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_contacts WHERE business_id = _business_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'missing_contact' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO _photo_count FROM public.business_media WHERE business_id = _business_id;
  IF _photo_count < 3 THEN RAISE EXCEPTION 'missing_gallery' USING ERRCODE = '22023'; END IF;

  UPDATE public.businesses
     SET status = 'in_review', submitted_for_review_at = now(), updated_by = _uid, review_notes = NULL
   WHERE id = _business_id;
END;
$$;

-- 4) Puerta 2 (admin): publicar o devolver
CREATE OR REPLACE FUNCTION public.publish_business(_business_id uuid, _approve boolean, _notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id AND status = 'in_review') THEN
    RAISE EXCEPTION 'not_in_review' USING ERRCODE = '22023';
  END IF;
  IF _approve THEN
    UPDATE public.businesses
       SET status = 'published', published_at = now(), updated_by = _uid, review_notes = _notes
     WHERE id = _business_id;
  ELSE
    UPDATE public.businesses
       SET status = 'draft', updated_by = _uid, review_notes = coalesce(_notes,'Se solicitan ajustes antes de publicar.')
     WHERE id = _business_id;
  END IF;

  INSERT INTO public.permissions_audit_log (actor_user_id, action, role, scope_type, scope_id)
  VALUES (_uid, CASE WHEN _approve THEN 'business_published' ELSE 'business_publication_returned' END,
          'owner', 'business', _business_id);
END;
$$;

-- 5) Extender listado admin: separar identidad vs publicación
CREATE OR REPLACE FUNCTION public.list_pending_business_requests()
RETURNS TABLE(kind text, ref_id uuid, business_id uuid, business_name text, destination_id uuid, requester_id uuid, requester_email text, requester_name text, notes text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT 'claim'::text, t.id, t.business_id, b.display_name, b.destination_id,
         t.to_user_id, p.email, p.display_name, t.notes, t.created_at
    FROM public.business_ownership_transfers t
    JOIN public.businesses b ON b.id = t.business_id
    LEFT JOIN public.profiles p ON p.user_id = t.to_user_id
   WHERE t.status = 'pending'
  UNION ALL
  SELECT 'registration'::text, bu.id, b.id, b.display_name, b.destination_id,
         bu.user_id, p.email, p.display_name, b.verification_notes, bu.created_at
    FROM public.business_users bu
    JOIN public.businesses b ON b.id = bu.business_id
    LEFT JOIN public.profiles p ON p.user_id = bu.user_id
   WHERE bu.role = 'owner' AND bu.status = 'pending' AND b.status = 'draft'
  UNION ALL
  SELECT 'publication'::text, b.id, b.id, b.display_name, b.destination_id,
         bu.user_id, p.email, p.display_name, b.review_notes, coalesce(b.submitted_for_review_at, b.updated_at)
    FROM public.businesses b
    LEFT JOIN public.business_users bu ON bu.business_id = b.id AND bu.role = 'owner' AND bu.status = 'active'
    LEFT JOIN public.profiles p ON p.user_id = bu.user_id
   WHERE b.status = 'in_review'
  ORDER BY 10 DESC;
END;
$$;
