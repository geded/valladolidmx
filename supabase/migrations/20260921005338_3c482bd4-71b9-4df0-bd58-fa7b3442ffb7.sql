CREATE OR REPLACE FUNCTION public.eb_acquire_edit_lock(
  _composition_id uuid,
  _force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_current jsonb;
  v_new jsonb;
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT COALESCE(display_name, email, 'Editor')
    INTO v_user_name
  FROM public.profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  SELECT editing_lock INTO v_current
  FROM public.page_compositions
  WHERE id = _composition_id
  FOR UPDATE;

  v_is_admin := public.has_role(v_user_id, 'admin')
             OR public.has_role(v_user_id, 'super_admin');

  IF public.eb_lock_is_active(v_current)
     AND (v_current->>'user_id')::uuid <> v_user_id
     AND NOT _force THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'lock', v_current
    );
  END IF;

  IF _force AND public.eb_lock_is_active(v_current)
     AND (v_current->>'user_id')::uuid <> v_user_id
     AND NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden: only admins can force a lock';
  END IF;

  v_new := jsonb_build_object(
    'user_id', v_user_id,
    'user_name', COALESCE(v_user_name, 'Editor'),
    'acquired_at', to_jsonb(now()),
    'heartbeat_at', to_jsonb(now())
  );

  UPDATE public.page_compositions
     SET editing_lock = v_new
   WHERE id = _composition_id;

  IF _force AND v_current IS NOT NULL
     AND (v_current->>'user_id')::uuid <> v_user_id THEN
    INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
    VALUES ('page', _composition_id, 'lock.forced', v_user_id,
            jsonb_build_object('previous_lock', v_current, 'new_lock', v_new));
  END IF;

  RETURN jsonb_build_object('acquired', true, 'lock', v_new);
END;
$$;