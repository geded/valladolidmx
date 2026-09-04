-- Lote 3C · A · Casas de vacaciones CMS-first (aditivo y reversible)

ALTER TABLE public.business_categories
  ADD COLUMN IF NOT EXISTS listing_family_key text;

COMMENT ON COLUMN public.business_categories.listing_family_key IS
  'Lote 3C: familia de listado turístico administrable (hoteles, restaurantes, experiencias, casas-de-vacaciones). Autoridad CMS-first: sustituye las listas de slugs en código.';

UPDATE public.business_categories SET listing_family_key = 'hoteles'
  WHERE lower(slug) IN ('hoteles','hotel','hospedaje','hospedajes') AND listing_family_key IS NULL;
UPDATE public.business_categories SET listing_family_key = 'restaurantes'
  WHERE lower(slug) IN ('restaurantes','restaurante','gastronomia','gastronomía') AND listing_family_key IS NULL;
UPDATE public.business_categories SET listing_family_key = 'experiencias'
  WHERE lower(slug) IN ('experiencias','experiencias-tours','tours') AND listing_family_key IS NULL;
UPDATE public.business_categories SET listing_family_key = 'casas-de-vacaciones'
  WHERE lower(slug) IN ('casas-de-vacaciones','casas-vacacionales','casa-de-vacaciones','villas','rentas-vacacionales','renta-vacacional','airbnb','casas') AND listing_family_key IS NULL;

-- Definiciones de atributos faltantes para casas de vacaciones
INSERT INTO public.tourism_attribute_definitions
  (family_key, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order, active)
VALUES
  ('casas-de-vacaciones','beds','Camas','Número total de camas disponibles.','single','secondary',true,false,35,true),
  ('casas-de-vacaciones','bathrooms','Baños','Número de baños completos.','single','secondary',true,false,36,true),
  ('casas-de-vacaciones','accessibility','Accesibilidad','Condiciones de acceso relevantes para el viajero.','multi','profile',true,false,37,true)
ON CONFLICT DO NOTHING;

INSERT INTO public.tourism_attribute_options (definition_id, value, label, sort_order, active)
SELECT d.id, v.value, v.label, v.sort_order, true
FROM public.tourism_attribute_definitions d
JOIN (VALUES
  ('beds','1','1 cama',10),
  ('beds','2','2 camas',20),
  ('beds','3','3 camas',30),
  ('beds','4','4 camas',40),
  ('beds','5-mas','5 o más camas',50),
  ('bathrooms','1','1 baño',10),
  ('bathrooms','2','2 baños',20),
  ('bathrooms','3','3 baños',30),
  ('bathrooms','4-mas','4 o más baños',40),
  ('accessibility','planta-baja','Todo en planta baja',10),
  ('accessibility','acceso-silla-ruedas','Acceso para silla de ruedas',20),
  ('accessibility','bano-adaptado','Baño adaptado',30),
  ('accessibility','estacionamiento-accesible','Estacionamiento accesible',40)
) AS v(attribute_key, value, label, sort_order)
  ON v.attribute_key = d.attribute_key
WHERE d.family_key = 'casas-de-vacaciones'
  AND NOT EXISTS (
    SELECT 1 FROM public.tourism_attribute_options o
    WHERE o.definition_id = d.id AND o.value = v.value
  );

-- Datos demo administrables y reversibles de las dos casas ya existentes
UPDATE public.businesses SET
  filter_attributes = jsonb_build_object(
    'zone','sisal',
    'property_type','casa-completa',
    'capacity','5-6',
    'bedrooms','3',
    'beds','4',
    'bathrooms','2',
    'amenities', jsonb_build_array('piscina','cocina','wifi','aire-acondicionado','jardin'),
    'stay_features', jsonb_build_array('auto-check-in','estancia-larga'),
    'traveler_profile', jsonb_build_array('familias','amigos'),
    'house_rules', jsonb_build_array('no-fiestas','no-fumar'),
    'accessibility', jsonb_build_array('planta-baja'),
    'price_level','medio'
  ),
  status = 'published',
  published_at = COALESCE(published_at, now()),
  source_review_state = 'approved',
  is_demo_seed = true,
  demo_seed_batch = 'lote-3c-casas-demo',
  updated_at = now()
WHERE id = '66666666-aaaa-4aaa-8aaa-000000000001';

UPDATE public.businesses SET
  filter_attributes = jsonb_build_object(
    'zone','centro-historico',
    'property_type','villa',
    'capacity','7-8',
    'bedrooms','4',
    'beds','5-mas',
    'bathrooms','3',
    'amenities', jsonb_build_array('piscina','cocina','wifi','lavadora','estacionamiento'),
    'stay_features', jsonb_build_array('servicio-limpieza','espacio-trabajo'),
    'traveler_profile', jsonb_build_array('grupos','familias'),
    'house_rules', jsonb_build_array('no-fiestas','acepta-menores'),
    'accessibility', jsonb_build_array('acceso-silla-ruedas','estacionamiento-accesible'),
    'price_level','premium'
  ),
  status = 'published',
  published_at = COALESCE(published_at, now()),
  source_review_state = 'approved',
  is_demo_seed = true,
  demo_seed_batch = 'lote-3c-casas-demo',
  updated_at = now()
WHERE id = '66666666-aaaa-4aaa-8aaa-000000000002';