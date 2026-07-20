-- R4 reconciliation · classify the Zazil Tunich authority seed honestly.
--
-- The original SEO.A3.M1 migration created preview/editorial data as if it
-- were an operationally verified business. This additive correction is
-- intentionally guarded by the original seed marker so it cannot downgrade
-- a later, independently-created business that happens to reuse the slug.

DO $$
DECLARE
  _biz_id uuid;
BEGIN
  SELECT id
    INTO _biz_id
    FROM public.businesses
   WHERE slug = 'zazil-tunich'
     AND metadata->>'seo_a3_m1' = 'true'
   LIMIT 1;

  IF _biz_id IS NULL THEN
    RAISE NOTICE 'SEO.A3.M1 Zazil Tunich seed not found; no reconciliation required.';
    RETURN;
  END IF;

  UPDATE public.businesses
     SET verified = false,
         is_demo_seed = true,
         demo_seed_batch = 'seo_a3_zazil_tunich_v1',
         demo_source_url = 'https://zaziltunich.com/',
         verification_notes = 'Datos editoriales de demostración; propiedad y datos operativos pendientes de verificación humana.',
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'founder_review_required', true,
           'operational_data_verified', false,
           'reconciled_at', '2026-07-20'
         )
   WHERE id = _biz_id;

  -- Remove the exact placeholder exposed by the original seed. Real contact
  -- data must be provided and verified through the onboarding workflow.
  DELETE FROM public.business_contacts
   WHERE business_id = _biz_id
     AND contact_type = 'whatsapp'
     AND value = '+52 985 100 0000';

  -- The seven identical 09:00–17:00 rows were explicitly documented as
  -- pending verification. Remove only that exact placeholder schedule.
  DELETE FROM public.business_hours
   WHERE business_id = _biz_id
     AND opens_at = '09:00'::time
     AND closes_at = '17:00'::time
     AND is_closed = false;

  -- Preserve the editorial catalogue for preview, but classify the exact
  -- seeded products so they cannot be counted as real supply or traction.
  UPDATE public.products
     SET is_demo_seed = true,
         demo_seed_batch = 'seo_a3_zazil_tunich_v1',
         demo_source_url = 'https://zaziltunich.com/'
   WHERE business_id = _biz_id
     AND slug IN (
       'recorrido-cenote-museo',
       'nado-en-cenote',
       'cena-romantica-en-cenote',
       'ceremonia-maya'
     );
END $$;
