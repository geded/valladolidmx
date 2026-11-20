
-- 1) Nuevas definiciones administrables para casas de vacaciones (opcionales, no filtrables)
insert into public.tourism_attribute_definitions (family_key, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order, active)
values
  ('casas-de-vacaciones','check_in','Hora de llegada','Hora a partir de la cual el huésped puede llegar.','single','policy',false,false,100,true),
  ('casas-de-vacaciones','check_out','Hora de salida','Hora límite de salida.','single','policy',false,false,110,true),
  ('casas-de-vacaciones','min_nights','Estancia mínima',null,'single','policy',false,false,120,true),
  ('casas-de-vacaciones','cancellation_policy','Política de cancelación',null,'single','policy',false,false,130,true),
  ('casas-de-vacaciones','host_languages','Idiomas del anfitrión',null,'multi','profile',false,false,140,true),
  ('casas-de-vacaciones','spaces','Espacios',null,'multi','secondary',false,false,150,true),
  ('casas-de-vacaciones','includes','Incluye',null,'multi','secondary',false,false,160,true)
on conflict do nothing;

insert into public.tourism_attribute_options (definition_id, value, label, sort_order, active)
select d.id, v.value, v.label, v.sort_order, true
from public.tourism_attribute_definitions d
join (values
  ('check_in','14-00','A partir de las 14:00',10),
  ('check_in','15-00','A partir de las 15:00',20),
  ('check_in','16-00','A partir de las 16:00',30),
  ('check_in','flexible','Flexible',40),
  ('check_out','10-00','Antes de las 10:00',10),
  ('check_out','11-00','Antes de las 11:00',20),
  ('check_out','12-00','Antes de las 12:00',30),
  ('check_out','flexible','Flexible',40),
  ('min_nights','1','1 noche',10),
  ('min_nights','2','2 noches',20),
  ('min_nights','3','3 noches',30),
  ('min_nights','5','5 noches o más',40),
  ('cancellation_policy','flexible','Flexible',10),
  ('cancellation_policy','moderada','Moderada',20),
  ('cancellation_policy','estricta','Estricta',30),
  ('host_languages','es','Español',10),
  ('host_languages','en','Inglés',20),
  ('host_languages','fr','Francés',30),
  ('host_languages','maya','Maya',40),
  ('spaces','patio','Patio',10),
  ('spaces','alberca','Alberca',20),
  ('spaces','cocina-equipada','Cocina equipada',30),
  ('spaces','terraza','Terraza',40),
  ('spaces','roof','Roof',50),
  ('includes','limpieza','Limpieza',10),
  ('includes','ropa-de-cama','Ropa de cama',20),
  ('includes','estacionamiento','Estacionamiento',30),
  ('includes','wifi','Wifi',40)
) as v(attribute_key, value, label, sort_order)
  on v.attribute_key = d.attribute_key
where d.family_key = 'casas-de-vacaciones'
on conflict do nothing;

-- 2) Medios de demostración para la casa existente
with asset as (
  insert into public.media_assets (kind, storage_bucket, storage_path, alt_text, status, width, height, mime_type, is_demo_seed)
  values
    ('image','studio-media','businesses/casa-colonial-sisal/demo-2026-09-12/cover.jpg','Patio colonial con alberca pequeña, arcos de piedra y mosaico de pasta en Valladolid, Yucatán','published',1600,1072,'image/jpeg',true),
    ('image','studio-media','businesses/casa-colonial-sisal/demo-2026-09-12/bedroom.jpg','Recámara con vigas de madera, ropa de cama blanca y puertas al patio','published',1600,1072,'image/jpeg',true),
    ('image','studio-media','businesses/casa-colonial-sisal/demo-2026-09-12/kitchen.jpg','Cocina equipada con azulejo de talavera y mesa de madera para seis personas','published',1600,1072,'image/jpeg',true),
    ('image','studio-media','businesses/casa-colonial-sisal/demo-2026-09-12/terrace.jpg','Terraza con hamacas y vista a las torres coloniales al atardecer','published',1600,1072,'image/jpeg',true)
  returning id, storage_path
)
insert into public.business_media (business_id, media_asset_id, role, sort_order)
select '66666666-aaaa-4aaa-8aaa-000000000001'::uuid,
       a.id,
       case when a.storage_path like '%cover.jpg' then 'cover' else 'gallery' end,
       case
         when a.storage_path like '%cover.jpg' then 10
         when a.storage_path like '%bedroom.jpg' then 20
         when a.storage_path like '%kitchen.jpg' then 30
         else 40
       end
from asset a;

update public.businesses b
set cover_media_id = (
      select bm.media_asset_id from public.business_media bm
      where bm.business_id = b.id and bm.role = 'cover'
      order by bm.sort_order limit 1
    ),
    filter_attributes = coalesce(b.filter_attributes, '{}'::jsonb) || jsonb_build_object(
      'check_in','15-00',
      'check_out','11-00',
      'min_nights','2',
      'cancellation_policy','moderada',
      'host_languages', jsonb_build_array('es','en'),
      'spaces', jsonb_build_array('patio','alberca','cocina-equipada','roof'),
      'includes', jsonb_build_array('limpieza','ropa-de-cama','wifi')
    ),
    updated_at = now()
where b.id = '66666666-aaaa-4aaa-8aaa-000000000001'::uuid;
