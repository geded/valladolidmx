-- Checkpoint 5 · E48 · Ausencias verificadas (READ-ONLY)
-- Fecha UTC: 2026-07-22T04:00Z · América/Mérida: 2026-07-21 22:00
-- Método: supabase--read_query · Rol: service (columnas mínimas)
-- Redacción de PII aplicada; ninguna consulta selecciona PII de viajeros u órdenes.

-- Entidad
SELECT id, slug, display_name, status, verified, logo_media_id, cover_media_id, is_demo_seed
FROM businesses WHERE id='e4588636-bb44-4b13-8c08-f29b2026c76f';
-- Resultado: verified=false; logo_media_id=NULL; cover_media_id=NULL; is_demo_seed=true.

-- Medios propios
SELECT count(*) FROM business_media WHERE business_id='e4588636-bb44-4b13-8c08-f29b2026c76f';
-- Resultado: 0.

-- Cubiertas de productos vinculados
SELECT count(*) FROM product_media pm
JOIN products p ON p.id=pm.product_id
WHERE p.business_id='e4588636-bb44-4b13-8c08-f29b2026c76f';
-- Resultado: 0.

-- Reseñas
SELECT count(*) FROM reviews
WHERE subject_kind='business' AND subject_id='e4588636-bb44-4b13-8c08-f29b2026c76f';
-- Resultado: 0.

-- SEO metadata específica de entidad
SELECT count(*) FROM seo_metadata
WHERE entity_kind='business' AND entity_id='e4588636-bb44-4b13-8c08-f29b2026c76f';
-- Resultado: 0.

-- Contactos públicos, horarios, redes sociales, categorías secundarias
SELECT
  (SELECT count(*) FROM business_contacts       WHERE business_id='e4588636-bb44-4b13-8c08-f29b2026c76f' AND is_public=true) AS contacts_public,
  (SELECT count(*) FROM business_hours          WHERE business_id='e4588636-bb44-4b13-8c08-f29b2026c76f') AS hours,
  (SELECT count(*) FROM business_social_links   WHERE business_id='e4588636-bb44-4b13-8c08-f29b2026c76f') AS social_links,
  (SELECT count(*) FROM business_category_links WHERE business_id='e4588636-bb44-4b13-8c08-f29b2026c76f') AS category_links;
-- Resultado esperado: valores administrados en Sub-ola posterior. Ver 18.14 §5.