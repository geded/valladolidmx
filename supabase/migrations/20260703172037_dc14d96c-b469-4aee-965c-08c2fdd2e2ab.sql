
INSERT INTO public.destinations
  (tourism_region_id, slug, name, tagline, description, hero_palette, highlights,
   latitude, longitude, status, published_at,
   is_demo_seed, demo_seed_batch, demo_source_url)
VALUES
(
  '00000003-0000-4000-8000-000000000001',
  'cenote-zaci',
  'Cenote Zací',
  'El cenote urbano en el corazón de Valladolid',
  'Zací es un cenote semiabierto ubicado a pocas cuadras del centro histórico de Valladolid. Su nombre en maya significa "gavilán blanco" y da origen al nombre prehispánico de la ciudad. Rodeado de un parque municipal con restaurante regional, ofrece un descenso por escaleras de piedra hasta un espejo de agua turquesa de más de 25 metros de profundidad, con estalactitas y raíces colgantes. Es la manera más accesible de vivir un cenote sin salir de la ciudad.',
  'cenote',
  ARRAY['Acceso a pie desde el centro','Restaurante de cocina yucateca','Ideal para nadar','Iluminación natural cenital'],
  20.6892, -88.2010,
  'published', now(),
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Cenote_Zac%C3%AD'
),
(
  '00000003-0000-4000-8000-000000000001',
  'cenote-suytun',
  'Cenote Suytun',
  'El rayo de luz más fotografiado de Yucatán',
  'Suytun es un cenote cerrado tipo caverna a 8 km de Valladolid sobre la carretera a Chichén Itzá. Su plataforma circular de piedra al centro del agua, iluminada por un haz de luz cenital al mediodía, lo ha convertido en uno de los cenotes más icónicos de la Península. El agua es cristalina, poco profunda en los bordes y apta para nadar con chaleco. Cuenta con vestidores, regaderas y restaurante.',
  'cenote',
  ARRAY['Rayo de luz cenital 12:00-13:30','Plataforma central fotogénica','Cenote cerrado tipo caverna','Servicios completos'],
  20.6547, -88.1436,
  'published', now(),
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Cenote_Suyt%C3%BAn'
),
(
  '00000003-0000-4000-8000-000000000001',
  'cenote-ik-kil',
  'Cenote Ik Kil',
  'El cenote sagrado junto a Chichén Itzá',
  'Ik Kil es un cenote abierto de aproximadamente 60 metros de diámetro y 40 metros de profundidad, ubicado a 3 km de Chichén Itzá dentro del parque ecoarqueológico del mismo nombre. Las lianas y raíces que cuelgan desde el borde hasta el agua crean una postal inconfundible del cenoteo yucateco. Es parada obligatoria en las visitas guiadas a Chichén Itzá y cuenta con restaurante buffet, cabañas y área de descanso.',
  'cenote',
  ARRAY['A 3 km de Chichén Itzá','Cenote abierto con lianas','Salto desde plataforma','Parque con restaurante y cabañas'],
  20.6333, -88.5667,
  'published', now(),
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Cenote_Ik_Kil'
),
(
  '00000003-0000-4000-8000-000000000001',
  'convento-san-bernardino',
  'Convento de San Bernardino de Siena',
  'El convento franciscano fundacional de Valladolid',
  'Construido entre 1552 y 1560 por los franciscanos, el ex convento de San Bernardino de Siena en el barrio de Sisal es uno de los conjuntos religiosos más antiguos de Yucatán. Su atrio abierto, la noria dentro del claustro alimentada por un cenote subterráneo y sus retablos originales lo distinguen. Cada noche recibe el espectáculo de video mapping "Noche de las Ánimas / Historia y Leyendas de Valladolid" sobre su fachada.',
  'territorio',
  ARRAY['Fundado en 1552','Video mapping nocturno','Cenote dentro del claustro','Barrio histórico de Sisal'],
  20.6845, -88.2078,
  'published', now(),
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Ex_convento_de_San_Bernardino_de_Siena'
),
(
  '00000003-0000-4000-8000-000000000001',
  'calzada-de-los-frailes',
  'Calzada de los Frailes',
  'La calle más colorida de Valladolid',
  'La Calzada de los Frailes conecta el centro de Valladolid con el barrio de Sisal y el convento de San Bernardino. Empedrada, flanqueada por casas coloniales de colores intensos, boutiques de diseño yucateco, cafés y galerías, es el paseo peatonal por excelencia de la ciudad al atardecer. Su recorrido de aproximadamente 500 metros condensa la propuesta creativa y gastronómica del Valladolid contemporáneo.',
  'atardecer',
  ARRAY['Paseo peatonal de 500 m','Boutiques de diseño yucateco','Cafés y galerías','Termina en San Bernardino'],
  20.6862, -88.2050,
  'published', now(),
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Valladolid_(Yucat%C3%A1n)'
);
