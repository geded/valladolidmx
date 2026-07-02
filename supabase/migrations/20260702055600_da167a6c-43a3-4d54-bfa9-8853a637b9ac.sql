
CREATE TABLE public.destination_zone_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id uuid NOT NULL REFERENCES public.destination_zones(id) ON DELETE CASCADE,
  media_asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'gallery',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT destination_zone_media_role_check CHECK (role = ANY (ARRAY['gallery','hero']))
);

CREATE UNIQUE INDEX destination_zone_media_unique
  ON public.destination_zone_media (zone_id, media_asset_id, role);
CREATE UNIQUE INDEX destination_zone_media_one_hero
  ON public.destination_zone_media (zone_id) WHERE role = 'hero';
CREATE INDEX idx_destination_zone_media_zone_id
  ON public.destination_zone_media (zone_id);
CREATE INDEX idx_destination_zone_media_asset_id
  ON public.destination_zone_media (media_asset_id);

GRANT SELECT ON public.destination_zone_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destination_zone_media TO authenticated;
GRANT ALL ON public.destination_zone_media TO service_role;

ALTER TABLE public.destination_zone_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "destination_zone_media_editor_manage"
  ON public.destination_zone_media
  TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));

CREATE POLICY "destination_zone_media_public_read"
  ON public.destination_zone_media
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.destination_zones z
    WHERE z.id = destination_zone_media.zone_id
      AND z.status = 'published'::content_status
      AND z.deleted_at IS NULL
  ));
