-- 14.30.2 Wave 3 Stage 2: SECURITY DEFINER RPC to accept business invitations.
-- Aditiva e idempotente. No modifica tablas, RLS, ni datos.

CREATE OR REPLACE FUNCTION public.accept_business_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _inv public.invitations%ROWTYPE;
  _business_role public.business_user_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT * INTO _inv FROM public.invitations WHERE token = _token;

  IF _inv.id IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _inv.scope_type IS DISTINCT FROM 'business' OR _inv.scope_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invitation_scope' USING ERRCODE = '22023';
  END IF;

  -- destinatario previsto: comparación case-insensitive
  IF lower(_inv.email) <> lower(_email) THEN
    RAISE EXCEPTION 'invitation_recipient_mismatch' USING ERRCODE = '42501';
  END IF;

  IF _inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_not_pending' USING ERRCODE = '22023';
  END IF;

  IF _inv.expires_at <= now() THEN
    UPDATE public.invitations
       SET status = 'expired', updated_at = now()
     WHERE id = _inv.id AND status = 'pending';
    RAISE EXCEPTION 'invitation_expired' USING ERRCODE = '22023';
  END IF;

  -- Map app_role -> business_user_role (defensive)
  _business_role := CASE _inv.role
    WHEN 'business_owner' THEN 'owner'::public.business_user_role
    WHEN 'editor'         THEN 'editor'::public.business_user_role
    WHEN 'admin'          THEN 'manager'::public.business_user_role
    ELSE 'viewer'::public.business_user_role
  END;

  INSERT INTO public.business_users (business_id, user_id, role, status, invited_by)
  VALUES (_inv.scope_id, _uid, _business_role, 'active', _inv.invited_by)
  ON CONFLICT (business_id, user_id) DO UPDATE
    SET status = 'active',
        role = EXCLUDED.role,
        updated_at = now();

  UPDATE public.invitations
     SET status = 'accepted',
         accepted_at = now(),
         updated_at = now()
   WHERE id = _inv.id;

  RETURN jsonb_build_object(
    'business_id', _inv.scope_id,
    'role', _business_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_business_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_business_invitation(text) TO authenticated;

-- Helper para que el destinatario pueda PREVISUALIZAR su invitación por token
-- sin exponer otras invitaciones (RLS no permite SELECT directo al invitado).
CREATE OR REPLACE FUNCTION public.preview_business_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _inv public.invitations%ROWTYPE;
  _biz_name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT * INTO _inv FROM public.invitations WHERE token = _token;
  IF _inv.id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF lower(_inv.email) <> lower(_email) THEN
    -- No revelar la existencia a terceros
    RETURN jsonb_build_object('found', false);
  END IF;

  IF _inv.scope_type = 'business' AND _inv.scope_id IS NOT NULL THEN
    SELECT display_name INTO _biz_name FROM public.businesses WHERE id = _inv.scope_id;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'status', _inv.status,
    'expires_at', _inv.expires_at,
    'accepted_at', _inv.accepted_at,
    'role', _inv.role,
    'scope_type', _inv.scope_type,
    'business_id', _inv.scope_id,
    'business_name', _biz_name,
    'email', _inv.email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.preview_business_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_business_invitation(text) TO authenticated;