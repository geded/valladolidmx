-- 15.10.10 · US-01 Soft Lock
ALTER TABLE public.page_compositions
  ADD COLUMN IF NOT EXISTS editing_lock jsonb;

COMMENT ON COLUMN public.page_compositions.editing_lock IS
  'Soft lock: {user_id, user_name, acquired_at, heartbeat_at}. Expira si heartbeat_at < now() - 2 min.';

-- Helper: lock activo?
CREATE OR REPLACE FUNCTION public.eb_lock_is_active(lock jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lock IS NOT NULL
    AND (lock->>'heartbeat_at')::timestamptz > now() - interval '2 minutes';
$$;

-- Adquirir lock (o renovar si ya es del mismo usuario)
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
    INSERT INTO public.eb_audit_log(entity_kind, entity_id, action, actor_id, payload)
    VALUES ('composition', _composition_id, 'lock.forced', v_user_id,
            jsonb_build_object('previous_lock', v_current, 'new_lock', v_new));
  END IF;

  RETURN jsonb_build_object('acquired', true, 'lock', v_new);
END;
$$;

-- Heartbeat
CREATE OR REPLACE FUNCTION public.eb_heartbeat_edit_lock(_composition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT editing_lock INTO v_current
  FROM public.page_compositions
  WHERE id = _composition_id
  FOR UPDATE;

  IF v_current IS NULL OR (v_current->>'user_id')::uuid <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'lock', v_current);
  END IF;

  v_current := jsonb_set(v_current, '{heartbeat_at}', to_jsonb(now()));
  UPDATE public.page_compositions SET editing_lock = v_current WHERE id = _composition_id;
  RETURN jsonb_build_object('ok', true, 'lock', v_current);
END;
$$;

-- Release
CREATE OR REPLACE FUNCTION public.eb_release_edit_lock(_composition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT editing_lock INTO v_current
  FROM public.page_compositions
  WHERE id = _composition_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('released', true);
  END IF;

  IF (v_current->>'user_id')::uuid = v_user_id
     OR public.has_role(v_user_id, 'admin')
     OR public.has_role(v_user_id, 'super_admin') THEN
    UPDATE public.page_compositions SET editing_lock = NULL WHERE id = _composition_id;
    RETURN jsonb_build_object('released', true);
  END IF;

  RETURN jsonb_build_object('released', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.eb_acquire_edit_lock(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_heartbeat_edit_lock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_release_edit_lock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_lock_is_active(jsonb) TO authenticated;