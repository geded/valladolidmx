
-- 1) Nuevas definiciones administrables opcionales para la familia restaurantes
insert into public.tourism_attribute_definitions (family_key, attribute_key, label, help_text, filter_group, input_type, filterable, required, sort_order, active)
values
  ('restaurantes','accessibility','Accesibilidad','Facilidades de acceso del establecimiento.','secondary','multi',true,false,90,true),
  ('restaurantes','reservation_policy','Reservaciones','Cómo se gestionan las mesas.','secondary','single',false,false,100,true),
  ('restaurantes','languages','Idiomas de atención','Idiomas en los que atiende el equipo.','secondary','multi',false,false,110,true),
  ('restaurantes','dress_code','Código de vestimenta','Recomendación de vestimenta para la visita.','secondary','single',false,false,120,true)
on conflict do nothing;

insert into public.tourism_attribute_options (definition_id, value, label, sort_order, active)
select d.id, v.value, v.label, v.sort_order, true
from public.tourism_attribute_definitions d
join (values
  ('accessibility','planta-baja','Acceso en planta baja',10),
  ('accessibility','sin-escalones','Entrada sin escalones',20),
  ('accessibility','sanitario-accesible','Sanitario accesible',30),
  ('reservation_policy','recomendada','Reservación recomendada',10),
  ('reservation_policy','no-requerida','No se requiere reservación',20),
  ('reservation_policy','obligatoria','Reservación obligatoria',30),
  ('languages','es','Español',10),
  ('languages','en','Inglés',20),
  ('languages','maya','Maya',30),
  ('dress_code','casual','Casual',10),
  ('dress_code','casual-elegante','Casual elegante',20)
) as v(attribute_key, value, label, sort_order) on v.attribute_key = d.attribute_key
where d.family_key = 'restaurantes'
on conflict do nothing;

-- 2) Atributos CMS demo del restaurante
update public.businesses
set filter_attributes = jsonb_build_object(
  'cuisine_type','yucateca',
  'dining_experience', jsonb_build_array('patio-colonial','terraza','cocina-tradicional'),
  'zone','sisal',
  'price_level','medio',
  'services', jsonb_build_array('reservaciones','terraza','para-llevar','grupos'),
  'dietary_options', jsonb_build_array('vegetariano','sin-gluten','menu-infantil'),
  'accessibility', jsonb_build_array('planta-baja','sin-escalones'),
  'traveler_profile', jsonb_build_array('parejas','familias','amigos'),
  'meal_period', jsonb_build_array('desayuno','comida','cena'),
  'reservation_policy','recomendada',
  'languages', jsonb_build_array('es','en','maya'),
  'dress_code','casual'
),
updated_at = now()
where slug = 'yerbabuena-del-sisal';

-- 3) Menú demo (platillos publicados, sin cobro en línea)
insert into public.products (business_id, product_type, slug, name, tagline, description, price_amount, price_currency, status, published_at, conversion_mode, primary_action_label, accepts_online_payment, is_demo_seed, demo_seed_batch)
select b.id, 'experiencia'::product_type, v.slug::citext, v.name, v.tagline, v.description, v.price, 'MXN', 'published'::content_status, now(), 'arma_tu_viaje'::product_conversion_mode, 'Agregar a Mi Viaje', false, true, 'demo-2026-09-12'
from public.businesses b
join (values
  ('cochinita-horno-de-lena','Cochinita al horno de leña','Receta de la abuela, servida con cebolla morada','Cerdo marinado en recado rojo y naranja agria, horneado en leña y servido con tortillas hechas a mano.',285),
  ('sopa-de-lima-yerbabuena','Sopa de lima','Caldo de pavo con lima yucateca','Caldo claro de pavo de rancho con lima de la región y totopos recién fritos.',165),
  ('relleno-negro-de-la-casa','Relleno negro de la casa','Pavo en recado negro','Pavo cocido en recado negro con huevo y caldo, un clásico de mesa yucateca.',310),
  ('postre-de-caimito','Postre de caimito y miel','Dulce regional de temporada','Caimito de la huerta con miel de melipona y crema batida ligera.',120)
) as v(slug, name, tagline, description, price) on true
where b.slug = 'yerbabuena-del-sisal'
on conflict do nothing;

-- 4) Reseñas demo publicadas
insert into public.reviews (subject_kind, subject_id, author_display_name, rating, body, status, published_at, language, metadata, business_response, business_response_at)
select 'business', b.id, v.author, v.rating, v.body, 'published', now(), 'es',
       jsonb_build_object('seed', true, 'demo_seed_batch','demo-2026-09-12'), v.response,
       case when v.response is null then null else now() end
from public.businesses b
join (values
  ('Mariana R.',5,'La cochinita al horno de leña es de otro nivel y el patio colonial es precioso al atardecer.',null),
  ('Julien P.',5,'Atención en español e inglés, muy amables. La sopa de lima es imprescindible.','¡Gracias Julien! Te esperamos de nuevo en la terraza.'),
  ('Ana y Carlos',4,'Fuimos en familia, hay opciones para niños y sin gluten. Conviene reservar los fines de semana.',null)
) as v(author, rating, body, response) on true
where b.slug = 'yerbabuena-del-sisal';
