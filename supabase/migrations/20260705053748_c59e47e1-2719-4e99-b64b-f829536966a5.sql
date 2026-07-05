
with d as (select id from destinations where slug='valladolid'),
seed as (
  select * from (values
    ('yerbabuena-del-sisal','Yerbabuena del Sisal','c2ff7c64-73bd-4802-af03-626a2355cdc9'::uuid,
     'Cocina yucateca de temporada frente al Convento de San Bernardino.',
     'Restaurante-terraza con recetas de la abuela: cochinita al horno de leña, sopa de lima y postres regionales.'),
    ('taberna-de-los-frailes','Taberna de los Frailes','c2ff7c64-73bd-4802-af03-626a2355cdc9'::uuid,
     'Bistró colonial con producto local y mezcales de la península.',
     'Ambiente íntimo entre arcadas de piedra; menú que rota con las cosechas del oriente maya.'),
    ('cenote-suytun-tour','Cenote Suytun · Tour guiado','fcda61f8-78b2-4c0f-837a-5a31b930ce44'::uuid,
     'Recorrido temprano al cenote con guía local certificado.',
     'Experiencia de 3 horas al amanecer para evitar multitudes; incluye equipo, transporte y guía bilingüe.'),
    ('bici-nocturna-calzada-frailes','Bici nocturna por la Calzada de los Frailes','fcda61f8-78b2-4c0f-837a-5a31b930ce44'::uuid,
     'Paseo en bici al atardecer por el centro histórico.',
     'Ruta pausada de 90 min con paradas fotográficas y helado artesanal al final.'),
    ('casa-hipil-boutique','Casa Hipil · Hotel Boutique','39258638-b4fb-4560-bf4a-61b9080e8e35'::uuid,
     'Casona colonial restaurada a dos cuadras del zócalo.',
     '8 habitaciones con patio, alberca de piedra y desayuno regional incluido.')
  ) as v(slug, display_name, cat, tagline, description)
)
insert into public.businesses
  (destination_id, primary_category_id, slug, display_name, tagline, description,
   status, published_at, verified, is_demo_seed, demo_seed_batch)
select d.id, s.cat, s.slug, s.display_name, s.tagline, s.description,
       'published', now(), true, true, 'alux-at4-demo'
from d cross join seed s
where not exists (
  select 1 from public.businesses b
  where b.destination_id = d.id and b.slug = s.slug
);
