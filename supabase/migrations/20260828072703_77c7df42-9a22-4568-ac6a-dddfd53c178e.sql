-- G8-Q2A · Places Data Model (additive only, no tourism content)
-- Snapshot of pre-existing points_of_interest policies (for rollback):
--   POLICY "geo editor manage poi" FOR ALL TO authenticated
--     USING (is_editor_or_admin(auth.uid())) WITH CHECK (is_editor_or_admin(auth.uid()));
--   POLICY "poi_perm_write" FOR ALL TO authenticated
--     USING (has_permission(auth.uid(),'poi.write')) WITH CHECK (has_permission(auth.uid(),'poi.write'));
--   POLICY "poi_public_read" FOR SELECT TO anon, authenticated
--     USING (status = 'published' AND deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.unaccent_immutable_fallback(_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT translate(coalesce(_value,''), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouAEIOUnNuU');
$$;

-- 1. Structural catalogs -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.place_types TO anon, authenticated;
GRANT ALL ON public.place_types TO service_role;
ALTER TABLE public.place_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "place_types_public_read" ON public.place_types FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "place_types_staff_write" ON public.place_types FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

CREATE TABLE IF NOT EXISTS public.place_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.place_categories TO anon, authenticated;
GRANT ALL ON public.place_categories TO service_role;
ALTER TABLE public.place_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "place_categories_public_read" ON public.place_categories FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "place_categories_staff_write" ON public.place_categories FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

CREATE TABLE IF NOT EXISTS public.place_authority_kinds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.place_authority_kinds TO anon, authenticated;
GRANT ALL ON public.place_authority_kinds TO service_role;
ALTER TABLE public.place_authority_kinds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "place_authority_kinds_public_read" ON public.place_authority_kinds FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "place_authority_kinds_staff_write" ON public.place_authority_kinds FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

-- 2. Additive columns on points_of_interest (no SEO duplication) ----------
ALTER TABLE public.points_of_interest
  ADD COLUMN IF NOT EXISTS place_type_id uuid REFERENCES public.place_types(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS official_name text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visit_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS best_time_to_visit text,
  ADD COLUMN IF NOT EXISTS entry_fee_notes text,
  ADD COLUMN IF NOT EXISTS price_from numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_currency text NOT NULL DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS accessibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_website text,
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS google_place_id text;

COMMENT ON COLUMN public.points_of_interest.place_type_id IS
  'G8-Q2A: nullable for historical rows. Classification of pre-existing places is deferred to G8-Q2C. NOT NULL only after full accreditation.';

CREATE INDEX IF NOT EXISTS idx_poi_place_type ON public.points_of_interest (place_type_id);

-- 3. Relational tables ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_category_links (
  place_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.place_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, category_id)
);
GRANT SELECT ON public.place_category_links TO anon, authenticated;
GRANT ALL ON public.place_category_links TO service_role;
ALTER TABLE public.place_category_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "place_category_links_public_read" ON public.place_category_links FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.points_of_interest p WHERE p.id = place_id AND p.status = 'published' AND p.deleted_at IS NULL));
CREATE POLICY "place_category_links_staff_write" ON public.place_category_links FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

CREATE TABLE IF NOT EXISTS public.place_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at time,
  closes_at time,
  is_closed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, day_of_week)
);
GRANT SELECT ON public.place_hours TO anon, authenticated;
GRANT ALL ON public.place_hours TO service_role;
ALTER TABLE public.place_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "place_hours_public_read" ON public.place_hours FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.points_of_interest p WHERE p.id = place_id AND p.status = 'published' AND p.deleted_at IS NULL));
CREATE POLICY "place_hours_staff_write" ON public.place_hours FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

CREATE TABLE IF NOT EXISTS public.place_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'gallery',
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, media_asset_id, role)
);
GRANT SELECT ON public.place_media TO anon, authenticated;
GRANT ALL ON public.place_media TO service_role;
ALTER TABLE public.place_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "place_media_public_read" ON public.place_media FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.points_of_interest p WHERE p.id = place_id AND p.status = 'published' AND p.deleted_at IS NULL));
CREATE POLICY "place_media_staff_write" ON public.place_media FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

CREATE TABLE IF NOT EXISTS public.place_authorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  authority_kind_id uuid NOT NULL REFERENCES public.place_authority_kinds(id) ON DELETE RESTRICT,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  authority_name text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_authorities_identity_present CHECK (business_id IS NOT NULL OR authority_name IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_authorities TO authenticated;
GRANT ALL ON public.place_authorities TO service_role;
ALTER TABLE public.place_authorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "place_authorities_staff_read" ON public.place_authorities FOR SELECT TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));
CREATE POLICY "place_authorities_staff_write" ON public.place_authorities FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

CREATE UNIQUE INDEX IF NOT EXISTS uniq_place_primary_authority
  ON public.place_authorities (place_id) WHERE is_primary = true;

-- 4. updated_at triggers ---------------------------------------------------
CREATE TRIGGER trg_place_types_updated_at BEFORE UPDATE ON public.place_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_place_categories_updated_at BEFORE UPDATE ON public.place_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_place_authority_kinds_updated_at BEFORE UPDATE ON public.place_authority_kinds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_place_hours_updated_at BEFORE UPDATE ON public.place_hours FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_place_authorities_updated_at BEFORE UPDATE ON public.place_authorities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS reconciliation on points_of_interest ------------------------------
-- Both historical write policies resolved to staff only (poi.write is granted
-- exclusively to admin and editor; is_editor_or_admin covers editor/admin/super_admin).
-- They are consolidated into one explicit policy preserving the exact same union.
DROP POLICY IF EXISTS "geo editor manage poi" ON public.points_of_interest;
DROP POLICY IF EXISTS "poi_perm_write" ON public.points_of_interest;
CREATE POLICY "poi_staff_write" ON public.points_of_interest FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

-- 6. Structural catalog seed (no tourism content) ---------------------------
INSERT INTO public.place_types (slug, name, sort_order) VALUES
  ('zona-arqueologica','Zona arqueológica',10),
  ('cenote','Cenote',20),
  ('museo','Museo',30),
  ('templo-convento','Templo o convento',40),
  ('monumento-historico','Monumento histórico',50),
  ('calle-emblematica','Calle emblemática',60),
  ('plaza-parque','Plaza o parque',70),
  ('mercado-artesanal','Mercado o centro artesanal',80),
  ('centro-cultural','Centro cultural',90),
  ('hacienda','Hacienda',100),
  ('gruta','Gruta o caverna',110),
  ('area-natural','Área natural protegida',120),
  ('mirador','Mirador',130),
  ('cuerpo-de-agua','Playa, laguna o ría',140),
  ('otro','Otro atractivo',900)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.place_categories (slug, name, sort_order) VALUES
  ('cultura','Cultura',10),
  ('patrimonio','Patrimonio',20),
  ('naturaleza','Naturaleza',30),
  ('arqueologia','Arqueología',40),
  ('aventura','Aventura',50),
  ('artesanias','Artesanías',60),
  ('gastronomia','Gastronomía',70),
  ('familia','Para toda la familia',80),
  ('fotografia','Fotografía',90)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.place_authority_kinds (slug, name, sort_order) VALUES
  ('autoridad-federal','Autoridad federal',10),
  ('autoridad-estatal','Autoridad estatal',20),
  ('autoridad-municipal','Autoridad municipal',30),
  ('operador','Operador',40),
  ('custodio','Custodio o comunidad',50),
  ('propietario','Propietario',60)
ON CONFLICT (slug) DO NOTHING;

-- 7. Scoped administrative functions ---------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_place(
  _destination_id uuid,
  _slug citext,
  _name text,
  _place_type_id uuid,
  _description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _place_type_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.place_types WHERE id = _place_type_id AND is_active) THEN
    RAISE EXCEPTION 'place_type_id is required and must reference an active place type';
  END IF;
  INSERT INTO public.points_of_interest (destination_id, slug, name, description, place_type_id, status, created_by, updated_by)
  VALUES (_destination_id, _slug, _name, _description, _place_type_id, 'draft', auth.uid(), auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_place(uuid, citext, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_place(uuid, citext, text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_place_details(
  _place_id uuid,
  _patch jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _new_type uuid;
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
  UPDATE public.points_of_interest SET
    place_type_id = CASE WHEN _patch ? 'place_type_id' AND _new_type IS NOT NULL THEN _new_type ELSE place_type_id END,
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

CREATE OR REPLACE FUNCTION public.admin_set_place_categories(
  _place_id uuid,
  _category_ids uuid[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.place_category_links WHERE place_id = _place_id;
  INSERT INTO public.place_category_links (place_id, category_id)
  SELECT _place_id, c.id FROM public.place_categories c
  WHERE c.id = ANY(COALESCE(_category_ids, '{}'::uuid[])) AND c.is_active
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_place_categories(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_place_categories(uuid, uuid[]) TO authenticated;

-- Advisory only: cross-destination duplicate detection (never blocks writes)
CREATE OR REPLACE FUNCTION public.place_duplicate_warnings(_name text)
RETURNS TABLE (place_id uuid, place_name text, destination_id uuid, slug citext)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.destination_id, p.slug
  FROM public.points_of_interest p
  WHERE p.deleted_at IS NULL
    AND lower(public.unaccent_immutable_fallback(p.name)) = lower(public.unaccent_immutable_fallback(_name));
$$;
REVOKE ALL ON FUNCTION public.place_duplicate_warnings(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_duplicate_warnings(text) TO authenticated;