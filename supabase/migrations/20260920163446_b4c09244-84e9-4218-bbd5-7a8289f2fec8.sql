CREATE OR REPLACE FUNCTION public.admin_assign_role(_target_user_id uuid, _role app_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT _target_user_id, _role, v_actor
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _target_user_id
      AND ur.role = _role
      AND ur.scope_type IS NULL
      AND ur.scope_id IS NULL
  );

  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, role, metadata)
  VALUES (v_actor, _target_user_id, 'role.assign', _role, jsonb_build_object('surface', '/admin/sistema/usuarios'));
END;
$function$;