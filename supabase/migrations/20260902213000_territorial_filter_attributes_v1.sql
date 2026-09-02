-- Territorial Filter Attributes v1
-- Additive, reversible by dropping the new column/tables/functions.
-- Existing business rows remain untouched and resolve to an empty object.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS filter_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_filter_attributes_object;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_filter_attributes_object
  CHECK (jsonb_typeof(filter_attributes) = 'object');

CREATE TABLE IF NOT EXISTS public.tourism_attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_key text NOT NULL,
  attribute_key text NOT NULL,
  label text NOT NULL,
  help_text text,
  input_type text NOT NULL CHECK (input_type IN ('single', 'multi')),
  filter_group text NOT NULL CHECK (filter_group IN ('zone', 'primary', 'secondary', 'profile', 'policy', 'commercial')),
  filterable boolean NOT NULL DEFAULT true,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_key, attribute_key)
);

CREATE TABLE IF NOT EXISTS public.tourism_attribute_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.tourism_attribute_definitions(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (definition_id, value)
);

CREATE INDEX IF NOT EXISTS idx_tourism_attribute_definitions_family
  ON public.tourism_attribute_definitions(family_key, active, sort_order);
CREATE INDEX IF NOT EXISTS idx_tourism_attribute_options_definition
  ON public.tourism_attribute_options(definition_id, active, sort_order);
CREATE INDEX IF NOT EXISTS idx_businesses_filter_attributes_gin
  ON public.businesses USING gin(filter_attributes);

ALTER TABLE public.tourism_attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tourism_attribute_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tourism_attribute_definitions_public_read ON public.tourism_attribute_definitions;
CREATE POLICY tourism_attribute_definitions_public_read
  ON public.tourism_attribute_definitions FOR SELECT TO anon, authenticated
  USING (active = true);
DROP POLICY IF EXISTS tourism_attribute_definitions_admin_write ON public.tourism_attribute_definitions;
CREATE POLICY tourism_attribute_definitions_admin_write
  ON public.tourism_attribute_definitions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS tourism_attribute_options_public_read ON public.tourism_attribute_options;
CREATE POLICY tourism_attribute_options_public_read
  ON public.tourism_attribute_options FOR SELECT TO anon, authenticated
  USING (active = true);
DROP POLICY IF EXISTS tourism_attribute_options_admin_write ON public.tourism_attribute_options;
CREATE POLICY tourism_attribute_options_admin_write
  ON public.tourism_attribute_options FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT ON public.tourism_attribute_definitions, public.tourism_attribute_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tourism_attribute_definitions, public.tourism_attribute_options TO authenticated;
GRANT ALL ON public.tourism_attribute_definitions, public.tourism_attribute_options TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_tourism_attribute_family(_category_slug text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(coalesce(_category_slug, ''))
    WHEN 'hotel' THEN 'hoteles'
    WHEN 'hoteles' THEN 'hoteles'
    WHEN 'hospedaje' THEN 'hoteles'
    WHEN 'hospedajes' THEN 'hoteles'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.validate_business_filter_attributes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_family text;
  v_category text;
  v_pair record;
  v_definition public.tourism_attribute_definitions%ROWTYPE;
  v_value text;
BEGIN
  IF NEW.filter_attributes = '{}'::jsonb THEN RETURN NEW; END IF;

  SELECT bc.slug::text INTO v_category
  FROM public.business_categories bc WHERE bc.id = NEW.primary_category_id;
  v_family := public.resolve_tourism_attribute_family(v_category);
  IF v_family IS NULL THEN
    RAISE EXCEPTION 'filter_attributes_not_supported_for_category';
  END IF;

  FOR v_pair IN SELECT key, value FROM jsonb_each(NEW.filter_attributes) LOOP
    SELECT * INTO v_definition
    FROM public.tourism_attribute_definitions
    WHERE family_key = v_family AND attribute_key = v_pair.key AND active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown_filter_attribute:%', v_pair.key; END IF;

    IF v_definition.input_type = 'single' AND jsonb_typeof(v_pair.value) <> 'string' THEN
      RAISE EXCEPTION 'single_filter_attribute_requires_string:%', v_pair.key;
    ELSIF v_definition.input_type = 'multi' AND jsonb_typeof(v_pair.value) <> 'array' THEN
      RAISE EXCEPTION 'multi_filter_attribute_requires_array:%', v_pair.key;
    END IF;

    IF v_definition.input_type = 'single' THEN
      v_value := v_pair.value #>> '{}';
      IF NOT EXISTS (
        SELECT 1 FROM public.tourism_attribute_options o
        WHERE o.definition_id = v_definition.id AND o.value = v_value AND o.active = true
      ) THEN RAISE EXCEPTION 'invalid_filter_attribute_option:%:%', v_pair.key, v_value; END IF;
    ELSE
      FOR v_value IN SELECT jsonb_array_elements_text(v_pair.value) LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.tourism_attribute_options o
          WHERE o.definition_id = v_definition.id AND o.value = v_value AND o.active = true
        ) THEN RAISE EXCEPTION 'invalid_filter_attribute_option:%:%', v_pair.key, v_value; END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_validate_business_filter_attributes ON public.businesses;
CREATE TRIGGER trg_validate_business_filter_attributes
  BEFORE INSERT OR UPDATE OF filter_attributes, primary_category_id ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.validate_business_filter_attributes();

WITH definitions(attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order) AS (
  VALUES
    ('zone', 'Zona o barrio', 'Ubicación reconocible dentro del destino.', 'single', 'zone', true, false, 10),
    ('hotel_type', 'Tipo de hospedaje', 'Formato principal del establecimiento.', 'single', 'primary', true, true, 20),
    ('services', 'Servicios', 'Servicios operativos ofrecidos por el hotel.', 'multi', 'secondary', true, false, 30),
    ('amenities', 'Amenidades', 'Comodidades disponibles para huéspedes.', 'multi', 'secondary', true, false, 40),
    ('accessibility', 'Accesibilidad', 'Condiciones confirmadas de accesibilidad.', 'multi', 'secondary', true, false, 50),
    ('traveler_profile', 'Ideal para', 'Perfiles de viaje que atiende el hospedaje.', 'multi', 'profile', true, false, 60),
    ('policies', 'Políticas relevantes', 'Condiciones que el viajero debe conocer.', 'multi', 'policy', false, false, 70),
    ('price_level', 'Nivel de precio orientativo', 'Clasificación informativa; no sustituye tarifas.', 'single', 'commercial', true, false, 80)
)
INSERT INTO public.tourism_attribute_definitions
  (family_key, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order)
SELECT 'hoteles', attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order
FROM definitions
ON CONFLICT (family_key, attribute_key) DO NOTHING;

WITH option_seed(attribute_key, value, label, sort_order) AS (
  VALUES
    ('zone','centro-historico','Centro Histórico',10), ('zone','sisal','Barrio de Sisal',20),
    ('zone','calzada-frailes','Calzada de los Frailes',30), ('zone','periferia','Periferia',40), ('zone','entorno-rural','Entorno rural',50),
    ('hotel_type','boutique','Hotel boutique',10), ('hotel_type','hacienda','Hacienda',20), ('hotel_type','posada','Posada',30),
    ('hotel_type','urbano','Hotel urbano',40), ('hotel_type','ecologico','Hotel ecológico',50), ('hotel_type','hostal','Hostal',60), ('hotel_type','bed-breakfast','Bed and breakfast',70),
    ('services','estacionamiento','Estacionamiento',10), ('services','restaurante','Restaurante',20), ('services','desayuno','Desayuno',30),
    ('services','recepcion-24h','Recepción 24 horas',40), ('services','traslado','Traslado',50), ('services','tours','Tours y experiencias',60),
    ('amenities','piscina','Piscina',10), ('amenities','aire-acondicionado','Aire acondicionado',20), ('amenities','wifi','Wi-Fi',30),
    ('amenities','jardin','Jardín',40), ('amenities','terraza','Terraza',50), ('amenities','spa','Spa',60), ('amenities','pet-friendly','Admite mascotas',70),
    ('accessibility','sin-escalones','Acceso sin escalones',10), ('accessibility','habitacion-accesible','Habitación accesible',20),
    ('accessibility','bano-adaptado','Baño adaptado',30), ('accessibility','estacionamiento-reservado','Estacionamiento reservado',40),
    ('traveler_profile','parejas','Parejas',10), ('traveler_profile','familias','Familias',20), ('traveler_profile','solo','Viaje solo',30),
    ('traveler_profile','amigos','Amigos',40), ('traveler_profile','negocios','Negocios',50),
    ('policies','acepta-menores','Acepta menores',10), ('policies','solo-adultos','Solo adultos',20), ('policies','no-fumar','No fumar',30),
    ('policies','acepta-mascotas','Acepta mascotas',40),
    ('price_level','economico','Económico',10), ('price_level','medio','Medio',20), ('price_level','premium','Premium',30), ('price_level','lujo','Lujo',40)
)
INSERT INTO public.tourism_attribute_options(definition_id, value, label, sort_order)
SELECT d.id, s.value, s.label, s.sort_order
FROM option_seed s JOIN public.tourism_attribute_definitions d
  ON d.family_key = 'hoteles' AND d.attribute_key = s.attribute_key
ON CONFLICT (definition_id, value) DO NOTHING;

COMMENT ON COLUMN public.businesses.filter_attributes IS
  'Controlled, category-scoped attributes used by public filters, entity profiles and Alux. Empty means unknown and is omitted.';
