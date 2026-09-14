CREATE OR REPLACE FUNCTION public.validate_traveler_whatsapp_contact_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.whatsapp_contact_consent THEN
    IF NOT OLD.whatsapp_contact_consent OR OLD.whatsapp_contact_consented_at IS NULL THEN
      NEW.whatsapp_contact_consented_at := now();
    ELSE
      NEW.whatsapp_contact_consented_at := OLD.whatsapp_contact_consented_at;
    END IF;
  ELSE
    NEW.whatsapp_contact_consented_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_traveler_whatsapp_contact_consent ON public.traveler_profiles;
CREATE TRIGGER trg_validate_traveler_whatsapp_contact_consent
BEFORE UPDATE OF whatsapp_contact_consent, whatsapp_contact_consented_at
ON public.traveler_profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_traveler_whatsapp_contact_consent();

REVOKE ALL ON FUNCTION public.validate_traveler_whatsapp_contact_consent() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_traveler_whatsapp_contact_consent() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_traveler_whatsapp_contact_consent() TO service_role;