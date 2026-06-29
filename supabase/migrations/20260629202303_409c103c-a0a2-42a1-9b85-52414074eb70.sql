-- 14.20.1 — Wave 2 · Stage 1 · Categorías home-featured seed (idempotente)
INSERT INTO public.business_categories (slug, name, description, icon, sort_order, status, metadata)
VALUES
  ('experiencias',  'Experiencias', 'Vivencias auténticas con comunidades, cocineros y guías locales.', 'Sparkles',         10, 'published', jsonb_build_object('home_featured', true, 'palette', 'primary',   'source', 'mock_seed_v1')),
  ('hoteles',       'Hoteles',      'Desde haciendas restauradas hasta posadas familiares.',             'BedDouble',        20, 'published', jsonb_build_object('home_featured', true, 'palette', 'primary',   'source', 'mock_seed_v1')),
  ('restaurantes',  'Restaurantes', 'Cocina yucateca, panuchos, recados y mesa de autor.',               'UtensilsCrossed',  30, 'published', jsonb_build_object('home_featured', true, 'palette', 'atardecer', 'source', 'mock_seed_v1')),
  ('cenotes',       'Cenotes',      'Aguas turquesa bajo la selva.',                                     'Droplets',         40, 'published', jsonb_build_object('home_featured', true, 'palette', 'cenote',    'source', 'mock_seed_v1')),
  ('tours',         'Tours',        'Recorridos con expertos del territorio.',                           'Map',              50, 'published', jsonb_build_object('home_featured', true, 'palette', 'primary',   'source', 'mock_seed_v1')),
  ('eventos-home',  'Eventos',      'Fiestas, festivales y celebraciones del calendario maya.',          'PartyPopper',      60, 'published', jsonb_build_object('home_featured', true, 'palette', 'atardecer', 'source', 'mock_seed_v1')),
  ('naturaleza',    'Naturaleza',   'Manglares, reservas y vida silvestre.',                             'TreePine',         70, 'published', jsonb_build_object('home_featured', true, 'palette', 'selva',     'source', 'mock_seed_v1')),
  ('cultura',       'Cultura',      'Lengua maya viva, artesanía y memoria histórica.',                  'Landmark',         80, 'published', jsonb_build_object('home_featured', true, 'palette', 'primary',   'source', 'mock_seed_v1'))
ON CONFLICT (slug) DO NOTHING;