-- Restaurant Territorial Filter Attributes v1
-- Additive catalogue extension. It does not update existing business records.

CREATE OR REPLACE FUNCTION public.resolve_tourism_attribute_family(_category_slug text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(coalesce(_category_slug, ''))
    WHEN 'hotel' THEN 'hoteles'
    WHEN 'hoteles' THEN 'hoteles'
    WHEN 'hospedaje' THEN 'hoteles'
    WHEN 'hospedajes' THEN 'hoteles'
    WHEN 'restaurante' THEN 'restaurantes'
    WHEN 'restaurantes' THEN 'restaurantes'
    WHEN 'gastronomia' THEN 'restaurantes'
    WHEN 'gastronomía' THEN 'restaurantes'
    ELSE NULL
  END
$$;

WITH definitions(attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order) AS (
  VALUES
    ('zone', 'Zona o barrio', 'Ubicación reconocible dentro del destino.', 'single', 'zone', true, false, 10),
    ('cuisine_type', 'Tipo de cocina', 'Propuesta gastronómica principal.', 'single', 'primary', true, false, 20),
    ('dining_experience', 'Experiencia', 'Ambiente y formato de la experiencia.', 'multi', 'secondary', true, false, 30),
    ('services', 'Servicios', 'Servicios confirmados del restaurante.', 'multi', 'secondary', true, false, 40),
    ('dietary_options', 'Opciones alimentarias', 'Alternativas confirmadas por el establecimiento.', 'multi', 'secondary', true, false, 50),
    ('meal_period', 'Horario de consumo', 'Momentos del día en que ofrece servicio.', 'multi', 'secondary', true, false, 60),
    ('traveler_profile', 'Ideal para', 'Perfiles de visita que atiende el restaurante.', 'multi', 'profile', true, false, 70),
    ('price_level', 'Nivel de precio orientativo', 'Clasificación informativa; no sustituye precios.', 'single', 'commercial', true, false, 80)
)
INSERT INTO public.tourism_attribute_definitions
  (family_key, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order)
SELECT 'restaurantes', attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order
FROM definitions
ON CONFLICT (family_key, attribute_key) DO NOTHING;

WITH option_seed(attribute_key, value, label, sort_order) AS (
  VALUES
    ('zone','centro-historico','Centro Histórico',10), ('zone','sisal','Barrio de Sisal',20), ('zone','calzada-frailes','Calzada de los Frailes',30), ('zone','periferia','Periferia',40), ('zone','entorno-rural','Entorno rural',50),
    ('cuisine_type','yucateca','Yucateca',10), ('cuisine_type','maya','Maya',20), ('cuisine_type','mexicana','Mexicana',30), ('cuisine_type','mariscos','Mariscos',40), ('cuisine_type','internacional','Internacional',50), ('cuisine_type','vegetariana','Vegetariana',60), ('cuisine_type','contemporanea','Contemporánea',70), ('cuisine_type','cafeteria-panaderia','Cafetería y panadería',80),
    ('dining_experience','patio-colonial','Patio colonial',10), ('dining_experience','terraza','Terraza',20), ('dining_experience','cocina-autor','Cocina de autor',30), ('dining_experience','cocina-tradicional','Cocina tradicional',40), ('dining_experience','mercado-fonda','Mercado o fonda',50), ('dining_experience','vista-plaza','Vista a la plaza',60),
    ('services','reservaciones','Reservaciones',10), ('services','estacionamiento','Estacionamiento',20), ('services','aire-acondicionado','Aire acondicionado',30), ('services','terraza','Terraza',40), ('services','para-llevar','Servicio para llevar',50), ('services','grupos','Atención a grupos',60),
    ('dietary_options','vegetariano','Vegetariano',10), ('dietary_options','vegano','Vegano',20), ('dietary_options','sin-gluten','Sin gluten',30), ('dietary_options','menu-infantil','Opciones infantiles',40),
    ('meal_period','desayuno','Desayuno',10), ('meal_period','comida','Comida',20), ('meal_period','cena','Cena',30), ('meal_period','brunch','Brunch',40),
    ('traveler_profile','parejas','Parejas',10), ('traveler_profile','familias','Familias',20), ('traveler_profile','solo','Viaje solo',30), ('traveler_profile','amigos','Amigos',40), ('traveler_profile','grupos','Grupos',50),
    ('price_level','economico','Económico',10), ('price_level','medio','Medio',20), ('price_level','premium','Premium',30), ('price_level','lujo','Lujo',40)
)
INSERT INTO public.tourism_attribute_options(definition_id, value, label, sort_order)
SELECT d.id, s.value, s.label, s.sort_order
FROM option_seed s JOIN public.tourism_attribute_definitions d
  ON d.family_key = 'restaurantes' AND d.attribute_key = s.attribute_key
ON CONFLICT (definition_id, value) DO NOTHING;
