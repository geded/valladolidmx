
-- 15.10.4R · Paso E — Roles management RPCs (super_admin only).

-- 1) List users with roles (SECURITY DEFINER, super_admin only).
CREATE OR REPLACE FUNCTION public.admin_list_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  roles public.app_role[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    p.display_name,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(
      ARRAY(
        SELECT ur.role
        FROM public.user_roles ur
        WHERE ur.user_id = u.id
        ORDER BY ur.role::text
      ),
      ARRAY[]::public.app_role[]
    ) AS roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users_with_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users_with_roles() TO authenticated;

-- 2) Assign role (super_admin only; cannot assign 'super_admin').
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  _target_user_id uuid,
  _role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required' USING ERRCODE = '42501';
  END IF;

  IF _role = 'super_admin' THEN
    RAISE EXCEPTION 'super_admin role cannot be granted from this surface' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'target user id is required';
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_target_user_id, _role, v_actor)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, role, metadata)
  VALUES (v_actor, _target_user_id, 'role.assign', _role, jsonb_build_object('surface', '/admin/sistema/usuarios'));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, public.app_role) TO authenticated;

-- 3) Revoke role (super_admin only; cannot revoke 'super_admin'; cannot self-revoke).
CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  _target_user_id uuid,
  _role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required' USING ERRCODE = '42501';
  END IF;

  IF _role = 'super_admin' THEN
    RAISE EXCEPTION 'super_admin role cannot be revoked from this surface' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id = v_actor THEN
    RAISE EXCEPTION 'cannot revoke your own roles' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role = _role;

  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, role, metadata)
  VALUES (v_actor, _target_user_id, 'role.revoke', _role, jsonb_build_object('surface', '/admin/sistema/usuarios'));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role) TO authenticated;
