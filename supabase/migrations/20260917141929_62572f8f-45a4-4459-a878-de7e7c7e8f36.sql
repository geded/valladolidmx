ALTER TABLE public.products
  ADD COLUMN location_id uuid NULL REFERENCES public.business_locations(id) ON DELETE SET NULL;

CREATE INDEX products_location_id_idx ON public.products(location_id);

CREATE OR REPLACE FUNCTION public.products_validate_location_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.business_locations bl
    WHERE bl.id = NEW.location_id
      AND bl.business_id = NEW.business_id
      AND bl.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'product_location_must_belong_to_business';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_validate_location_ownership_before_write
BEFORE INSERT OR UPDATE OF location_id, business_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_validate_location_ownership();