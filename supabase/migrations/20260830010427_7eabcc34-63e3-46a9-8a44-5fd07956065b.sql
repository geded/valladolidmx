-- G8-R1-F1G · Conversión y retiro del lote de evaluación
-- Autoridad: autorización Founder 2026-08-30 sobre
-- docs/governance/audit/2026-08-30-G8-R1-F1G-EVALUATION-CONTENT-MATRIX-v1.0.md
-- Invariantes: cero DELETE físico, cero fechas inventadas, flag global OFF.

update public.destinations        set demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT' where is_demo_seed;
update public.businesses          set demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT' where is_demo_seed;
update public.products            set demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT' where is_demo_seed;
update public.events              set demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT' where is_demo_seed;
update public.points_of_interest  set demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT' where is_demo_seed;

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'destination'::entity_kind, d.id, 'g8_r1_f1g_snapshot', d.status, d.status,
       'G8-R1-F1G · snapshot previo', jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','snapshot',to_jsonb(d))
from public.destinations d where d.demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT';

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'business'::entity_kind, b.id, 'g8_r1_f1g_snapshot', b.status, b.status,
       'G8-R1-F1G · snapshot previo', jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','snapshot',to_jsonb(b))
from public.businesses b where b.demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT';

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'product'::entity_kind, p.id, 'g8_r1_f1g_snapshot', p.status, p.status,
       'G8-R1-F1G · snapshot previo', jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','snapshot',to_jsonb(p))
from public.products p where p.demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT';

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'event'::entity_kind, e.id, 'g8_r1_f1g_snapshot', e.status, e.status,
       'G8-R1-F1G · snapshot previo', jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','snapshot',to_jsonb(e))
from public.events e where e.demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT';

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'point_of_interest'::entity_kind, pi.id, 'g8_r1_f1g_snapshot', pi.status, pi.status,
       'G8-R1-F1G · snapshot previo', jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','snapshot',to_jsonb(pi))
from public.points_of_interest pi where pi.demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT';

-- GRUPO A · destinos
update public.destinations
   set is_demo_seed = false
 where slug in ('izamal','espita','ek-balam','rio-lagartos','las-coloradas','uayma');

insert into public.entity_field_provenance
  (entity_type, entity_id, field_path, source_url, source_owner, source_kind, observed_at, verification_level, metadata)
select 'destination', d.id, 'destination.identity',
       'https://www.inegi.org.mx/app/areasgeograficas/',
       'INEGI · Marco Geoestadístico Nacional', 'open_geodata', now(), 'source_checked',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','note','Identidad territorial oficial')
from public.destinations d
where d.slug in ('izamal','espita','ek-balam','rio-lagartos','las-coloradas','uayma');

-- GRUPO A · lugares
update public.points_of_interest
   set is_demo_seed = false
 where slug in ('cenote-zaci','convento-san-bernardino','calzada-de-los-frailes','cenote-suytun','cenote-ik-kil');

insert into public.entity_field_provenance
  (entity_type, entity_id, field_path, source_url, source_owner, source_kind, observed_at, verification_level, metadata)
select 'place', pi.id, 'place.identity',
       'https://www.inegi.org.mx/app/areasgeograficas/',
       'INEGI · Marco Geoestadístico Nacional', 'open_geodata', now(), 'source_checked',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','note','Existencia y localización del atractivo')
from public.points_of_interest pi
where pi.slug in ('cenote-zaci','convento-san-bernardino','calzada-de-los-frailes','cenote-suytun','cenote-ik-kil');

-- GRUPO A · empresas verificadas (7 de 8; `taberna-de-los-frailes` aislada sin fuente)
with fuentes(slug, url, owner) as (
  values
    ('conato-1910',            'https://conatomx.wordpress.com/',    'Conato 1910'),
    ('yerbabuena-del-sisal',   'https://www.yerbabuenadelsisal.com/','Yerbabuena del Sisal'),
    ('hotel-casa-tia-micha',   'https://www.casatiamicha.com/',      'Casa Tía Micha'),
    ('coqui-coqui-valladolid', 'https://www.coquicoqui.com/',        'Coqui Coqui'),
    ('kinich-restaurante',     'https://www.restaurantekinich.com/', 'Kinich'),
    ('macan-che-bed-breakfast','https://www.macanche.com/',          'Macan Ché B&B'),
    ('zazil-tunich',           'https://zaziltunich.com/',           'Zazil Tunich')
)
insert into public.entity_field_provenance
  (entity_type, entity_id, field_path, source_url, source_owner, source_kind, observed_at, verification_level, metadata)
select 'business', b.id, 'business.identity', f.url, f.owner, 'official_site', now(), 'source_checked',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','note','Identidad verificada contra sitio oficial')
from public.businesses b join fuentes f on f.slug = b.slug;

update public.businesses
   set is_demo_seed = false,
       record_origin = 'editorial',
       source_review_state = 'approved'
 where slug in ('conato-1910','yerbabuena-del-sisal','hotel-casa-tia-micha',
                'coqui-coqui-valladolid','kinich-restaurante','macan-che-bed-breakfast','zazil-tunich');

-- GRUPO A · productos de Zazil Tunich (sin precio ni disponibilidad acreditados)
update public.products
   set is_demo_seed = false,
       price_amount = null,
       accepts_online_payment = false,
       requires_availability = false,
       conversion_mode = 'informacion'::product_conversion_mode
 where slug in ('nado-en-cenote','recorrido-cenote-museo','ceremonia-maya','cena-romantica-en-cenote');

insert into public.entity_field_provenance
  (entity_type, entity_id, field_path, source_url, source_owner, source_kind, observed_at, verification_level, metadata)
select 'product', p.id, 'product.identity', 'https://zaziltunich.com/', 'Zazil Tunich', 'official_site', now(), 'source_checked',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','note','Experiencia listada por el operador; precio y disponibilidad no acreditados')
from public.products p
where p.slug in ('nado-en-cenote','recorrido-cenote-museo','ceremonia-maya','cena-romantica-en-cenote');

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'product'::entity_kind, p.id, 'g8_r1_f1g_clear_unsourced_commercials', p.status, p.status,
       'Precio, disponibilidad y pago en línea vaciados por falta de fuente',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT')
from public.products p
where p.slug in ('nado-en-cenote','recorrido-cenote-museo','ceremonia-maya','cena-romantica-en-cenote');

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'business'::entity_kind, b.id, 'g8_r1_f1g_converted', b.status, b.status,
       'Convertida a contenido real acreditado (identidad verificada)',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT')
from public.businesses b
where b.slug in ('conato-1910','yerbabuena-del-sisal','hotel-casa-tia-micha',
                 'coqui-coqui-valladolid','kinich-restaurante','macan-che-bed-breakfast','zazil-tunich');

-- GRUPO C · retiro reversible con protecciones
update public.businesses b
   set status = 'draft'::content_status
 where b.slug in ('cenote-suytun-tour','convento-san-antonio-tour','mercado-espita-tour',
                  'bici-nocturna-calzada-frailes','hotel-boutique-espita',
                  'hotel-santo-domingo-izamal','los-almendros-espita')
   and not exists (select 1 from public.business_users bu where bu.business_id = b.id and bu.status = 'active')
   and not exists (select 1 from public.business_claim_snapshots c where c.business_id = b.id)
   and not exists (select 1 from public.concierge_order_items oi where oi.business_id = b.id);

update public.products p
   set status = 'draft'::content_status
 where p.slug in ('tour-cenote-suytun-guiado-demo','bici-nocturna-frailes-ticket-demo',
                  'suite-selva-maya-demo','menu-cochinita-tradicional-demo')
   and not exists (select 1 from public.concierge_order_items oi where oi.entity_kind = 'product' and oi.entity_id = p.id);

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'business'::entity_kind, b.id, 'g8_r1_f1g_withdrawn', 'published'::content_status, b.status,
       'Retiro reversible: identidad no verificable', jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','class','C')
from public.businesses b
where b.slug in ('cenote-suytun-tour','convento-san-antonio-tour','mercado-espita-tour',
                 'bici-nocturna-calzada-frailes','hotel-boutique-espita',
                 'hotel-santo-domingo-izamal','los-almendros-espita') and b.status = 'draft'::content_status;

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'product'::entity_kind, p.id, 'g8_r1_f1g_withdrawn', 'published'::content_status, p.status,
       'Retiro reversible: identidad no verificable', jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','class','C')
from public.products p
where p.slug in ('tour-cenote-suytun-guiado-demo','bici-nocturna-frailes-ticket-demo',
                 'suite-selva-maya-demo','menu-cochinita-tradicional-demo') and p.status = 'draft'::content_status;

-- GRUPO D · archivado de eventos (fechas intactas)
update public.events
   set status = 'archived'::content_status
 where demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT';

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'event'::entity_kind, e.id, 'g8_r1_f1g_archived', 'published'::content_status, e.status,
       'Evento vencido o con fecha no acreditada; fechas intactas',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','class','D')
from public.events e where e.demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT';

-- Corrección territorial acreditada de Ik Kil (Tinum / Pisté)
update public.points_of_interest
   set destination_id = (select id from public.destinations where slug = 'tinum'),
       destination_zone_id = null
 where slug = 'cenote-ik-kil'
   and exists (select 1 from public.destinations where slug = 'tinum');

insert into public.entity_field_provenance
  (entity_type, entity_id, field_path, source_url, source_owner, source_kind, observed_at, verification_level, metadata)
select 'place', pi.id, 'place.destination_id',
       'https://www.inegi.org.mx/app/areasgeograficas/',
       'INEGI · Marco Geoestadístico Nacional', 'open_geodata', now(), 'source_checked',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','note','Ik Kil pertenece al municipio de Tinum (Pisté), no a Valladolid')
from public.points_of_interest pi where pi.slug = 'cenote-ik-kil';

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'point_of_interest'::entity_kind, pi.id, 'g8_r1_f1g_territorial_fix', pi.status, pi.status,
       'Reasignación territorial acreditada Valladolid → Tinum/Pisté; coordenadas intactas',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT')
from public.points_of_interest pi where pi.slug = 'cenote-ik-kil';
