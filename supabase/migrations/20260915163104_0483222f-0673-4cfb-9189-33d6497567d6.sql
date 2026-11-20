GRANT SELECT ON public.media_asset_variants TO anon;

CREATE POLICY "public_read_ready_variants_of_published_assets"
ON public.media_asset_variants
FOR SELECT
TO anon, authenticated
USING (
  status = 'ready'
  AND EXISTS (
    SELECT 1 FROM public.media_assets a
    WHERE a.id = media_asset_variants.asset_id
      AND a.status = 'published'
      AND a.deleted_at IS NULL
  )
);