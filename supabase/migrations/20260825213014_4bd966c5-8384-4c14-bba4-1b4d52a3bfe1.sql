-- 19.25 · P0 · Data Readiness for G4/G5 (PCA-2026-027)
-- Idempotente y fail-closed. Allowlist por UUID exacto.

-- 1) Fichas incompletas -> draft (allowlist exacta)
UPDATE public.businesses SET status = 'draft', updated_at = now()
WHERE id IN (
  '55555555-aaaa-4aaa-8aaa-000000000001'::uuid,
  '55555555-aaaa-4aaa-8aaa-000000000002'::uuid,
  '55555555-aaaa-4aaa-8aaa-000000000003'::uuid,
  '55555555-aaaa-4aaa-8aaa-000000000004'::uuid
) AND status = 'published';

UPDATE public.destinations SET status = 'draft', updated_at = now()
WHERE id = 'ec9eb324-1952-4849-a1d4-00506d7cabb5'::uuid AND status = 'published';

INSERT INTO public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
SELECT v.kind::entity_kind, v.id::uuid, 'status.unpublish', 'published'::content_status, 'draft'::content_status,
       'P0 Data Readiness fail-closed: ficha publicada sin portada gobernada estable, geolocalizacion o contacto publico. Despublicacion temporal; ningun registro eliminado.',
       jsonb_build_object('package','19.25','authorization','PCA-2026-027','cause','P0_FAIL_CLOSED_INCOMPLETE_LISTING')
FROM (VALUES
  ('business','55555555-aaaa-4aaa-8aaa-000000000001'),
  ('business','55555555-aaaa-4aaa-8aaa-000000000002'),
  ('business','55555555-aaaa-4aaa-8aaa-000000000003'),
  ('business','55555555-aaaa-4aaa-8aaa-000000000004'),
  ('destination','ec9eb324-1952-4849-a1d4-00506d7cabb5')
) AS v(kind,id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_audit_log l
  WHERE l.entity_id = v.id::uuid AND l.action = 'status.unpublish'
    AND l.metadata->>'package' = '19.25'
);

-- 2) Desvinculo del asset legacy de cocina-de-dona-elsa (relacion exacta verificada)
DELETE FROM public.business_media
WHERE business_id = '55555555-aaaa-4aaa-8aaa-000000000002'::uuid
  AND media_asset_id = 'cb8ccb0d-60de-4d37-b178-7802f6d39b24'::uuid;

INSERT INTO public.content_audit_log (entity_kind, entity_id, action, notes, metadata)
SELECT 'business'::entity_kind, '55555555-aaaa-4aaa-8aaa-000000000002'::uuid, 'media.unlink',
       'P0: vinculo publico al asset legacy no gobernado retirado. El media_asset y el objeto de Storage se conservan intactos.',
       jsonb_build_object('package','19.25','authorization','PCA-2026-027','media_asset_id','cb8ccb0d-60de-4d37-b178-7802f6d39b24','role','cover','rows_removed',1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_audit_log l
  WHERE l.entity_id = '55555555-aaaa-4aaa-8aaa-000000000002'::uuid AND l.action = 'media.unlink'
    AND l.metadata->>'package' = '19.25'
);

-- 3) seo_metadata para las cuatro entidades acreditadas (solo URLs publicas estables)
INSERT INTO public.seo_metadata (
  entity_kind, entity_id, locale, meta_title, meta_description, canonical_url,
  og_title, og_description, og_image_media_id, og_image_url, twitter_card, noindex, json_ld
)
SELECT s.kind::entity_kind, s.id::uuid, 'es'::locale_code, s.meta_title, s.meta_description, s.canonical,
       s.meta_title, s.meta_description, s.asset::uuid, s.image, 'summary_large_image', false,
       jsonb_build_object('@context','https://schema.org','@type', s.jsonld_type, 'name', s.name, 'url', s.canonical, 'image', s.image)
FROM (VALUES
  ('destination','11111111-aaaa-4aaa-8aaa-000000000001',
   'Valladolid, Yucatán · Pueblo Mágico del Oriente Maya',
   'Descubre Valladolid: calles coloniales, cenotes, gastronomía yucateca y experiencias auténticas en el corazón del Oriente Maya.',
   'https://quehacerenvalladolid.com/oriente-maya/valladolid',
   '453dd8fd-7d1e-419e-95ea-9afa365f363c',
   'https://quehacerenvalladolid.com/api/public/studio-media/governed/v1p1c/destination-cover.jpg',
   'TouristDestination','Valladolid'),
  ('business','7d1d0001-1111-4111-8111-000000000001',
   'Hacienda San Servacio Boutique · Hotel colonial en Valladolid',
   'Hotel boutique colonial en el centro de Valladolid: patio con piscina estilo cenote, habitaciones con vigas de madera y terraza con vista a la catedral.',
   'https://quehacerenvalladolid.com/oriente-maya/valladolid/hoteles/hacienda-san-servacio-boutique',
   'b95017a9-72cb-4b19-aa4d-24d96b5feb50',
   'https://quehacerenvalladolid.com/api/public/studio-media/7d1d0001-1111-4111-8111-000000000001/cover.jpg',
   'Hotel','Hacienda San Servacio Boutique'),
  ('business','7d1d0002-1111-4111-8111-000000000002',
   'Cocina del Frailes · Restaurante yucateco en Valladolid',
   'Cocina yucateca de autor en un patio colonial de Valladolid: recados tradicionales, loza artesanal y ambiente bajo arcos de piedra.',
   'https://quehacerenvalladolid.com/oriente-maya/valladolid/restaurantes/cocina-del-frailes',
   '61cea08a-9436-45ec-9e1c-9f0eca42fd6d',
   'https://quehacerenvalladolid.com/api/public/studio-media/7d1d0002-1111-4111-8111-000000000002/cover.jpg',
   'Restaurant','Cocina del Frailes'),
  ('business','7d1d0003-1111-4111-8111-000000000003',
   'Ruta Cenotes y Selva · Experiencias guiadas en Valladolid',
   'Experiencias guiadas por cenotes, vestigios mayas y calles coloniales de Valladolid, con grupos pequeños y guías locales certificados.',
   'https://quehacerenvalladolid.com/oriente-maya/valladolid/experiencias/ruta-cenotes-y-selva',
   '8376763c-253b-428f-8122-6c30a12d32cb',
   'https://quehacerenvalladolid.com/api/public/studio-media/7d1d0003-1111-4111-8111-000000000003/cover.jpg',
   'TouristAttraction','Ruta Cenotes y Selva')
) AS s(kind,id,meta_title,meta_description,canonical,asset,image,jsonld_type,name)
ON CONFLICT (entity_kind, entity_id, locale) DO NOTHING;