CREATE OR REPLACE FUNCTION public.get_available_modes(_user_id uuid)
RETURNS profile_mode[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  modes public.profile_mode[] := ARRAY['traveler']::public.profile_mode[];
  is_staff_admin boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN modes;
  END IF;

  is_staff_admin := EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('super_admin'::public.app_role, 'admin'::public.app_role)
  );

  IF is_staff_admin OR EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.user_id = _user_id
      AND COALESCE(bu.status, 'active') = 'active'
  ) THEN
    modes := modes || 'business'::public.profile_mode;
  END IF;

  IF is_staff_admin OR EXISTS (
    SELECT 1 FROM public.concierge_profiles cp
    WHERE cp.user_id = _user_id
  ) THEN
    modes := modes || 'concierge'::public.profile_mode;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('super_admin'::public.app_role, 'admin'::public.app_role, 'editor'::public.app_role, 'concierge'::public.app_role)
  ) THEN
    modes := modes || 'staff'::public.profile_mode;
  END IF;

  RETURN modes;
END;
$function$;