INSERT INTO public.products (business_id, product_type, slug, name, tagline, description, price_amount, price_currency, capacity, status, published_at, conversion_mode, primary_action_label, visibility_level, is_demo_seed, demo_seed_batch)
VALUES (
  '66666666-aaaa-4aaa-8aaa-000000000001',
  'hotel',
  'estancia-casa-colonial-sisal',
  'Estancia completa por noche',
  'Casa colonial completa para hasta 6 personas',
  'Renta de la casa completa por noche: 3 dormitorios, 2 baños, cocina equipada, patio y alberca. Tarifa orientativa; la confirmación se realiza directamente con el anfitrión.',
  2400,
  'MXN',
  6,
  'published',
  now(),
  'arma_tu_viaje',
  'Agregar a Mi Viaje',
  'standard',
  true,
  'demo-2026-09-12'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.reviews (subject_kind, subject_id, author_display_name, rating, title, body, language, status, published_at, verified_source, visit_type, business_response, business_response_at, helpful_count, metadata)
VALUES
  ('business', '66666666-aaaa-4aaa-8aaa-000000000001', 'Mariana G.', 5, 'Una casa preciosa a pasos del centro', 'La casa es exactamente como en las fotos. El patio y la alberca fueron lo mejor del viaje, y caminamos al centro en pocos minutos.', 'es', 'published', now() - interval '20 days', 'declared_visitor', 'family', 'Gracias Mariana, fue un gusto recibirlos en Valladolid.', now() - interval '19 days', 4, '{"demo_seed":true,"demo_seed_batch":"demo-2026-09-12"}'::jsonb),
  ('business', '66666666-aaaa-4aaa-8aaa-000000000001', 'Luis y Paola', 5, 'Ideal para viajar en pareja', 'Muy tranquila, limpia y con mucha luz. La cocina está bien equipada y el anfitrión respondió rápido a todas nuestras dudas.', 'es', 'published', now() - interval '9 days', 'declared_visitor', 'couple', NULL, NULL, 2, '{"demo_seed":true,"demo_seed_batch":"demo-2026-09-12"}'::jsonb),
  ('business', '66666666-aaaa-4aaa-8aaa-000000000001', 'Andrés R.', 4, 'Muy buena opción para grupos', 'Nos hospedamos cinco personas y hubo espacio de sobra. Sólo sugeriría más sombra en la terraza al mediodía.', 'es', 'published', now() - interval '3 days', 'declared_visitor', 'friends', NULL, NULL, 1, '{"demo_seed":true,"demo_seed_batch":"demo-2026-09-12"}'::jsonb);