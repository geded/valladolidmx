-- 19.24 · V1-P1 · Stable Public Asset Contract Enforcement (PCA-2026-026)
-- Desvincula el asset legacy 57a401dc del destino canonico Valladolid.
-- Idempotente · allowlist por UUID · no elimina media_assets ni binarios.
DO $$
DECLARE
  v_destination uuid := '11111111-aaaa-4aaa-8aaa-000000000001';
  v_legacy uuid := '57a401dc-68d3-456f-87ba-f5196070376b';
  v_removed int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.destinations WHERE id = v_destination) THEN
    RAISE EXCEPTION '19.24 abort: canonical destination % not found', v_destination;
  END IF;

  DELETE FROM public.destination_media
  WHERE destination_id = v_destination AND media_asset_id = v_legacy;
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  IF v_removed > 0 THEN
    INSERT INTO public.content_audit_log (entity_kind, entity_id, action, notes, metadata)
    VALUES (
      'destination', v_destination, 'media.unlink',
      'Legacy non-governed media asset unlinked from canonical Valladolid destination to enforce the Founder Stable Public Asset Contract (no signed URLs in indexable metadata).',
      jsonb_build_object('package', '19.24', 'authorization', 'PCA-2026-026',
                         'media_asset_id', v_legacy, 'rows_removed', v_removed)
    );
  END IF;
END $$;