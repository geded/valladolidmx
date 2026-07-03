
-- 1) Retirar los 5 destinos incorrectos del batch
DELETE FROM public.destinations
WHERE demo_seed_batch = 'demo_fund_2026_07_v1';

-- 2) Re-sembrar como POIs vinculados al destino Valladolid
INSERT INTO public.points_of_interest
  (destination_id, slug, name, description, latitude, longitude, status,
   is_demo_seed, demo_seed_batch, demo_source_url)
VALUES
(
  '11111111-aaaa-4aaa-8aaa-000000000001',
  'cenote-zaci',
  'Cenote Zací',
  'Zací es un cenote semiabierto ubicado a pocas cuadras del centro histórico de Valladolid. Su nombre en maya significa "gavilán blanco" y da origen al nombre prehispánico de la ciudad. Rodeado de un parque municipal con restaurante regional, ofrece un descenso por escaleras de piedra hasta un espejo de agua turquesa de más de 25 metros de profundidad, con estalactitas y raíces colgantes.',
  20.6892, -88.2010, 'published',
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Cenote_Zac%C3%AD'
),
(
  '11111111-aaaa-4aaa-8aaa-000000000001',
  'cenote-suytun',
  'Cenote Suytun',
  'Suytun es un cenote cerrado tipo caverna a 8 km de Valladolid sobre la carretera a Chichén Itzá. Su plataforma circular de piedra al centro del agua, iluminada por un haz de luz cenital al mediodía, lo ha convertido en uno de los cenotes más icónicos de la Península. Servicios completos: vestidores, regaderas y restaurante.',
  20.6547, -88.1436, 'published',
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Cenote_Suyt%C3%BAn'
),
(
  '11111111-aaaa-4aaa-8aaa-000000000001',
  'cenote-ik-kil',
  'Cenote Ik Kil',
  'Ik Kil es un cenote abierto de aproximadamente 60 metros de diámetro y 40 metros de profundidad, ubicado a 3 km de Chichén Itzá dentro del parque ecoarqueológico del mismo nombre. Las lianas y raíces que cuelgan desde el borde hasta el agua crean una postal inconfundible del cenoteo yucateco.',
  20.6333, -88.5667, 'published',
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Cenote_Ik_Kil'
),
(
  '11111111-aaaa-4aaa-8aaa-000000000001',
  'convento-san-bernardino',
  'Ex Convento de San Bernardino de Siena',
  'Construido entre 1552 y 1560 por los franciscanos, el ex convento de San Bernardino de Siena en el barrio de Sisal es uno de los conjuntos religiosos más antiguos de Yucatán. Su atrio abierto, la noria dentro del claustro alimentada por un cenote subterráneo y sus retablos originales lo distinguen. Cada noche recibe el espectáculo de video mapping sobre su fachada.',
  20.6845, -88.2078, 'published',
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Ex_convento_de_San_Bernardino_de_Siena'
),
(
  '11111111-aaaa-4aaa-8aaa-000000000001',
  'calzada-de-los-frailes',
  'Calzada de los Frailes',
  'La Calzada de los Frailes conecta el centro de Valladolid con el barrio de Sisal y el convento de San Bernardino. Empedrada, flanqueada por casas coloniales de colores intensos, boutiques de diseño yucateco, cafés y galerías, es el paseo peatonal por excelencia de la ciudad al atardecer.',
  20.6862, -88.2050, 'published',
  true, 'demo_fund_2026_07_v1', 'https://es.wikipedia.org/wiki/Valladolid_(Yucat%C3%A1n)'
);
