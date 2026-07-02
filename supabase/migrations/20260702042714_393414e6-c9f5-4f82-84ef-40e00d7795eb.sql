-- 1) Tabla destination_media (galería + hero) — mismo patrón que business_media.
CREATE TABLE public.destination_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'gallery',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (destination_id, media_asset_id, role),
  CONSTRAINT destination_media_role_check CHECK (role IN ('gallery','hero'))
);

CREATE INDEX idx_destination_media_destination_id ON public.destination_media(destination_id);
CREATE INDEX idx_destination_media_asset_id ON public.destination_media(media_asset_id);
CREATE UNIQUE INDEX destination_media_one_hero_per_destination
  ON public.destination_media(destination_id) WHERE role = 'hero';

-- 2) GRANTS (obligatorio para el Data API).
GRANT SELECT ON public.destination_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destination_media TO authenticated;
GRANT ALL ON public.destination_media TO service_role;

-- 3) RLS.
ALTER TABLE public.destination_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "destination_media_public_read"
  ON public.destination_media
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.destinations d
      WHERE d.id = destination_media.destination_id
        AND d.status = 'published'
        AND d.deleted_at IS NULL
    )
  );

CREATE POLICY "destination_media_editor_manage"
  ON public.destination_media
  FOR ALL
  TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));

-- 4) media_assets: permitir lectura pública y escritura de editores.
-- (media_assets ya tiene RLS y grants; agregamos policy si falta.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='media_assets'
      AND policyname='media_assets_editor_manage'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "media_assets_editor_manage"
        ON public.media_assets
        FOR ALL
        TO authenticated
        USING (public.is_editor_or_admin(auth.uid()))
        WITH CHECK (public.is_editor_or_admin(auth.uid()))
    $p$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='media_assets'
      AND policyname='media_assets_public_read'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "media_assets_public_read"
        ON public.media_assets
        FOR SELECT
        TO anon, authenticated
        USING (status = 'published' AND deleted_at IS NULL)
    $p$;
  END IF;
END $$;

-- 5) Storage: policies sobre el bucket 'destinations' (privado).
--    - SELECT público para que las URLs firmadas y públicas funcionen desde la web.
--    - INSERT/UPDATE/DELETE limitado a editores/admin.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='destinations_bucket_public_read'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "destinations_bucket_public_read"
        ON storage.objects FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'destinations')
    $p$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='destinations_bucket_editor_insert'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "destinations_bucket_editor_insert"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'destinations' AND public.is_editor_or_admin(auth.uid()))
    $p$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='destinations_bucket_editor_update'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "destinations_bucket_editor_update"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = 'destinations' AND public.is_editor_or_admin(auth.uid()))
        WITH CHECK (bucket_id = 'destinations' AND public.is_editor_or_admin(auth.uid()))
    $p$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='destinations_bucket_editor_delete'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "destinations_bucket_editor_delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'destinations' AND public.is_editor_or_admin(auth.uid()))
    $p$;
  END IF;
END $$;