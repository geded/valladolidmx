ALTER TABLE public.place_types
  ADD COLUMN IF NOT EXISTS attraction_family text NOT NULL DEFAULT 'tangible';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'place_types_attraction_family_check') THEN
    ALTER TABLE public.place_types
      ADD CONSTRAINT place_types_attraction_family_check
      CHECK (attraction_family IN ('tangible', 'intangible'));
  END IF;
END $$;

COMMENT ON COLUMN public.place_types.attraction_family IS
  'Familia documental del Inventario de Atractivos (tangible|intangible). Nivel principal; place_types sigue siendo el tipo especifico subordinado.';

ALTER TABLE public.points_of_interest
  ADD COLUMN IF NOT EXISTS attraction_family text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_attraction_family_check') THEN
    ALTER TABLE public.points_of_interest
      ADD CONSTRAINT poi_attraction_family_check
      CHECK (attraction_family IS NULL OR attraction_family IN ('tangible', 'intangible'));
  END IF;
END $$;

COMMENT ON COLUMN public.points_of_interest.attraction_family IS
  'Override administrativo de la familia documental (tangible|intangible). NULL hereda la familia del place_type asignado.';

CREATE INDEX IF NOT EXISTS idx_poi_attraction_family
  ON public.points_of_interest (attraction_family);

CREATE OR REPLACE FUNCTION public.admin_update_place_details(
  _place_id uuid,
  _patch jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _new_type uuid; _new_family text;
BEGIN
  IF NOT (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _patch ? 'place_type_id' THEN
    _new_type := NULLIF(_patch->>'place_type_id','')::uuid;
    IF _new_type IS NULL AND EXISTS (SELECT 1 FROM public.points_of_interest WHERE id = _place_id AND place_type_id IS NOT NULL) THEN
      RAISE EXCEPTION 'place_type_id cannot be cleared once assigned';
    END IF;
    IF _new_type IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.place_types WHERE id = _new_type AND is_active) THEN
      RAISE EXCEPTION 'invalid place_type_id';
    END IF;
  END IF;
  IF _patch ? 'attraction_family' THEN
    _new_family := NULLIF(_patch->>'attraction_family','');
    IF _new_family IS NOT NULL AND _new_family NOT IN ('tangible','intangible') THEN
      RAISE EXCEPTION 'invalid attraction_family';
    END IF;
  END IF;
  UPDATE public.points_of_interest SET
    place_type_id = CASE WHEN _patch ? 'place_type_id' AND _new_type IS NOT NULL THEN _new_type ELSE place_type_id END,
    attraction_family = CASE WHEN _patch ? 'attraction_family' THEN _new_family ELSE attraction_family END,
    official_name = COALESCE(_patch->>'official_name', official_name),
    short_description = COALESCE(_patch->>'short_description', short_description),
    highlights = COALESCE(_patch->'highlights', highlights),
    visit_duration_minutes = COALESCE((_patch->>'visit_duration_minutes')::integer, visit_duration_minutes),
    best_time_to_visit = COALESCE(_patch->>'best_time_to_visit', best_time_to_visit),
    entry_fee_notes = COALESCE(_patch->>'entry_fee_notes', entry_fee_notes),
    price_from = COALESCE((_patch->>'price_from')::numeric, price_from),
    price_currency = COALESCE(_patch->>'price_currency', price_currency),
    accessibility = COALESCE(_patch->'accessibility', accessibility),
    amenities = COALESCE(_patch->'amenities', amenities),
    contact_phone = COALESCE(_patch->>'contact_phone', contact_phone),
    contact_email = COALESCE(_patch->>'contact_email', contact_email),
    contact_website = COALESCE(_patch->>'contact_website', contact_website),
    address_line = COALESCE(_patch->>'address_line', address_line),
    google_place_id = COALESCE(_patch->>'google_place_id', google_place_id),
    updated_by = auth.uid()
  WHERE id = _place_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_place_details(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_place_details(uuid, jsonb) TO authenticated;