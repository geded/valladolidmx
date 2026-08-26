-- 19.23 · V1-P1 · Destination Governed Assets Enablement (PCA-2026-025)
-- Idempotente · allowlist por UUID · fail-closed ante precondiciones.
DO $$
DECLARE
  v_destination uuid := '11111111-aaaa-4aaa-8aaa-000000000001';
  v_cover uuid := '453dd8fd-7d1e-419e-95ea-9afa365f363c';
  v_gallery_1 uuid := '48bdb6fd-91ec-40b4-8262-070cffdbdaf3';
  v_gallery_2 uuid := '4c1ffec3-c57f-44e5-99f3-b8c9ffb0b93b';
  v_status text;
  v_asset RECORD;
BEGIN
  -- Precondicion 1: el destino canonico existe y esta publicado.
  SELECT d.status::text INTO v_status FROM public.destinations d WHERE d.id = v_destination;
  IF v_status IS NULL THEN
    RAISE EXCEPTION '19.23 abort: canonical destination % not found', v_destination;
  END IF;
  IF v_status <> 'published' THEN
    RAISE EXCEPTION '19.23 abort: canonical destination status is % (expected published)', v_status;
  END IF;

  -- Precondicion 2: los tres assets maestros gobernados cumplen el estandar.
  FOR v_asset IN
    SELECT id, status::text AS status, pipeline_status::text AS pipeline_status,
           review_state::text AS review_state, alt_text, original_checksum,
           deleted_at, is_demo_seed, storage_bucket, kind::text AS kind
    FROM public.media_assets
    WHERE id IN (v_cover, v_gallery_1, v_gallery_2)
  LOOP
    IF v_asset.status <> 'published' OR v_asset.deleted_at IS NOT NULL OR v_asset.is_demo_seed
       OR v_asset.pipeline_status <> 'ready' OR v_asset.review_state <> 'approved'
       OR coalesce(btrim(v_asset.alt_text), '') = '' OR coalesce(btrim(v_asset.original_checksum), '') = ''
       OR v_asset.storage_bucket <> 'studio-media' OR v_asset.kind <> 'image' THEN
      RAISE EXCEPTION '19.23 abort: governed asset % does not meet the premium standard', v_asset.id;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.media_assets WHERE id IN (v_cover, v_gallery_1, v_gallery_2)) <> 3 THEN
    RAISE EXCEPTION '19.23 abort: expected exactly 3 governed master assets';
  END IF;

  -- 1) Reclasificacion autorizada del destino canonico (idempotente, allowlist por UUID).
  IF EXISTS (SELECT 1 FROM public.destinations WHERE id = v_destination AND is_demo_seed) THEN
    UPDATE public.destinations SET is_demo_seed = false WHERE id = v_destination;
    INSERT INTO public.content_audit_log (entity_kind, entity_id, action, notes, metadata)
    VALUES (
      'destination', v_destination, 'destination.reclassify',
      'Canonical Valladolid destination reclassified from historical demo seed to governed published destination for V1-P1 destination enablement.',
      jsonb_build_object('package', '19.23', 'authorization', 'PCA-2026-025', 'from_is_demo_seed', true, 'to_is_demo_seed', false)
    );
  END IF;

  -- 2) Ampliar el rol permitido para admitir enlaces gobernados de portada.
  ALTER TABLE public.destination_media DROP CONSTRAINT IF EXISTS destination_media_role_check;
  ALTER TABLE public.destination_media
    ADD CONSTRAINT destination_media_role_check CHECK (role IN ('gallery', 'hero', 'cover'));
  CREATE UNIQUE INDEX IF NOT EXISTS destination_media_one_cover_per_destination
    ON public.destination_media(destination_id) WHERE role = 'cover';
END $$;

-- 3) Enlaces idempotentes a los assets maestros gobernados (sin duplicar binarios).
INSERT INTO public.destination_media (destination_id, media_asset_id, role, sort_order)
SELECT v.destination_id, v.media_asset_id, v.role, v.sort_order
FROM (VALUES
  ('11111111-aaaa-4aaa-8aaa-000000000001'::uuid, '453dd8fd-7d1e-419e-95ea-9afa365f363c'::uuid, 'cover', 0),
  ('11111111-aaaa-4aaa-8aaa-000000000001'::uuid, '48bdb6fd-91ec-40b4-8262-070cffdbdaf3'::uuid, 'gallery', 1),
  ('11111111-aaaa-4aaa-8aaa-000000000001'::uuid, '4c1ffec3-c57f-44e5-99f3-b8c9ffb0b93b'::uuid, 'gallery', 2)
) AS v(destination_id, media_asset_id, role, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.destination_media dm
  WHERE dm.destination_id = v.destination_id
    AND dm.media_asset_id = v.media_asset_id
    AND dm.role = v.role
);

-- 4) Auditoria de vinculacion (idempotente, una fila por asset gobernado).
INSERT INTO public.content_audit_log (entity_kind, entity_id, action, notes, metadata)
SELECT 'destination', v.destination_id, 'media.link',
       'V1-P1 governed destination media linked: ' || ma.storage_bucket || '/' || ma.storage_path,
       jsonb_build_object('package', '19.23', 'authorization', 'PCA-2026-025',
                          'media_asset_id', v.media_asset_id, 'role', v.role,
                          'checksum', ma.original_checksum)
FROM (VALUES
  ('11111111-aaaa-4aaa-8aaa-000000000001'::uuid, '453dd8fd-7d1e-419e-95ea-9afa365f363c'::uuid, 'cover'),
  ('11111111-aaaa-4aaa-8aaa-000000000001'::uuid, '48bdb6fd-91ec-40b4-8262-070cffdbdaf3'::uuid, 'gallery'),
  ('11111111-aaaa-4aaa-8aaa-000000000001'::uuid, '4c1ffec3-c57f-44e5-99f3-b8c9ffb0b93b'::uuid, 'gallery')
) AS v(destination_id, media_asset_id, role)
JOIN public.media_assets ma ON ma.id = v.media_asset_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.content_audit_log cal
  WHERE cal.entity_kind = 'destination'
    AND cal.entity_id = v.destination_id
    AND cal.action = 'media.link'
    AND cal.metadata->>'media_asset_id' = v.media_asset_id::text
);