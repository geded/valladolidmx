
-- Extend admin_list_users_with_roles to include custom roles.
DROP FUNCTION IF EXISTS public.admin_list_users_with_roles();

CREATE OR REPLACE FUNCTION public.admin_list_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  roles public.app_role[],
  custom_roles jsonb
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
        SELECT DISTINCT ur.role
        FROM public.user_roles ur
        WHERE ur.user_id = u.id AND ur.role IS NOT NULL
        ORDER BY ur.role::text
      ),
      ARRAY[]::public.app_role[]
    ) AS roles,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', rc.id,
            'slug', rc.slug,
            'name', rc.name,
            'color', rc.color
          )
          ORDER BY rc.sort_order, rc.name
        )
        FROM public.user_roles ur2
        JOIN public.roles_catalog rc ON rc.id = ur2.role_id
        WHERE ur2.user_id = u.id AND ur2.role_id IS NOT NULL
      ),
      '[]'::jsonb
    ) AS custom_roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users_with_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users_with_roles() TO authenticated;

-- Assign a custom role (from roles_catalog) to a user.
CREATE OR REPLACE FUNCTION public.admin_assign_custom_role(
  _target_user_id uuid,
  _role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role  public.roles_catalog%ROWTYPE;
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL OR _role_id IS NULL THEN
    RAISE EXCEPTION 'target user id and role id are required';
  END IF;

  SELECT * INTO v_role FROM public.roles_catalog WHERE id = _role_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'role not found';
  END IF;

  IF v_role.is_system THEN
    RAISE EXCEPTION 'system roles must be assigned via admin_assign_role' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role_id, role, created_by)
  VALUES (_target_user_id, _role_id, 'traveler', v_actor)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, metadata)
  VALUES (
    v_actor,
    _target_user_id,
    'custom_role.assign',
    jsonb_build_object('surface', '/admin/sistema/usuarios', 'role_id', _role_id, 'role_slug', v_role.slug)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_custom_role(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_custom_role(uuid, uuid) TO authenticated;

-- Revoke a custom role from a user.
CREATE OR REPLACE FUNCTION public.admin_revoke_custom_role(
  _target_user_id uuid,
  _role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_slug  text;
BEGIN
  IF NOT public.has_role(v_actor, 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id = v_actor THEN
    RAISE EXCEPTION 'cannot revoke your own roles' USING ERRCODE = '42501';
  END IF;

  SELECT slug INTO v_slug FROM public.roles_catalog WHERE id = _role_id;

  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role_id = _role_id;

  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, metadata)
  VALUES (
    v_actor,
    _target_user_id,
    'custom_role.revoke',
    jsonb_build_object('surface', '/admin/sistema/usuarios', 'role_id', _role_id, 'role_slug', v_slug)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_custom_role(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_custom_role(uuid, uuid) TO authenticated;
