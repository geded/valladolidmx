CREATE OR REPLACE FUNCTION public.admin_list_users_with_roles()
 RETURNS TABLE(user_id uuid, email text, display_name text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, roles app_role[], custom_roles jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      (
        SELECT ARRAY_AGG(r ORDER BY r::text)
        FROM (
          SELECT DISTINCT ur.role AS r
          FROM public.user_roles ur
          WHERE ur.user_id = u.id AND ur.role IS NOT NULL
        ) s
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
$function$;