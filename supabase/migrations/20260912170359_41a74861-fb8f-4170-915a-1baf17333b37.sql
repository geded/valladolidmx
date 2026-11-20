
with b as (select id from public.businesses where slug='yerbabuena-del-sisal'),
ins as (
  insert into public.media_assets (kind, storage_bucket, storage_path, alt_text, mime_type, width, height, size_bytes, status, is_demo_seed, demo_seed_batch, metadata)
  values
    ('image','studio-media','businesses/yerbabuena-del-sisal/demo-2026-09-12/rest-patio.jpg','Patio colonial del restaurante con mesas de madera al atardecer','image/jpeg',1600,1067,367102,'published',true,'demo-2026-09-12','{}'::jsonb),
    ('image','studio-media','businesses/yerbabuena-del-sisal/demo-2026-09-12/rest-terraza.jpg','Terraza del restaurante con vista al convento al anochecer','image/jpeg',1600,1067,315211,'published',true,'demo-2026-09-12','{}'::jsonb),
    ('image','studio-media','businesses/yerbabuena-del-sisal/demo-2026-09-12/rest-cocina.jpg','Cocina tradicional con horno de leña y tortillas hechas a mano','image/jpeg',1600,1067,257033,'published',true,'demo-2026-09-12','{}'::jsonb),
    ('image','studio-media','businesses/yerbabuena-del-sisal/demo-2026-09-12/dish-cochinita.jpg','Cochinita al horno de leña con cebolla morada y tortillas','image/jpeg',1200,900,219410,'published',true,'demo-2026-09-12','{}'::jsonb),
    ('image','studio-media','businesses/yerbabuena-del-sisal/demo-2026-09-12/dish-sopa-lima.jpg','Sopa de lima con tiras de tortilla y lima de la región','image/jpeg',1200,900,181773,'published',true,'demo-2026-09-12','{}'::jsonb),
    ('image','studio-media','businesses/yerbabuena-del-sisal/demo-2026-09-12/dish-relleno.jpg','Relleno negro de pavo con arroz y huevo','image/jpeg',1200,900,194907,'published',true,'demo-2026-09-12','{}'::jsonb),
    ('image','studio-media','businesses/yerbabuena-del-sisal/demo-2026-09-12/dish-postre.jpg','Postre de fruta regional con miel de melipona','image/jpeg',1200,900,174043,'published',true,'demo-2026-09-12','{}'::jsonb)
  returning id, storage_path
)
insert into public.business_media (business_id, media_asset_id, role, sort_order)
select (select id from b), i.id,
  case when i.storage_path like '%rest-patio%' then 'cover' else 'gallery' end,
  case when i.storage_path like '%rest-patio%' then 0
       when i.storage_path like '%rest-terraza%' then 1
       when i.storage_path like '%rest-cocina%' then 2
       when i.storage_path like '%dish-cochinita%' then 3
       when i.storage_path like '%dish-sopa-lima%' then 4
       when i.storage_path like '%dish-relleno%' then 5
       else 6 end
from ins i;

update public.businesses b
set cover_media_id = m.id, updated_at = now()
from public.media_assets m
where b.slug='yerbabuena-del-sisal'
  and m.storage_path='businesses/yerbabuena-del-sisal/demo-2026-09-12/rest-patio.jpg';

insert into public.product_media (product_id, media_asset_id, role, sort_order)
select p.id, m.id, 'cover', 0
from public.products p
join public.businesses b on b.id = p.business_id and b.slug='yerbabuena-del-sisal'
join (values
  ('cochinita-horno-de-lena','dish-cochinita.jpg'),
  ('sopa-de-lima-yerbabuena','dish-sopa-lima.jpg'),
  ('relleno-negro-de-la-casa','dish-relleno.jpg'),
  ('postre-de-caimito','dish-postre.jpg')
) as v(slug, file) on v.slug = p.slug::text
join public.media_assets m on m.storage_path = 'businesses/yerbabuena-del-sisal/demo-2026-09-12/' || v.file;
