-- G8-Q2A-R1 · Places model remediation (additive only, no tourism content)

-- 1. Additive columns on points_of_interest --------------------------------
ALTER TABLE public.points_of_interest
  ADD COLUMN IF NOT EXISTS directions text,
  ADD COLUMN IF NOT EXISTS admission_kind text,
  ADD COLUMN IF NOT EXISTS price_to numeric(10,2),
  ADD COLUMN IF NOT EXISTS contact_whatsapp text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

COMMENT ON COLUMN public.points_of_interest.admission_kind IS
  'G8-Q2A-R1: closed text code (gratuito|pago|mixto|no_aplica). Deliberately NOT a PostgreSQL enum to keep the catalogue reversible.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_admission_kind_code') THEN
    ALTER TABLE public.points_of_interest
      ADD CONSTRAINT poi_admission_kind_code
      CHECK (admission_kind IS NULL OR admission_kind IN ('gratuito','pago','mixto','no_aplica')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_price_range_coherent') THEN
    ALTER TABLE public.points_of_interest
      ADD CONSTRAINT poi_price_range_coherent
      CHECK (price_to IS NULL OR price_from IS NULL OR price_to >= price_from) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_social_links_object') THEN
    ALTER TABLE public.points_of_interest
      ADD CONSTRAINT poi_social_links_object
      CHECK (jsonb_typeof(social_links) = 'object') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_contact_email_shape') THEN
    ALTER TABLE public.points_of_interest
      ADD CONSTRAINT poi_contact_email_shape
      CHECK (contact_email IS NULL OR contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poi_contact_website_shape') THEN
    ALTER TABLE public.points_of_interest
      ADD CONSTRAINT poi_contact_website_shape
      CHECK (contact_website IS NULL OR contact_website ~* '^https?://') NOT VALID;
  END IF;
END $$;

-- 2. place_products ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  relation_kind text NOT NULL DEFAULT 'ofrecido',
  sort_order integer NOT NULL DEFAULT 100,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_products_relation_kind_code
    CHECK (relation_kind IN ('oficial','operado','ofrecido','recomendado')),
  UNIQUE (place_id, product_id, relation_kind)
);
REVOKE ALL ON public.place_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.place_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_products TO authenticated;
GRANT ALL ON public.place_products TO service_role;
ALTER TABLE public.place_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "place_products_public_read" ON public.place_products;
CREATE POLICY "place_products_public_read" ON public.place_products FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.points_of_interest p WHERE p.id = place_id AND p.status = 'published' AND p.deleted_at IS NULL));
DROP POLICY IF EXISTS "place_products_staff_write" ON public.place_products;
CREATE POLICY "place_products_staff_write" ON public.place_products FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

-- 3. place_events -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  relation_kind text NOT NULL DEFAULT 'sede',
  sort_order integer NOT NULL DEFAULT 100,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_events_relation_kind_code
    CHECK (relation_kind IN ('sede','organizado','asociado')),
  UNIQUE (place_id, event_id, relation_kind)
);
REVOKE ALL ON public.place_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.place_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_events TO authenticated;
GRANT ALL ON public.place_events TO service_role;
ALTER TABLE public.place_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "place_events_public_read" ON public.place_events;
CREATE POLICY "place_events_public_read" ON public.place_events FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.points_of_interest p WHERE p.id = place_id AND p.status = 'published' AND p.deleted_at IS NULL));
DROP POLICY IF EXISTS "place_events_staff_write" ON public.place_events;
CREATE POLICY "place_events_staff_write" ON public.place_events FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

CREATE INDEX IF NOT EXISTS idx_place_products_place ON public.place_products (place_id);
CREATE INDEX IF NOT EXISTS idx_place_events_place ON public.place_events (place_id);

DROP TRIGGER IF EXISTS trg_place_products_updated_at ON public.place_products;
CREATE TRIGGER trg_place_products_updated_at BEFORE UPDATE ON public.place_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_place_events_updated_at ON public.place_events;
CREATE TRIGGER trg_place_events_updated_at BEFORE UPDATE ON public.place_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Minimal privileges on every place_* table (Q2A + Q2A-R1) ---------------
-- points_of_interest is deliberately excluded: its ACL is historical and shared.
REVOKE ALL ON public.place_types FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.place_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_types TO authenticated;
GRANT ALL ON public.place_types TO service_role;

REVOKE ALL ON public.place_categories FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.place_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_categories TO authenticated;
GRANT ALL ON public.place_categories TO service_role;

REVOKE ALL ON public.place_authority_kinds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.place_authority_kinds TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_authority_kinds TO authenticated;
GRANT ALL ON public.place_authority_kinds TO service_role;

REVOKE ALL ON public.place_category_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.place_category_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_category_links TO authenticated;
GRANT ALL ON public.place_category_links TO service_role;

REVOKE ALL ON public.place_hours FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.place_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_hours TO authenticated;
GRANT ALL ON public.place_hours TO service_role;

REVOKE ALL ON public.place_media FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.place_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_media TO authenticated;
GRANT ALL ON public.place_media TO service_role;

-- place_authorities: no anonymous read or write at all.
REVOKE ALL ON public.place_authorities FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_authorities TO authenticated;
GRANT ALL ON public.place_authorities TO service_role;

-- 5. place_duplicate_warnings becomes SECURITY INVOKER with staff guard -----
DROP FUNCTION IF EXISTS public.place_duplicate_warnings(text);
CREATE FUNCTION public.place_duplicate_warnings(_name text)
RETURNS TABLE (place_id uuid, place_name text, destination_id uuid, slug citext)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.name, p.destination_id, p.slug
    FROM public.points_of_interest p
    WHERE p.deleted_at IS NULL
      AND lower(public.unaccent_immutable_fallback(p.name)) = lower(public.unaccent_immutable_fallback(_name));
END;
$$;
REVOKE ALL ON FUNCTION public.place_duplicate_warnings(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_duplicate_warnings(text) TO authenticated;