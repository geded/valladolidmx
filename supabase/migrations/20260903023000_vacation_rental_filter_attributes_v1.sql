-- Vacation Rental Territorial Filter Attributes v1
-- Additive catalogue extension. Existing business records are not updated.

CREATE OR REPLACE FUNCTION public.resolve_tourism_attribute_family(_category_slug text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(coalesce(_category_slug, ''))
    WHEN 'hotel' THEN 'hoteles' WHEN 'hoteles' THEN 'hoteles'
    WHEN 'hospedaje' THEN 'hoteles' WHEN 'hospedajes' THEN 'hoteles'
    WHEN 'restaurante' THEN 'restaurantes' WHEN 'restaurantes' THEN 'restaurantes'
    WHEN 'gastronomia' THEN 'restaurantes' WHEN 'gastronomía' THEN 'restaurantes'
    WHEN 'casa-de-vacaciones' THEN 'casas-de-vacaciones'
    WHEN 'casas-de-vacaciones' THEN 'casas-de-vacaciones'
    WHEN 'casas-vacacionales' THEN 'casas-de-vacaciones'
    WHEN 'villa' THEN 'casas-de-vacaciones' WHEN 'villas' THEN 'casas-de-vacaciones'
    WHEN 'renta-vacacional' THEN 'casas-de-vacaciones'
    WHEN 'rentas-vacacionales' THEN 'casas-de-vacaciones'
    WHEN 'casas' THEN 'casas-de-vacaciones'
    ELSE NULL
  END
$$;

WITH definitions(attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order) AS (
  VALUES
    ('zone', 'Zona o barrio', 'Ubicación aproximada dentro del destino.', 'single', 'zone', true, false, 10),
    ('property_type', 'Tipo de propiedad', 'Formato principal de la estancia.', 'single', 'primary', true, false, 20),
    ('capacity', 'Capacidad', 'Número máximo confirmado de huéspedes.', 'single', 'primary', true, false, 30),
    ('bedrooms', 'Dormitorios', 'Número confirmado de dormitorios.', 'single', 'secondary', true, false, 40),
    ('amenities', 'Amenidades', 'Comodidades confirmadas de la propiedad.', 'multi', 'secondary', true, false, 50),
    ('stay_features', 'Características de estancia', 'Servicios relevantes para una estancia completa.', 'multi', 'secondary', true, false, 60),
    ('traveler_profile', 'Ideal para', 'Perfiles de viaje que admite la propiedad.', 'multi', 'profile', true, false, 70),
    ('house_rules', 'Reglas relevantes', 'Condiciones que deben conocer los huéspedes.', 'multi', 'policy', false, false, 80),
    ('price_level', 'Nivel de precio orientativo', 'Clasificación informativa; no sustituye tarifas.', 'single', 'commercial', true, false, 90)
)
INSERT INTO public.tourism_attribute_definitions
  (family_key, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order)
SELECT 'casas-de-vacaciones', attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order
FROM definitions ON CONFLICT (family_key, attribute_key) DO NOTHING;

WITH option_seed(attribute_key, value, label, sort_order) AS (
  VALUES
    ('zone','centro-historico','Centro Histórico',10), ('zone','sisal','Barrio de Sisal',20), ('zone','calzada-frailes','Calzada de los Frailes',30), ('zone','periferia','Periferia',40), ('zone','entorno-rural','Entorno rural',50),
    ('property_type','casa-completa','Casa completa',10), ('property_type','villa','Villa',20), ('property_type','departamento','Departamento',30), ('property_type','cabana','Cabaña',40), ('property_type','hacienda','Hacienda',50),
    ('capacity','1-2','1–2 huéspedes',10), ('capacity','3-4','3–4 huéspedes',20), ('capacity','5-6','5–6 huéspedes',30), ('capacity','7-8','7–8 huéspedes',40), ('capacity','9-mas','9 o más huéspedes',50),
    ('bedrooms','1','1 dormitorio',10), ('bedrooms','2','2 dormitorios',20), ('bedrooms','3','3 dormitorios',30), ('bedrooms','4','4 dormitorios',40), ('bedrooms','5-mas','5 o más dormitorios',50),
    ('amenities','piscina','Piscina',10), ('amenities','cocina','Cocina equipada',20), ('amenities','aire-acondicionado','Aire acondicionado',30), ('amenities','wifi','Wi-Fi',40), ('amenities','lavadora','Lavadora',50), ('amenities','estacionamiento','Estacionamiento',60), ('amenities','jardin','Jardín o patio',70),
    ('stay_features','estancia-larga','Admite estancia larga',10), ('stay_features','auto-check-in','Auto check-in',20), ('stay_features','ubicacion-aproximada','Ubicación protegida',30), ('stay_features','servicio-limpieza','Servicio de limpieza',40), ('stay_features','espacio-trabajo','Espacio para trabajar',50),
    ('traveler_profile','parejas','Parejas',10), ('traveler_profile','familias','Familias',20), ('traveler_profile','solo','Viaje solo',30), ('traveler_profile','amigos','Amigos',40), ('traveler_profile','grupos','Grupos',50),
    ('house_rules','no-fiestas','No se permiten fiestas',10), ('house_rules','no-fumar','No fumar',20), ('house_rules','acepta-mascotas','Acepta mascotas',30), ('house_rules','acepta-menores','Acepta menores',40),
    ('price_level','economico','Económico',10), ('price_level','medio','Medio',20), ('price_level','premium','Premium',30), ('price_level','lujo','Lujo',40)
)
INSERT INTO public.tourism_attribute_options(definition_id, value, label, sort_order)
SELECT d.id, s.value, s.label, s.sort_order
FROM option_seed s JOIN public.tourism_attribute_definitions d
  ON d.family_key = 'casas-de-vacaciones' AND d.attribute_key = s.attribute_key
ON CONFLICT (definition_id, value) DO NOTHING;
