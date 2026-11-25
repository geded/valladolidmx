ALTER TABLE public.restaurant_booking_settings ADD COLUMN IF NOT EXISTS floor_plan jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.restaurant_reservations ADD COLUMN IF NOT EXISTS table_id text;

CREATE TABLE public.restaurant_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_phone text,
  party_size int NOT NULL CHECK (party_size BETWEEN 1 AND 60),
  quoted_minutes int NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'esperando' CHECK (status IN ('esperando','avisado','sentado','se_fue')),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurant_waitlist_day_idx ON public.restaurant_waitlist (business_id, created_at);
GRANT SELECT ON public.restaurant_waitlist TO authenticated;
GRANT ALL ON public.restaurant_waitlist TO service_role;
ALTER TABLE public.restaurant_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw team admin read" ON public.restaurant_waitlist FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'viewer') OR public.is_editor_or_admin(auth.uid()));

CREATE TABLE public.restaurant_guest_notes (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone_key text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, phone_key)
);
GRANT SELECT ON public.restaurant_guest_notes TO authenticated;
GRANT ALL ON public.restaurant_guest_notes TO service_role;
ALTER TABLE public.restaurant_guest_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rgn team admin read" ON public.restaurant_guest_notes FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'viewer') OR public.is_editor_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public._restaurant_staff(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_business_access(auth.uid(), _business_id, 'editor') OR public.is_editor_or_admin(auth.uid()); $$;

CREATE OR REPLACE FUNCTION public.restaurant_floor_plan_save(_business_id uuid, _plan jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_business_access(auth.uid(), _business_id, 'manager') OR public.is_editor_or_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF jsonb_typeof(_plan) <> 'array' OR jsonb_array_length(_plan) > 120 THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  INSERT INTO public.restaurant_booking_settings (business_id, floor_plan, updated_by)
  VALUES (_business_id, _plan, auth.uid())
  ON CONFLICT (business_id) DO UPDATE SET floor_plan = EXCLUDED.floor_plan, updated_by = auth.uid(), updated_at = now();
END; $$;

CREATE OR REPLACE FUNCTION public.restaurant_assign_table(_id uuid, _table_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r public.restaurant_reservations;
BEGIN
  SELECT * INTO r FROM public.restaurant_reservations WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public._restaurant_staff(r.business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _table_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.restaurant_reservations o
     WHERE o.business_id = r.business_id AND o.id <> r.id AND o.table_id = _table_id
       AND o.status IN ('pendiente','confirmada','llego','sentada')
       AND o.starts_at < r.ends_at AND o.ends_at > r.starts_at) THEN
    RAISE EXCEPTION 'table_taken';
  END IF;
  UPDATE public.restaurant_reservations SET table_id = NULLIF(btrim(_table_id), ''), updated_at = now() WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.restaurant_waitlist_add(_business_id uuid, _name text, _phone text, _party int, _quoted int, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public._restaurant_staff(_business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.restaurant_waitlist (business_id, guest_name, guest_phone, party_size, quoted_minutes, note, created_by)
  VALUES (_business_id, left(btrim(_name), 120), NULLIF(left(btrim(COALESCE(_phone,'')), 20), ''), _party,
          LEAST(GREATEST(COALESCE(_quoted, 15), 0), 240), NULLIF(left(btrim(COALESCE(_note,'')), 300), ''), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.restaurant_waitlist_set(_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_biz uuid;
BEGIN
  SELECT business_id INTO v_biz FROM public.restaurant_waitlist WHERE id = _id;
  IF v_biz IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public._restaurant_staff(v_biz) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('esperando','avisado','sentado','se_fue') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  UPDATE public.restaurant_waitlist SET status = _status, updated_at = now() WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.restaurant_guest_note_save(_business_id uuid, _phone_key text, _tags text[], _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public._restaurant_staff(_business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF COALESCE(btrim(_phone_key), '') = '' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  INSERT INTO public.restaurant_guest_notes (business_id, phone_key, tags, note, updated_by)
  VALUES (_business_id, left(_phone_key, 20), COALESCE(_tags[1:12], '{}'), NULLIF(left(btrim(COALESCE(_note,'')), 1000), ''), auth.uid())
  ON CONFLICT (business_id, phone_key) DO UPDATE SET tags = EXCLUDED.tags, note = EXCLUDED.note, updated_by = auth.uid(), updated_at = now();
END; $$;

REVOKE EXECUTE ON FUNCTION public._restaurant_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_floor_plan_save(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_assign_table(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_waitlist_add(uuid, text, text, int, int, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_waitlist_set(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_guest_note_save(uuid, text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._restaurant_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_floor_plan_save(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_assign_table(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_waitlist_add(uuid, text, text, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_waitlist_set(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_guest_note_save(uuid, text, text[], text) TO authenticated;