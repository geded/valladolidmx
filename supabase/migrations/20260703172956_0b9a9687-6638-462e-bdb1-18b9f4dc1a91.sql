
-- Policy: lectura pública del bucket demo-media (patrón consistente con otros buckets de contenido)
CREATE POLICY "demo_media_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'demo-media');

-- 6 media_assets (hero de cada destino)
WITH inserted AS (
  INSERT INTO public.media_assets
    (kind, storage_bucket, storage_path, alt_text, caption, credit,
     mime_type, width, height,
     is_demo_seed, demo_seed_batch, demo_source_url)
  VALUES
    ('image', 'demo-media', 'destinations/hero_valladolid.jpg',
     'Plaza principal colonial de Valladolid, Yucatán al atardecer',
     'Centro histórico de Valladolid', 'Imagen generada · demo',
     'image/jpeg', 1536, 1024,
     true, 'demo_fund_2026_07_v1_media', 'https://valladolid.mx'),
    ('image', 'demo-media', 'destinations/hero_izamal.jpg',
     'Convento de San Antonio de Padua en la ciudad amarilla de Izamal',
     'Izamal, la Ciudad Amarilla', 'Imagen generada · demo',
     'image/jpeg', 1536, 1024,
     true, 'demo_fund_2026_07_v1_media', 'https://valladolid.mx'),
    ('image', 'demo-media', 'destinations/hero_ek_balam.jpg',
     'Acrópolis maya de Ek Balam rodeada de selva',
     'Zona arqueológica de Ek Balam', 'Imagen generada · demo',
     'image/jpeg', 1536, 1024,
     true, 'demo_fund_2026_07_v1_media', 'https://valladolid.mx'),
    ('image', 'demo-media', 'destinations/hero_las_coloradas.jpg',
     'Piscinas rosadas de Las Coloradas con cielo turquesa',
     'Salineras rosadas de Las Coloradas', 'Imagen generada · demo',
     'image/jpeg', 1536, 1024,
     true, 'demo_fund_2026_07_v1_media', 'https://valladolid.mx'),
    ('image', 'demo-media', 'destinations/hero_rio_lagartos.jpg',
     'Colonia de flamencos rosados en la Ría Lagartos',
     'Flamencos rosados en Río Lagartos', 'Imagen generada · demo',
     'image/jpeg', 1536, 1024,
     true, 'demo_fund_2026_07_v1_media', 'https://valladolid.mx'),
    ('image', 'demo-media', 'destinations/hero_uayma.jpg',
     'Fachada barroca roja y blanca del ex convento de Uayma',
     'Iglesia de Uayma', 'Imagen generada · demo',
     'image/jpeg', 1536, 1024,
     true, 'demo_fund_2026_07_v1_media', 'https://valladolid.mx')
  RETURNING id, storage_path
)
UPDATE public.destinations d
SET hero_media_id = i.id
FROM inserted i
WHERE
  (d.slug = 'valladolid'    AND i.storage_path = 'destinations/hero_valladolid.jpg')
  OR (d.slug = 'izamal'        AND i.storage_path = 'destinations/hero_izamal.jpg')
  OR (d.slug = 'ek-balam'      AND i.storage_path = 'destinations/hero_ek_balam.jpg')
  OR (d.slug = 'las-coloradas' AND i.storage_path = 'destinations/hero_las_coloradas.jpg')
  OR (d.slug = 'rio-lagartos'  AND i.storage_path = 'destinations/hero_rio_lagartos.jpg')
  OR (d.slug = 'uayma'         AND i.storage_path = 'destinations/hero_uayma.jpg');
