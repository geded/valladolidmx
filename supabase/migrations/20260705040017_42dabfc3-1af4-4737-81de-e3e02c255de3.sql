
CREATE OR REPLACE FUNCTION public.claim_business(_business_id uuid, _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _existing_owner uuid;
  _transfer_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_users
     WHERE business_id = _business_id AND user_id = _uid AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.business_ownership_transfers
     WHERE business_id = _business_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'claim_already_pending' USING ERRCODE = '23505';
  END IF;

  SELECT user_id INTO _existing_owner
    FROM public.business_users
   WHERE business_id = _business_id AND role = 'owner' AND status = 'active'
   LIMIT 1;

  INSERT INTO public.business_ownership_transfers (business_id, from_user_id, to_user_id, status, notes)
  VALUES (_business_id, _existing_owner, _uid, 'pending', _notes)
  RETURNING id INTO _transfer_id;

  RETURN _transfer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_business(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_business(uuid, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.create_owned_business(
  _display_name text,
  _destination_id uuid,
  _primary_category_id uuid DEFAULT NULL,
  _tagline text DEFAULT NULL,
  _description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
    status, created_by, updated_by
  ) VALUES (
    _destination_id, _primary_category_id, _slug::citext, btrim(_display_name), _tagline, _description,
    'draft', _uid, _uid
  ) RETURNING id INTO _business_id;

  INSERT INTO public.business_users (business_id, user_id, role, status, invited_by)
  VALUES (_business_id, _uid, 'owner', 'pending', _uid);

  RETURN _business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_owned_business(text, uuid, uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_owned_business(text, uuid, uuid, text, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.approve_ownership_claim(_transfer_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t public.business_ownership_transfers%ROWTYPE;
BEGIN
  IF _uid IS NULL OR NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _t FROM public.business_ownership_transfers WHERE id = _transfer_id FOR UPDATE;
  IF NOT FOUND OR _t.status <> 'pending' THEN
    RAISE EXCEPTION 'transfer_not_pending' USING ERRCODE = 'P0002';
  END IF;

  IF _approve THEN
    IF _t.from_user_id IS NOT NULL THEN
      UPDATE public.business_users
         SET role = 'manager'
       WHERE business_id = _t.business_id AND user_id = _t.from_user_id;
    END IF;

    INSERT INTO public.business_users (business_id, user_id, role, status, invited_by)
    VALUES (_t.business_id, _t.to_user_id, 'owner', 'active', _uid)
    ON CONFLICT (business_id, user_id)
    DO UPDATE SET role = 'owner', status = 'active';

    UPDATE public.business_ownership_transfers
       SET status = 'accepted', responded_at = now(), notes = COALESCE(_notes, notes)
     WHERE id = _transfer_id;
  ELSE
    UPDATE public.business_ownership_transfers
       SET status = 'rejected', responded_at = now(), notes = COALESCE(_notes, notes)
     WHERE id = _transfer_id;
  END IF;

  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, role, scope_type, scope_id)
  VALUES (_uid, _t.to_user_id,
          CASE WHEN _approve THEN 'ownership_claim_approved' ELSE 'ownership_claim_rejected' END,
          'owner', 'business', _t.business_id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_ownership_claim(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_ownership_claim(uuid, boolean, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.approve_business_registration(_business_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT user_id INTO _owner
    FROM public.business_users
   WHERE business_id = _business_id AND role = 'owner' AND status = 'pending'
   LIMIT 1;

  IF _approve THEN
    UPDATE public.business_users
       SET status = 'active'
     WHERE business_id = _business_id AND role = 'owner' AND status = 'pending';

    UPDATE public.businesses
       SET status = 'approved', updated_by = _uid
     WHERE id = _business_id;
  ELSE
    UPDATE public.business_users
       SET status = 'removed'
     WHERE business_id = _business_id AND status = 'pending';

    UPDATE public.businesses
       SET status = 'archived', updated_by = _uid
     WHERE id = _business_id;
  END IF;

  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, role, scope_type, scope_id)
  VALUES (_uid, _owner,
          CASE WHEN _approve THEN 'business_registration_approved' ELSE 'business_registration_rejected' END,
          'owner', 'business', _business_id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_business_registration(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_business_registration(uuid, boolean, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.list_pending_business_requests()
RETURNS TABLE (
  kind text,
  ref_id uuid,
  business_id uuid,
  business_name text,
  destination_id uuid,
  requester_id uuid,
  requester_email text,
  requester_name text,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT 'claim'::text,
         t.id,
         t.business_id,
         b.display_name,
         b.destination_id,
         t.to_user_id,
         p.email,
         p.display_name,
         t.notes,
         t.created_at
    FROM public.business_ownership_transfers t
    JOIN public.businesses b ON b.id = t.business_id
    LEFT JOIN public.profiles p ON p.user_id = t.to_user_id
   WHERE t.status = 'pending'
  UNION ALL
  SELECT 'registration'::text,
         bu.id,
         b.id,
         b.display_name,
         b.destination_id,
         bu.user_id,
         p.email,
         p.display_name,
         NULL::text,
         bu.created_at
    FROM public.business_users bu
    JOIN public.businesses b ON b.id = bu.business_id
    LEFT JOIN public.profiles p ON p.user_id = bu.user_id
   WHERE bu.role = 'owner' AND bu.status = 'pending' AND b.status = 'draft'
  ORDER BY 10 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_pending_business_requests() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_pending_business_requests() TO authenticated;
