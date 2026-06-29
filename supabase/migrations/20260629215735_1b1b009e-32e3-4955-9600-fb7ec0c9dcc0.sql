CREATE OR REPLACE FUNCTION public.log_business_presence_audit(
  _business_id uuid,
  _action text,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF _action IS NULL OR length(_action) = 0 OR length(_action) > 64 THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;

  -- Solo permitimos acciones del dominio de presencia
  IF _action NOT IN (
    'contact.create','contact.update','contact.delete',
    'location.create','location.update','location.delete',
    'hours.create','hours.update','hours.delete',
    'social.create','social.update','social.delete'
  ) THEN
    RAISE EXCEPTION 'invalid_action_domain' USING ERRCODE = '22023';
  END IF;

  IF NOT public.has_business_access(_uid, _business_id, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('business', _business_id, _action, _uid, NULLIF(left(coalesce(_notes,''), 1000), ''));
END;
$$;

REVOKE ALL ON FUNCTION public.log_business_presence_audit(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_business_presence_audit(uuid, text, text) TO authenticated;