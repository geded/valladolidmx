-- 19.22.a · V1-P1 · Governed Asset Lineage & Checksum Reconciliation
-- Data-only, idempotent, allowlist-bound. No schema, no product, no flags.
DO $mig$
DECLARE
  master_rows CONSTANT jsonb := '[{"id": "453dd8fd-7d1e-419e-95ea-9afa365f363c", "path": "governed/v1p1c/destination-cover.jpg", "sha256": "5bb19d90a602874c49f354dd81a28c051602ae60d7f27c8af82f724fd04b3488", "bytes": 273714}, {"id": "48bdb6fd-91ec-40b4-8262-070cffdbdaf3", "path": "governed/v1p1c/destination-gallery-1.jpg", "sha256": "6246da339f87cced4b9c25e800f1cf6690e718512710d5fd364f38ea6b260b0d", "bytes": 352446}, {"id": "4c1ffec3-c57f-44e5-99f3-b8c9ffb0b93b", "path": "governed/v1p1c/destination-gallery-2.jpg", "sha256": "ef3d7604309c92bc9eb06a3b8dbdfef0ab65a886d828381118674cea1e94db5e", "bytes": 341866}, {"id": "0603dbfb-762d-496a-a3f2-507d5b892d00", "path": "governed/v1p1c/experience-cover.jpg", "sha256": "1f13bc0cde46f407d9a616d8c350d9719509830f86313488e3bf92453d9fd904", "bytes": 359336}, {"id": "054505b4-07c7-482e-be02-29a950fc3967", "path": "governed/v1p1c/experience-gallery-1.jpg", "sha256": "db797455033f4b387465ff4aa52ec2d772678a86308501e8cae03416f8d7da2c", "bytes": 317988}, {"id": "5d14e132-1e05-449e-9cbf-4962c4fc55b6", "path": "governed/v1p1c/experience-gallery-2.jpg", "sha256": "e04614d9ccceac79b9f8a22fc5c53595f762fff9ca525aef3a30b904043f5edb", "bytes": 294527}, {"id": "809b7e1b-22e6-4a15-af65-06bc46b9d8e5", "path": "governed/v1p1c/hotel-cover.jpg", "sha256": "816737965a3226fdec3696cd1a1ce9825effb67fb1e3228250e740b1094f42f8", "bytes": 347858}, {"id": "995e5a74-d10a-48ee-b968-315b754def41", "path": "governed/v1p1c/hotel-gallery-1.jpg", "sha256": "1d4a926f61a16b66d12b304806dbc62ba8f8f8b2b85c85e8226ede341489c390", "bytes": 202522}, {"id": "c43d33b6-f67a-486d-81ce-c979e509dfd0", "path": "governed/v1p1c/hotel-gallery-2.jpg", "sha256": "7327cd40abe8ec21e5b853bd8e567a57951ca39cba877d889da43ffd085bd72c", "bytes": 225152}, {"id": "0b4978d0-3a15-4f07-ac60-fe93b94c4071", "path": "governed/v1p1c/restaurant-cover.jpg", "sha256": "68b6f784a2b2f058748af298560c51ae7c3c7b4991899744456d50d8211a4937", "bytes": 246533}, {"id": "b9f33bef-54e6-49fe-9767-fb99748369b5", "path": "governed/v1p1c/restaurant-gallery-1.jpg", "sha256": "a9bdd76802ee1d14b0ffb032582a1ea2f9539ad42b56cbf46d1d4a0407b41b4c", "bytes": 309813}, {"id": "8702e5bd-8834-4ff5-beaa-e52ea84b2dbd", "path": "governed/v1p1c/restaurant-gallery-2.jpg", "sha256": "c27cecf2879b41d6cb97d418eba5c03fc6a6746bcc05670356d30bda392ea68f", "bytes": 360011}]'::jsonb;
  copy_rows CONSTANT jsonb := '[{"id": "b95017a9-72cb-4b19-aa4d-24d96b5feb50", "path": "7d1d0001-1111-4111-8111-000000000001/cover.jpg", "sha256": "816737965a3226fdec3696cd1a1ce9825effb67fb1e3228250e740b1094f42f8", "bytes": 347858, "master_id": "809b7e1b-22e6-4a15-af65-06bc46b9d8e5", "master_path": "governed/v1p1c/hotel-cover.jpg"}, {"id": "731b8e81-fd93-479d-9181-abcf618d6ab5", "path": "7d1d0001-1111-4111-8111-000000000001/gallery-1.jpg", "sha256": "1d4a926f61a16b66d12b304806dbc62ba8f8f8b2b85c85e8226ede341489c390", "bytes": 202522, "master_id": "995e5a74-d10a-48ee-b968-315b754def41", "master_path": "governed/v1p1c/hotel-gallery-1.jpg"}, {"id": "aa6aecdc-4f6e-4227-8c7d-761ba56a24f0", "path": "7d1d0001-1111-4111-8111-000000000001/gallery-2.jpg", "sha256": "7327cd40abe8ec21e5b853bd8e567a57951ca39cba877d889da43ffd085bd72c", "bytes": 225152, "master_id": "c43d33b6-f67a-486d-81ce-c979e509dfd0", "master_path": "governed/v1p1c/hotel-gallery-2.jpg"}, {"id": "61cea08a-9436-45ec-9e1c-9f0eca42fd6d", "path": "7d1d0002-1111-4111-8111-000000000002/cover.jpg", "sha256": "68b6f784a2b2f058748af298560c51ae7c3c7b4991899744456d50d8211a4937", "bytes": 246533, "master_id": "0b4978d0-3a15-4f07-ac60-fe93b94c4071", "master_path": "governed/v1p1c/restaurant-cover.jpg"}, {"id": "d0e73e69-e387-445a-a91a-73101ad5dd59", "path": "7d1d0002-1111-4111-8111-000000000002/gallery-1.jpg", "sha256": "a9bdd76802ee1d14b0ffb032582a1ea2f9539ad42b56cbf46d1d4a0407b41b4c", "bytes": 309813, "master_id": "b9f33bef-54e6-49fe-9767-fb99748369b5", "master_path": "governed/v1p1c/restaurant-gallery-1.jpg"}, {"id": "523fce33-316e-4d8e-8e1e-a3f9239decc6", "path": "7d1d0002-1111-4111-8111-000000000002/gallery-2.jpg", "sha256": "c27cecf2879b41d6cb97d418eba5c03fc6a6746bcc05670356d30bda392ea68f", "bytes": 360011, "master_id": "8702e5bd-8834-4ff5-beaa-e52ea84b2dbd", "master_path": "governed/v1p1c/restaurant-gallery-2.jpg"}, {"id": "8376763c-253b-428f-8122-6c30a12d32cb", "path": "7d1d0003-1111-4111-8111-000000000003/cover.jpg", "sha256": "1f13bc0cde46f407d9a616d8c350d9719509830f86313488e3bf92453d9fd904", "bytes": 359336, "master_id": "0603dbfb-762d-496a-a3f2-507d5b892d00", "master_path": "governed/v1p1c/experience-cover.jpg"}, {"id": "453830c0-3001-476b-a218-6a908e60b440", "path": "7d1d0003-1111-4111-8111-000000000003/gallery-1.jpg", "sha256": "db797455033f4b387465ff4aa52ec2d772678a86308501e8cae03416f8d7da2c", "bytes": 317988, "master_id": "054505b4-07c7-482e-be02-29a950fc3967", "master_path": "governed/v1p1c/experience-gallery-1.jpg"}, {"id": "4da29132-ea3e-458c-b365-b5ab063d7a0e", "path": "7d1d0003-1111-4111-8111-000000000003/gallery-2.jpg", "sha256": "e04614d9ccceac79b9f8a22fc5c53595f762fff9ca525aef3a30b904043f5edb", "bytes": 294527, "master_id": "5d14e132-1e05-449e-9cbf-4962c4fc55b6", "master_path": "governed/v1p1c/experience-gallery-2.jpg"}]'::jsonb;
  r jsonb;
  existing text;
  touched int := 0;
  expected int := 21;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(master_rows || copy_rows) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.media_assets
      WHERE id = (r->>'id')::uuid
        AND storage_bucket = 'studio-media'
        AND storage_path = r->>'path'
    ) THEN
      RAISE EXCEPTION 'FAIL-CLOSED: allowlisted asset % (%) not found at governed path', r->>'id', r->>'path';
    END IF;
    SELECT original_checksum INTO existing FROM public.media_assets WHERE id = (r->>'id')::uuid;
    IF existing IS NOT NULL AND existing <> r->>'sha256' THEN
      RAISE EXCEPTION 'FAIL-CLOSED: checksum discrepancy on % (stored=%, verified=%)', r->>'id', existing, r->>'sha256';
    END IF;
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements(master_rows) LOOP
    UPDATE public.media_assets
       SET original_checksum = r->>'sha256'
     WHERE id = (r->>'id')::uuid
       AND storage_path = r->>'path'
       AND original_checksum IS NULL;
    touched := touched + 1;
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements(copy_rows) LOOP
    UPDATE public.media_assets
       SET original_checksum = COALESCE(original_checksum, r->>'sha256'),
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'lineage', COALESCE(metadata->'lineage', '{}'::jsonb) || jsonb_build_object(
               'kind', 'governed_copy',
               'origin', 'v1p1c',
               'master_asset_id', r->>'master_id',
               'master_storage_bucket', 'studio-media',
               'master_storage_path', r->>'master_path',
               'sha256', r->>'sha256',
               'verified_by', '19.22.a',
               'verification_method', 'sha256 over stored object bytes'
             )
           )
     WHERE id = (r->>'id')::uuid
       AND storage_path = r->>'path';
    touched := touched + 1;
  END LOOP;

  IF touched <> expected THEN
    RAISE EXCEPTION 'FAIL-CLOSED: expected % allowlisted rows, processed %', expected, touched;
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(master_rows || copy_rows) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.media_assets
      WHERE id = (r->>'id')::uuid AND original_checksum = r->>'sha256'
    ) THEN
      RAISE EXCEPTION 'FAIL-CLOSED: postcondition failed for %', r->>'id';
    END IF;
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements(copy_rows) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.media_assets
      WHERE id = (r->>'id')::uuid
        AND metadata->'lineage'->>'master_asset_id' = r->>'master_id'
    ) THEN
      RAISE EXCEPTION 'FAIL-CLOSED: lineage postcondition failed for %', r->>'id';
    END IF;
  END LOOP;
END
$mig$;