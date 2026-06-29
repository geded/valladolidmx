-- 14.20.3.M — Wave 2 · Stage 3 · editorial_routes seed (idempotente)
INSERT INTO public.editorial_routes (slug, name, summary, duration_days, locale, status, palette, destination_ids, published_at)
SELECT
  v.slug,
  v.name,
  v.summary,
  v.duration_days,
  'es'::locale_code,
  'published'::content_status,
  v.palette::hero_palette,
  ARRAY(
    SELECT d.id
    FROM public.destinations d
    WHERE d.slug::text = ANY(v.destination_slugs)
    ORDER BY array_position(v.destination_slugs, d.slug::text)
  )::uuid[],
  now()
FROM (VALUES
  ('valladolid-ek-balam', 'Cenotes y jaguares',
   'Tres días entre Valladolid y Ek Balam: cenotes ocultos, mercado local y la acrópolis al amanecer.',
   3, 'selva', ARRAY['valladolid','ek-balam']::text[]),
  ('costa-rosada', 'Costa rosada',
   'Río Lagartos y Las Coloradas: flamencos, salineras rosadas y atardeceres frente al Golfo.',
   2, 'atardecer', ARRAY['rio-lagartos','las-coloradas']::text[]),
  ('pueblos-coloniales', 'Pueblos coloniales',
   'Valladolid, Uayma e Izamal: arquitectura, conventos y talleres artesanos.',
   4, 'territorio', ARRAY['valladolid','uayma','izamal']::text[])
) AS v(slug, name, summary, duration_days, palette, destination_slugs)
ON CONFLICT (slug) DO NOTHING;