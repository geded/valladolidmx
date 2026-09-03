ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS filter_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

WITH definitions(attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order) AS (
  VALUES
    ('event_type', 'Tipo de evento', 'Naturaleza principal del evento.', 'single', 'primary', true, false, 10),
    ('audience', 'Ideal para', 'Perfiles de visitante a los que está dirigido.', 'multi', 'profile', true, false, 20),
    ('admission_type', 'Entrada', 'Entrada libre o de pago.', 'single', 'commercial', true, false, 30),
    ('time_of_day', 'Horario', 'Momento del día en que sucede.', 'multi', 'secondary', true, false, 40),
    ('venue_type', 'Sede o modalidad', 'Tipo de sede o modalidad del evento.', 'single', 'secondary', true, false, 50),
    ('accessibility', 'Accesibilidad', 'Facilidades confirmadas de accesibilidad.', 'multi', 'secondary', true, false, 60),
    ('reservation_required', 'Reservación', 'Indica si requiere reservación previa.', 'single', 'commercial', true, false, 70)
)
INSERT INTO public.tourism_attribute_definitions
  (family_key, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order)
SELECT 'eventos', attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order
FROM definitions
ON CONFLICT (family_key, attribute_key) DO NOTHING;

WITH option_seed(attribute_key, value, label, sort_order) AS (
  VALUES
    ('event_type','cultural','Cultural',10), ('event_type','musica','Música',20), ('event_type','gastronomia','Gastronomía',30), ('event_type','tradicion','Fiesta tradicional',40), ('event_type','deportivo','Deportivo',50), ('event_type','arte','Arte y exposiciones',60), ('event_type','comunitario','Comunitario',70), ('event_type','feria','Feria o mercado',80),
    ('audience','familias','Familias',10), ('audience','parejas','Parejas',20), ('audience','amigos','Amigos',30), ('audience','solo','Viaje solo',40), ('audience','ninos','Niñas y niños',50), ('audience','adultos','Sólo adultos',60),
    ('admission_type','entrada-libre','Entrada libre',10), ('admission_type','de-pago','Entrada de pago',20), ('admission_type','donativo','Donativo voluntario',30),
    ('time_of_day','manana','Mañana',10), ('time_of_day','tarde','Tarde',20), ('time_of_day','noche','Noche',30), ('time_of_day','todo-el-dia','Todo el día',40),
    ('venue_type','plaza-publica','Plaza pública',10), ('venue_type','recinto-cerrado','Recinto cerrado',20), ('venue_type','aire-libre','Aire libre',30), ('venue_type','templo-convento','Templo o convento',40), ('venue_type','comunidad','Comunidad',50), ('venue_type','en-linea','En línea',60),
    ('accessibility','acceso-silla-ruedas','Acceso en silla de ruedas',10), ('accessibility','sanitarios-accesibles','Sanitarios accesibles',20), ('accessibility','estacionamiento-accesible','Estacionamiento accesible',30), ('accessibility','apto-movilidad-reducida','Apto para movilidad reducida',40),
    ('reservation_required','sin-reservacion','Sin reservación',10), ('reservation_required','con-reservacion','Requiere reservación',20)
)
INSERT INTO public.tourism_attribute_options(definition_id, value, label, sort_order)
SELECT d.id, s.value, s.label, s.sort_order
FROM option_seed s
JOIN public.tourism_attribute_definitions d
  ON d.family_key = 'eventos' AND d.attribute_key = s.attribute_key
ON CONFLICT (definition_id, value) DO NOTHING;