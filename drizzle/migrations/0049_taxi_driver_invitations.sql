ALTER TABLE public.taxi_drivers
  ADD COLUMN union_name text,
  ADD COLUMN vehicle_year integer,
  ADD COLUMN vehicle_color text,
  ADD COLUMN vehicle_number text;

CREATE TABLE public.taxi_driver_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_name text,
  invited_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  full_name text,
  email text,
  phone text,
  english boolean NOT NULL DEFAULT false,
  languages text[] NOT NULL DEFAULT ARRAY['es']::text[],
  union_name text,
  license_number text,
  insurance_reference text,
  vehicle_description text,
  vehicle_year integer,
  vehicle_color text,
  vehicle_number text,
  plates text,
  applicant_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  driver_id uuid REFERENCES public.taxi_drivers(id) ON DELETE SET NULL
);
GRANT SELECT ON public.taxi_driver_invitations TO authenticated;
GRANT ALL ON public.taxi_driver_invitations TO service_role;
ALTER TABLE public.taxi_driver_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxi driver invitations admin read" ON public.taxi_driver_invitations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE INDEX taxi_driver_invitations_review ON public.taxi_driver_invitations(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.taxi_admin_create_driver_invitation(_invited_name text DEFAULT NULL, _invited_email text DEFAULT NULL)
RETURNS public.taxi_driver_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v public.taxi_driver_invitations;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _invited_email IS NOT NULL AND _invited_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
  INSERT INTO public.taxi_driver_invitations (invited_name,invited_email,created_by)
  VALUES (NULLIF(btrim(COALESCE(_invited_name,'')),''),NULLIF(lower(btrim(COALESCE(_invited_email,''))),''),auth.uid())
  RETURNING * INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_admin_create_driver_invitation(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_admin_create_driver_invitation(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_driver_invitation_public(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v public.taxi_driver_invitations;
BEGIN
  SELECT * INTO v FROM public.taxi_driver_invitations WHERE token=_token;
  IF v.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'status',v.status,'invited_name',v.invited_name,'invited_email',v.invited_email,
    'can_submit',v.status='pending'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_driver_invitation_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_driver_invitation_public(uuid) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.taxi_submit_driver_invitation(
  _token uuid,
  _full_name text,
  _email text,
  _phone text,
  _english boolean,
  _languages text[],
  _union_name text,
  _license_number text,
  _insurance_reference text,
  _vehicle_description text,
  _vehicle_year integer,
  _vehicle_color text,
  _vehicle_number text,
  _plates text,
  _applicant_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF length(btrim(COALESCE(_full_name,'')))<2 OR _email !~* '^[^@]+@[^@]+\.[^@]+$'
     OR length(btrim(COALESCE(_phone,'')))<8 OR length(btrim(COALESCE(_vehicle_description,'')))<2
     OR length(btrim(COALESCE(_plates,'')))<2 OR length(btrim(COALESCE(_license_number,'')))<2
     OR length(btrim(COALESCE(_insurance_reference,'')))<2 OR length(btrim(COALESCE(_union_name,'')))<2 THEN
    RAISE EXCEPTION 'missing_driver_details';
  END IF;
  IF _vehicle_year IS NOT NULL AND (_vehicle_year<1990 OR _vehicle_year>2035) THEN RAISE EXCEPTION 'invalid_vehicle_year'; END IF;
  UPDATE public.taxi_driver_invitations SET
    status='submitted',full_name=btrim(_full_name),email=lower(btrim(_email)),phone=btrim(_phone),
    english=_english,languages=COALESCE(NULLIF(_languages,'{}'),ARRAY['es']::text[]),
    union_name=btrim(_union_name),license_number=btrim(_license_number),
    insurance_reference=btrim(_insurance_reference),vehicle_description=btrim(_vehicle_description),
    vehicle_year=_vehicle_year,vehicle_color=NULLIF(btrim(COALESCE(_vehicle_color,'')),''),
    vehicle_number=NULLIF(btrim(COALESCE(_vehicle_number,'')),''),plates=upper(btrim(_plates)),
    applicant_notes=NULLIF(btrim(COALESCE(_applicant_notes,'')),''),submitted_at=now()
  WHERE token=_token AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_available'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_submit_driver_invitation(uuid,text,text,text,boolean,text[],text,text,text,text,integer,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_submit_driver_invitation(uuid,text,text,text,boolean,text[],text,text,text,text,integer,text,text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.taxi_admin_complete_driver_invitation(_invitation_id uuid,_user_id uuid,_driver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.taxi_driver_invitations SET status='approved',reviewed_at=now(),reviewed_by=auth.uid(),driver_id=_driver_id
  WHERE id=_invitation_id AND status='submitted';
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_available'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_admin_complete_driver_invitation(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_admin_complete_driver_invitation(uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_admin_reject_driver_invitation(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.taxi_driver_invitations SET status='rejected',reviewed_at=now(),reviewed_by=auth.uid()
  WHERE id=_invitation_id AND status IN ('pending','submitted');
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_admin_reject_driver_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_admin_reject_driver_invitation(uuid) TO authenticated;
