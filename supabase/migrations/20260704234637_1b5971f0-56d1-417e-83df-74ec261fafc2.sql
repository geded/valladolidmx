
ALTER TABLE public.traveler_profiles
  ADD COLUMN IF NOT EXISTS public_handle text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_display_name text,
  ADD COLUMN IF NOT EXISTS public_bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE UNIQUE INDEX IF NOT EXISTS traveler_profiles_public_handle_lower_idx
  ON public.traveler_profiles (lower(public_handle))
  WHERE public_handle IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_reserved_traveler_handle(_handle text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(_handle) = ANY (ARRAY[
    'admin','administrator','staff','alux','valladolid','valladolidmx',
    'api','cuenta','account','auth','login','logout','signup','signin',
    'viajero','viajeros','traveler','travelers','empresa','empresas',
    'negocio','negocios','business','concierge','cms','panel','portal',
    'oriente','oriente_maya','orientemaya','maya','pueblo_magico',
    'root','system','support','soporte','help','ayuda','me','yo','tu',
    'about','contact','contacto','home','inicio','settings','ajustes',
    'search','buscar','explore','explorar','discover','descubre',
    'arma_tu_viaje','plan','plans','proposal','proposals'
  ]);
$$;

CREATE OR REPLACE FUNCTION public.validate_traveler_public_handle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_handle IS NOT NULL THEN
    NEW.public_handle := lower(trim(NEW.public_handle));
    IF length(NEW.public_handle) < 3 OR length(NEW.public_handle) > 24 THEN
      RAISE EXCEPTION 'invalid_handle_length' USING ERRCODE = '22023';
    END IF;
    IF NEW.public_handle !~ '^[a-z0-9_]+$' THEN
      RAISE EXCEPTION 'invalid_handle_format' USING ERRCODE = '22023';
    END IF;
    IF public.is_reserved_traveler_handle(NEW.public_handle) THEN
      RAISE EXCEPTION 'reserved_handle' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.public_bio IS NOT NULL AND length(NEW.public_bio) > 200 THEN
    NEW.public_bio := substring(NEW.public_bio, 1, 200);
  END IF;
  IF NEW.public_display_name IS NOT NULL AND length(NEW.public_display_name) > 60 THEN
    NEW.public_display_name := substring(NEW.public_display_name, 1, 60);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_traveler_public_handle ON public.traveler_profiles;
CREATE TRIGGER trg_validate_traveler_public_handle
  BEFORE INSERT OR UPDATE OF public_handle, public_bio, public_display_name
  ON public.traveler_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_traveler_public_handle();

CREATE OR REPLACE FUNCTION public.get_public_traveler_profile(_handle text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'handle', tp.public_handle,
    'display_name', tp.public_display_name,
    'bio', tp.public_bio,
    'avatar_url', tp.avatar_url,
    'home_country', tp.home_country,
    'languages', tp.languages,
    'created_at', tp.created_at
  )
  FROM public.traveler_profiles tp
  WHERE tp.is_public = true
    AND lower(tp.public_handle) = lower(_handle)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_traveler_handle_available(_handle text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h text := lower(trim(coalesce(_handle, '')));
  taken boolean;
BEGIN
  IF length(h) < 3 OR length(h) > 24 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'invalid_length');
  END IF;
  IF h !~ '^[a-z0-9_]+$' THEN
    RETURN jsonb_build_object('available', false, 'reason', 'invalid_format');
  END IF;
  IF public.is_reserved_traveler_handle(h) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'reserved');
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.traveler_profiles WHERE lower(public_handle) = h
  ) INTO taken;
  IF taken THEN
    RETURN jsonb_build_object('available', false, 'reason', 'taken');
  END IF;
  RETURN jsonb_build_object('available', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_traveler_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_traveler_profile(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.check_traveler_handle_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_traveler_handle_available(text) TO anon, authenticated;
