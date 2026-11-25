CREATE OR REPLACE FUNCTION public._guard_business_media_asset_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF public.is_editor_or_admin(auth.uid()) THEN RETURN NEW; END IF;
  SELECT (m.entity_id = NEW.business_id)
         OR (m.created_by IS NOT NULL AND public.has_business_access(m.created_by, NEW.business_id, 'viewer'::business_user_role))
    INTO v_ok
  FROM public.media_assets m WHERE m.id = NEW.media_asset_id;
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'forbidden: media asset belongs to another business';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_business_media_asset_owner ON public.business_media;
CREATE TRIGGER guard_business_media_asset_owner BEFORE INSERT OR UPDATE OF media_asset_id, business_id ON public.business_media
  FOR EACH ROW EXECUTE FUNCTION public._guard_business_media_asset_owner();

CREATE OR REPLACE FUNCTION public._guard_avatar_path()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF NEW.avatar_url IS NULL OR NEW.avatar_url = ''
     OR NEW.avatar_url ~* '^https://'
     OR NEW.avatar_url LIKE (NEW.user_id::text || '/%') THEN
    IF NEW.avatar_url LIKE '%..%' THEN RAISE EXCEPTION 'invalid avatar path'; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'invalid avatar path';
END $$;
DROP TRIGGER IF EXISTS guard_avatar_path ON public.traveler_profiles;
CREATE TRIGGER guard_avatar_path BEFORE INSERT OR UPDATE OF avatar_url ON public.traveler_profiles
  FOR EACH ROW EXECUTE FUNCTION public._guard_avatar_path();
DROP TRIGGER IF EXISTS guard_avatar_path ON public.profiles;
CREATE TRIGGER guard_avatar_path BEFORE INSERT OR UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._guard_avatar_path();